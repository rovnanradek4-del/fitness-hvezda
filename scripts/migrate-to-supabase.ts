import { readdir, readFile } from 'fs/promises'
import path from 'path'
import os from 'os'
import { createClient } from '@supabase/supabase-js'

// Read .env.local manually — no dotenv dependency required
async function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  const raw = await readFile(envPath, 'utf-8').catch(() => '')
  const env: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function main() {
  const env = await loadEnv()

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

  const obsidianBase =
    env.OBSIDIAN_BASE ||
    path.join(
      os.homedir(),
      'Library/Mobile Documents/iCloud~md~obsidian/Documents/Fitness Hvězda - Klienti/Klienti'
    )

  console.log(`Reading from: ${obsidianBase}`)

  let entries
  try {
    entries = await readdir(obsidianBase, { withFileTypes: true })
  } catch (e) {
    console.error(`Cannot read Obsidian folder: ${obsidianBase}`)
    console.error(e)
    process.exit(1)
  }

  const folders = entries.filter((e) => e.isDirectory())
  console.log(`Found ${folders.length} client folder(s)`)

  for (const folder of folders) {
    const name = folder.name
    const slug = slugify(name)
    const clientDir = path.join(obsidianBase, name)

    // Read profile
    const profilePath = path.join(clientDir, `${name} - Profil.md`)
    const profile = await readFile(profilePath, 'utf-8').catch(() => '')

    // Upsert client
    const { data: clientRow, error: clientError } = await supabase
      .from('clients')
      .upsert({ name, slug, profile_markdown: profile }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (clientError || !clientRow) {
      console.error(`Failed to upsert client ${name}:`, clientError?.message)
      continue
    }

    console.log(`  ✓ Client: ${name} (${slug})`)

    // Read training files
    const files = await readdir(clientDir).catch(() => [] as string[])
    const trainingFiles = files.filter((f) => f.match(/^\d{4}-\d{2}-\d{2} - Trénink\.md$/))

    let count = 0
    for (const file of trainingFiles) {
      const date = file.replace(' - Trénink.md', '')
      const content = await readFile(path.join(clientDir, file), 'utf-8').catch(() => '')
      const { error } = await supabase.from('training_sessions').upsert(
        { client_id: clientRow.id, date, content_markdown: content },
        { onConflict: 'client_id,date' }
      )
      if (error) {
        console.error(`    ✗ ${date}: ${error.message}`)
      } else {
        count++
      }
    }

    console.log(`    → ${count}/${trainingFiles.length} training sessions migrated`)
  }

  console.log('\nMigration complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

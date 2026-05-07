import { supabase } from './supabase'
import { parseTraining } from './markdown'

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function getClientId(slug: string): Promise<string | null> {
  const { data } = await supabase.from('clients').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function getClients() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, slug')
    .order('name')

  if (error || !clients) return []

  const counts = await Promise.all(
    clients.map(async (c) => {
      const { count } = await supabase
        .from('training_sessions')
        .select('date', { count: 'exact', head: false })
        .eq('client_id', c.id)
        .order('date', { ascending: false })
      const { data: lastRow } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('client_id', c.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()
      return { trainingCount: count ?? 0, lastTraining: lastRow?.date ?? undefined }
    })
  )

  return clients.map((c, i) => ({
    name: c.name,
    slug: c.slug,
    folder: c.slug,
    trainingCount: counts[i].trainingCount,
    lastTraining: counts[i].lastTraining,
  }))
}

export async function getClientBySlug(slug: string) {
  const { data } = await supabase.from('clients').select('id, name, slug').eq('slug', slug).single()
  if (!data) return null
  return { name: data.name, slug: data.slug, folder: data.slug }
}

export async function getClientProfile(folder: string): Promise<string> {
  const { data } = await supabase
    .from('clients')
    .select('profile_markdown')
    .eq('slug', folder)
    .single()
  return data?.profile_markdown ?? ''
}

export async function getClientTrainingDates(folder: string): Promise<string[]> {
  const clientId = await getClientId(folder)
  if (!clientId) return []
  const { data } = await supabase
    .from('training_sessions')
    .select('date')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  return (data ?? []).map((r) => r.date)
}

export async function getTrainingMarkdown(folder: string, date: string): Promise<string | null> {
  const clientId = await getClientId(folder)
  if (!clientId) return null
  const { data } = await supabase
    .from('training_sessions')
    .select('content_markdown')
    .eq('client_id', clientId)
    .eq('date', date)
    .single()
  return data?.content_markdown ?? null
}

export async function saveTrainingMarkdown(
  folder: string,
  date: string,
  content: string
): Promise<void> {
  const clientId = await getClientId(folder)
  if (!clientId) throw new Error(`Client not found: ${folder}`)
  const { error } = await supabase.from('training_sessions').upsert(
    { client_id: clientId, date, content_markdown: content },
    { onConflict: 'client_id,date' }
  )
  if (error) throw new Error(error.message)
}

export async function getAllTrainingDates(): Promise<Set<string>> {
  const { data } = await supabase.from('training_sessions').select('date')
  const set = new Set<string>()
  for (const r of data ?? []) set.add(r.date)
  return set
}

export async function getAllTrainingInfo(): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('training_sessions')
    .select('date, clients(slug)')
  const map = new Map<string, string>()
  for (const r of data ?? []) {
    const clients = r.clients
    const slug = clients && !Array.isArray(clients) ? (clients as { slug: string }).slug : undefined
    if (slug) map.set(r.date, slug)
  }
  return map
}

export async function getRecentExerciseHistory(
  folder: string,
  beforeDate: string,
  count = 5
): Promise<Map<string, { sets: string; reps: string; weight: string }>> {
  const clientId = await getClientId(folder)
  if (!clientId) return new Map()

  const { data } = await supabase
    .from('training_sessions')
    .select('date, content_markdown')
    .eq('client_id', clientId)
    .lt('date', beforeDate)
    .order('date', { ascending: false })
    .limit(count)

  const map = new Map<string, { sets: string; reps: string; weight: string }>()
  for (const row of data ?? []) {
    const training = parseTraining(row.content_markdown, row.date)
    for (const section of training.sections) {
      for (const ex of section.exercises) {
        const key = ex.name.trim().toLowerCase()
        if (key && !map.has(key) && (ex.sets || ex.reps || ex.weight)) {
          map.set(key, { sets: ex.sets, reps: ex.reps, weight: ex.weight })
        }
      }
    }
  }
  return map
}

export async function getRecentTrainings(folder: string, count = 3): Promise<string[]> {
  const clientId = await getClientId(folder)
  if (!clientId) return []
  const { data } = await supabase
    .from('training_sessions')
    .select('date, content_markdown')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(count)
  return (data ?? []).map((r) => `## Trénink ${r.date}\n\n${r.content_markdown}`)
}

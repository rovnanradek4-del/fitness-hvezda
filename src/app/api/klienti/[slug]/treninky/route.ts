import { getClientBySlug, getClientTrainingDates, saveTrainingMarkdown } from '@/lib/obsidian'
import { generateTrainingMarkdown } from '@/lib/markdown'
import type { Training } from '@/lib/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  const dates = await getClientTrainingDates(client.folder)
  return Response.json(dates)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  const { training }: { training: Training } = await request.json()
  const markdown = generateTrainingMarkdown(training)
  await saveTrainingMarkdown(client.folder, training.date, markdown)

  return Response.json({ ok: true, date: training.date })
}

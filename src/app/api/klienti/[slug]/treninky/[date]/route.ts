import { getClientBySlug, getTrainingMarkdown } from '@/lib/obsidian'
import { parseTraining } from '@/lib/markdown'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; date: string }> }
) {
  const { slug, date } = await params
  const client = await getClientBySlug(slug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  const markdown = await getTrainingMarkdown(client.folder, date)
  if (!markdown) return Response.json({ error: 'Trénink nenalezen' }, { status: 404 })

  const training = parseTraining(markdown, date)
  return Response.json({ training, markdown })
}

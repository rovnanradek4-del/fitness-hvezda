import { getClientBySlug, getClientProfile } from '@/lib/obsidian'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  const profileContent = await getClientProfile(client.folder)
  return Response.json({ ...client, profileContent })
}

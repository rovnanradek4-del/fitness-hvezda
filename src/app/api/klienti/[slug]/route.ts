import { getClientBySlug, getClientProfile, updateClientProfile, deleteClient } from '@/lib/obsidian'

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  try {
    const { profileMarkdown } = await request.json()
    if (typeof profileMarkdown !== 'string') {
      return Response.json({ error: 'Chybí profileMarkdown' }, { status: 400 })
    }
    await updateClientProfile(slug, profileMarkdown)
    return Response.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const client = await getClientBySlug(slug)
  if (!client) return Response.json({ error: 'Klient nenalezen' }, { status: 404 })

  try {
    await deleteClient(slug)
    return Response.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ error: message }, { status: 500 })
  }
}

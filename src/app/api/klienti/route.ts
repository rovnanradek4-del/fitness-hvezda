import { getClients, createClientRecord } from '@/lib/obsidian'

export async function GET() {
  try {
    const clients = await getClients()
    return Response.json(clients)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    if (!name?.trim()) {
      return Response.json({ error: 'Jméno klienta je povinné' }, { status: 400 })
    }
    const { slug } = await createClientRecord(name.trim())
    return Response.json({ ok: true, slug }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return Response.json({ error: message }, { status: 400 })
  }
}

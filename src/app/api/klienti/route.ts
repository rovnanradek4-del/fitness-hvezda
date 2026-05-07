import { getClients } from '@/lib/obsidian'

export async function GET() {
  try {
    const clients = await getClients()
    return Response.json(clients)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

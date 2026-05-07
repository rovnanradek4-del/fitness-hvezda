import { exchangeCodeForTokens } from '@/lib/calendar'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return Response.json({ error: 'Chybí kód' }, { status: 400 })
  }

  try {
    await exchangeCodeForTokens(code)
  } catch {
    return Response.json({ error: 'Nepodařilo se propojit Google Calendar' }, { status: 500 })
  }

  redirect('/dashboard?calendar=connected')
}

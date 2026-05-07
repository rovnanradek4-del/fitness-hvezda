import { cookies } from 'next/headers'
import { verifyPassword, getSessionToken, COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (!verifyPassword(password)) {
    return Response.json({ error: 'Nesprávné heslo' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, getSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  return Response.json({ ok: true })
}

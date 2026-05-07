import { getGoogleAuthUrl } from '@/lib/calendar'
import { redirect } from 'next/navigation'

export async function GET() {
  const url = getGoogleAuthUrl()
  redirect(url)
}

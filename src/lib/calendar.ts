import { google } from 'googleapis'
import { supabase } from './supabase'
import type { CalendarEvent } from './types'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  )
}

async function loadTokens() {
  const { data } = await supabase.from('google_tokens').select('*').eq('id', 1).single()
  return data ?? null
}

async function saveTokens(tokens: {
  access_token?: string | null
  refresh_token?: string | null
  expiry_date?: number | null
}) {
  await supabase.from('google_tokens').upsert(
    {
      id: 1,
      access_token: tokens.access_token ?? null,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
}

export function getGoogleAuthUrl(): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  await saveTokens(tokens)
  return tokens
}

async function getCalendarClient() {
  const oauth2Client = createOAuth2Client()
  const tokens = await loadTokens()
  if (!tokens) return null
  oauth2Client.setCredentials(tokens)
  oauth2Client.on('tokens', async (newTokens) => {
    const current = await loadTokens()
    await saveTokens({ ...current, ...newTokens })
  })
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

const TARGET_CALENDAR_NAME = 'Fitness Hvězda - Klienti'

async function findCalendarId(calendar: Awaited<ReturnType<typeof getCalendarClient>>): Promise<string> {
  if (!calendar) return 'primary'
  try {
    const list = await calendar.calendarList.list()
    const match = (list.data.items || []).find((c) => c.summary === TARGET_CALENDAR_NAME)
    return match?.id || 'primary'
  } catch {
    return 'primary'
  }
}

export async function getUpcomingEvents(days = 14): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient()
  if (!calendar) return []

  const calendarId = await findCalendarId(calendar)
  const now = new Date()
  const future = new Date(now)
  future.setDate(future.getDate() + days)

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 30,
    })
    return (res.data.items || []).map((e) => ({
      id: e.id || '',
      title: e.summary || '(bez názvu)',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      description: e.description || '',
      location: e.location || '',
    }))
  } catch {
    return []
  }
}

const PRAGUE_TZ = 'Europe/Prague'

function isoToTime(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: PRAGUE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export async function getTrainingTimeForDate(date: string): Promise<{ startTime: string; endTime: string }> {
  const calendar = await getCalendarClient()
  if (!calendar) return { startTime: '', endTime: '' }

  const calendarId = await findCalendarId(calendar)
  // Query with a 3-hour buffer on each side so DST shifts (UTC+1/+2) never drop events
  const dayStart = new Date(date + 'T00:00:00Z')
  dayStart.setUTCHours(dayStart.getUTCHours() - 3)
  const dayEnd = new Date(date + 'T23:59:59Z')
  dayEnd.setUTCHours(dayEnd.getUTCHours() + 3)

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: true,
      maxResults: 5,
    })
    const event = (res.data.items || [])[0]
    if (!event) return { startTime: '', endTime: '' }

    return {
      startTime: isoToTime(event.start?.dateTime),
      endTime: isoToTime(event.end?.dateTime),
    }
  } catch {
    return { startTime: '', endTime: '' }
  }
}

export async function isCalendarConnected(): Promise<boolean> {
  const tokens = await loadTokens()
  return tokens !== null && Boolean(tokens.access_token)
}

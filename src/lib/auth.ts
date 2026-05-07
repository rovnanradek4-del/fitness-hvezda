export const COOKIE_NAME = 'fh-session'
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

export function getSessionToken(): string {
  return process.env.APP_SECRET || 'change-me-in-env-local'
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD || 'fitness2024'
  return input === expected
}

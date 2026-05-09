const AUTH_SESSION_KEY = 'ship-auth-session-v1'

type AuthSession = {
  username: string
  loggedInAt: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function readAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed)) return null
    if (typeof parsed.username !== 'string') return null
    if (typeof parsed.loggedInAt !== 'string') return null
    return { username: parsed.username, loggedInAt: parsed.loggedInAt }
  } catch {
    return null
  }
}

export function writeAuthSession(username: string): void {
  const session: AuthSession = {
    username,
    loggedInAt: new Date().toISOString(),
  }
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(AUTH_SESSION_KEY)
}

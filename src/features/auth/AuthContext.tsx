import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from '../../lib/api'
import { clearAuthSession, readAuthSession, writeAuthSession } from './session'

type LoginResult = { ok: true } | { ok: false; message: string }

type AuthContextValue = {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const existingSession = readAuthSession()
  const [username, setUsername] = useState<string | null>(existingSession?.username ?? null)

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(username),
      username,
      login: async (rawUsername: string, password: string): Promise<LoginResult> => {
        const normalized = rawUsername.trim()
        const normalizedPassword = password.trim()

        if (!normalized || !normalizedPassword) {
          return { ok: false, message: 'Enter username and password.' }
        }

        try {
          const response = await api.post<{ access_token: string }>('/auth/login', {
            username: normalized,
            password: normalizedPassword,
          })
          const token = response.data.access_token
          writeAuthSession(normalized, token)
          setUsername(normalized)
          return { ok: true }
        } catch {
          return { ok: false, message: 'Invalid username or password.' }
        }
      },
      logout: () => {
        clearAuthSession()
        setUsername(null)
      },
    }),
    [username],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook is intentionally exported alongside Provider for this module. */
// eslint-disable-next-line react-refresh/only-export-components -- useAuth is the public API for AuthProvider
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

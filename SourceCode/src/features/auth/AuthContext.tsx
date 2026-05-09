import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { clearAuthSession, readAuthSession, writeAuthSession } from './session'

type AuthContextValue = {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => { ok: true } | { ok: false; message: string }
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
      login: (rawUsername: string, password: string) => {
        const normalized = rawUsername.trim()
        const normalizedPassword = password.trim()

        if (!normalized || !normalizedPassword) {
          return { ok: false, message: 'Enter username and password.' }
        }

        if (normalized !== 'admin' || normalizedPassword !== 'admin') {
          return { ok: false, message: 'Invalid credentials. Use admin / admin.' }
        }

        writeAuthSession('admin')
        setUsername('admin')
        return { ok: true }
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

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

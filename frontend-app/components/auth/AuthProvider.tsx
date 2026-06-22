'use client'

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/lib/auth-types"
import { fetchMe, clearToken, getAuthHeaders, setToken, isAuthenticated } from "@/lib/auth-service"

type AuthContextValue = {
  user: User | null
  loading: boolean
  loginWithToken: (token: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const u = await fetchMe()
      setUser(u)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loginWithToken = useCallback(async (token: string) => {
    setToken(token)
    const u = await fetchMe()
    setUser(u)
    router.push("/dashboard")
  }, [router])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, loginWithToken, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

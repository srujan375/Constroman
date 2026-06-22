'use client'

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./AuthProvider"

const publicPaths = ["/login"]

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    const isPublic = publicPaths.includes(pathname)
    if (!user && !isPublic) {
      router.replace("/login")
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!user && !publicPaths.includes(pathname)) {
    return null
  }

  return <>{children}</>
}

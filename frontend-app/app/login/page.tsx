'use client'

import { useState, FormEvent } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { login } from "@/lib/auth-service"
import { NotebookPen } from "lucide-react"

export default function LoginPage() {
  const { loginWithToken } = useAuth()
  const [orgSlug, setOrgSlug] = useState("constroman")
  const [orgPassword, setOrgPassword] = useState("org123")
  const [email, setEmail] = useState("admin@constroman.com")
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await login({ organization_slug: orgSlug, org_password: orgPassword, email, password })
      await loginWithToken(res.access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  function useDemo(kind: "admin" | "employee") {
    setOrgSlug("constroman")
    setOrgPassword("org123")
    if (kind === "admin") {
      setEmail("admin@constroman.com")
      setPassword("admin123")
    } else {
      setEmail("employee@constroman.com")
      setPassword("emp123")
    }
  }

  const inputCls =
    "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center">
            <NotebookPen className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold">SiteLedger</p>
            <p className="text-teal-300 text-xs">Daily Site Records</p>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Every register.<br />One place. One day at a time.
          </h2>
          <p className="text-slate-300 mt-4 max-w-md">
            Record weather, labour, materials, quality and safety data each day — store it,
            search it by date, and export any sheet to PDF.
          </p>
        </div>
        <p className="text-slate-400 text-xs">Constroman Constructions Pvt Ltd</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6 justify-center">
            <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center">
              <NotebookPen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">SiteLedger</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-800">Sign in</h1>
          <p className="text-sm text-slate-500 mb-6">Access your organization’s daily site records.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
              <input type="text" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} required placeholder="org-slug" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organization Password</label>
              <input type="password" value={orgPassword} onChange={(e) => setOrgPassword(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-teal-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400 mb-2">Demo accounts</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => useDemo("admin")} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white">
                Admin
              </button>
              <button onClick={() => useDemo("employee")} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white">
                Employee
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

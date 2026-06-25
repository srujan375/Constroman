'use client'

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { NotebookPen, ChevronDown, LogOut, ChevronRight } from "lucide-react"
import Icon from "@/components/Icon"
import { useAuth } from "@/components/auth/AuthProvider"
import { fetchProjects } from "@/lib/api"
import { sheetsByGroup } from "@/lib/sheets"
import type { Project } from "@/lib/types"

const PROJECT_KEY = "selectedProjectId"

export default function LandingPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState("")
  const [openCategory, setOpenCategory] = useState<string | null>("daily")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const grouped = sheetsByGroup()

  useEffect(() => {
    fetchProjects().then((data) => {
      setProjects(data)
      const stored = typeof window !== "undefined" ? localStorage.getItem(PROJECT_KEY) : null
      const valid = stored && data.some((p) => p.id === stored) ? stored : data[0]?.id ?? ""
      setProjectId(valid)
    })
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function chooseProject(id: string) {
    setProjectId(id)
    localStorage.setItem(PROJECT_KEY, id)
  }

  function openForm(slug: string) {
    if (!projectId) return
    router.push(`/projects/${projectId}/sheets/${slug}`)
  }

  const project = projects.find((p) => p.id === projectId)
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center">
              <NotebookPen className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-slate-800">SiteLedger</p>
              <p className="text-[11px] text-slate-400">Daily Site Records</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={projectId}
              onChange={(e) => chooseProject(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100">
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
                      {user?.role}
                    </span>
                  </div>
                  <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Daily Site Registers</h1>
          <p className="text-sm text-slate-500 mt-1">
            {project ? <span className="font-medium text-slate-600">{project.name}</span> : "Select a project"} · {today}
          </p>
          <p className="text-sm text-slate-400 mt-2">Choose a category, then pick a form to open.</p>
        </div>

        {/* Numbered category buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {grouped.map(({ group, sheets }) => {
            const active = openCategory === group.key
            return (
              <button
                key={group.key}
                onClick={() => setOpenCategory(active ? null : group.key)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  active
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {group.number}
                  </span>
                  <Icon name={group.icon} className={`w-5 h-5 ${active ? "text-teal-600" : "text-slate-400"}`} />
                </div>
                <p className="font-semibold text-slate-800 text-sm leading-tight">{group.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sheets.length} {sheets.length === 1 ? "form" : "forms"}</p>
              </button>
            )
          })}
        </div>

        {/* Forms dropdown panel for the selected category */}
        {openCategory && (() => {
          const entry = grouped.find((g) => g.group.key === openCategory)
          if (!entry) return null
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
                <Icon name={entry.group.icon} className="w-4 h-4 text-teal-600" />
                <h2 className="font-semibold text-slate-700 text-sm">
                  {entry.group.number} · {entry.group.label}
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {entry.sheets.map((sheet) => (
                  <li key={sheet.slug}>
                    <button
                      onClick={() => openForm(sheet.slug)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-teal-50/50 transition-colors text-left group"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 w-12">{sheet.code}</span>
                        <Icon name={sheet.icon} className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-medium text-slate-700">{sheet.name}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })()}
      </main>
    </div>
  )
}

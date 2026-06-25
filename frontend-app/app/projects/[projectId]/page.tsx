'use client'

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, Calendar, ChevronRight, ArrowLeft } from "lucide-react"
import Header from "@/components/layout/Header"
import Icon from "@/components/Icon"
import { fetchProjects } from "@/lib/api"
import { sheetsByGroup } from "@/lib/sheets"
import type { Project } from "@/lib/types"

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const grouped = sheetsByGroup()

  useEffect(() => {
    fetchProjects().then((data) => {
      setProject(data.find((p) => p.id === projectId) || null)
      setLoading(false)
    })
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Project not found.</p>
          <Link href="/" className="text-teal-600 text-sm mt-2 block">Back to All Forms</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50">
      <Header title={project.name} subtitle={project.location} />

      <div className="p-6 space-y-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Back to All Forms
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <MapPin className="w-4 h-4" /> <span>{project.location || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Started {project.startDate ? new Date(project.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}</span>
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
              project.status === "active" ? "bg-green-100 text-green-700"
              : project.status === "completed" ? "bg-teal-100 text-teal-700"
              : "bg-amber-100 text-amber-700"}`}>
              {project.status}
            </span>
          </div>
        </div>

        {grouped.map(({ group, sheets }) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-3">
              <Icon name={group.icon} className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{group.label}</h3>
              <span className="text-xs text-slate-400">({sheets.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sheets.map((sheet) => (
                <Link
                  key={sheet.slug}
                  href={`/projects/${projectId}/sheets/${sheet.slug}`}
                  className="group bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                      <Icon name={sheet.icon} className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{sheet.code}</p>
                      <h4 className="font-semibold text-slate-800 text-sm leading-tight">{sheet.name}</h4>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

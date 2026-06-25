'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import Header from "@/components/layout/Header"
import SheetTable from "@/components/forms/SheetTable"
import SiteReportDocument from "@/components/forms/SiteReportDocument"
import { getSheet } from "@/lib/sheets"
import { fetchProjectBySlug } from "@/lib/api"

export default function SheetPage() {
  const params = useParams<{ projectId: string; sheetSlug: string }>()
  const projectSlug = params.projectId
  const sheet = getSheet(params.sheetSlug)
  const [projectName, setProjectName] = useState(projectSlug)

  useEffect(() => {
    fetchProjectBySlug(projectSlug).then((p) => {
      if (p) setProjectName(p.name)
    })
  }, [projectSlug])

  if (!sheet) {
    return (
      <div className="min-h-full bg-slate-50">
        <Header title="Unknown form" subtitle={projectSlug} />
        <div className="p-6">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4" />
            No form matches “{params.sheetSlug}”.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50">
      <Header title={sheet.title} subtitle={`${sheet.code} · ${projectName}`} />
      {sheet.mode === "document" ? (
        <SiteReportDocument sheet={sheet} projectSlug={projectSlug} projectName={projectName} />
      ) : (
        <SheetTable sheet={sheet} projectSlug={projectSlug} projectName={projectName} />
      )}
    </div>
  )
}

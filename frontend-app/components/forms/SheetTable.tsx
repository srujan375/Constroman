'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, Save, FileDown, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  resolveProjectId,
  resolveRegister,
  fetchSubmissions,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  type ApiSubmission,
} from "@/lib/api"
import { evaluateFormula } from "@/lib/formula"
import { exportElementToPdf, safeFilename } from "@/lib/pdf"
import type { SheetDef, SheetField } from "@/lib/sheets"

type RowValue = string | number
type RowData = Record<string, RowValue>

interface Row {
  key: string
  id: number | null
  data: RowData
  dirty: boolean
}

let rowSeq = 0
function nextKey() {
  rowSeq += 1
  return `row-${rowSeq}-${rowSeq * 7}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function primaryDateField(sheet: SheetDef): string | null {
  return sheet.fields.find((f) => f.type === "date")?.name ?? null
}

function emptyData(sheet: SheetDef, dateDefault: string): RowData {
  const data: RowData = {}
  for (const f of sheet.fields) {
    data[f.name] = f.type === "number" || f.type === "calc" ? "" : ""
  }
  const df = primaryDateField(sheet)
  if (df) data[df] = dateDefault
  return data
}

function applyCalcs(sheet: SheetDef, data: RowData): RowData {
  const next = { ...data }
  for (const f of sheet.fields) {
    if (f.type === "calc" && f.formula) {
      next[f.name] = evaluateFormula(f.formula, next)
    }
  }
  return next
}

function isRowEmpty(sheet: SheetDef, data: RowData): boolean {
  return sheet.fields
    .filter((f) => f.type !== "calc")
    .every((f) => {
      const v = data[f.name]
      return v === "" || v === null || v === undefined
    })
}

export default function SheetTable({
  sheet,
  projectSlug,
  projectName,
}: {
  sheet: SheetDef
  projectSlug: string
  projectName: string
}) {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [dateFilter, setDateFilter] = useState<string>("")
  const [ids, setIds] = useState<{
    projectId: number | null
    registerId: number
    templateId: number
  } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const dateField = useMemo(() => primaryDateField(sheet), [sheet])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projectId, reg] = await Promise.all([
        resolveProjectId(projectSlug),
        resolveRegister(sheet.registerSlug),
      ])
      if (!reg) throw new Error(`Register "${sheet.registerSlug}" not found on the server.`)
      if (!user) throw new Error("Not authenticated.")

      const submissions = await fetchSubmissions({
        organizationId: user.organization_id,
        registerId: reg.registerId,
        projectId,
      })
      setIds({ projectId, registerId: reg.registerId, templateId: reg.templateId })
      setRows(
        submissions.map((s: ApiSubmission) => ({
          key: nextKey(),
          id: s.id,
          data: applyCalcs(sheet, s.form_data as RowData),
          dirty: false,
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.")
    } finally {
      setLoading(false)
    }
  }, [projectSlug, sheet, user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  const visibleRows = useMemo(() => {
    if (!dateFilter || !dateField) return rows
    return rows.filter((r) => String(r.data[dateField] ?? "") === dateFilter)
  }, [rows, dateFilter, dateField])

  function addRow() {
    const dflt = dateFilter || today()
    setRows((prev) => [
      ...prev,
      { key: nextKey(), id: null, data: emptyData(sheet, dflt), dirty: true },
    ])
  }

  function updateCell(key: string, field: SheetField, value: RowValue) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        const data = { ...row.data, [field.name]: value }
        return { ...row, data: applyCalcs(sheet, data), dirty: true }
      })
    )
  }

  async function removeRow(row: Row) {
    if (row.id != null) {
      try {
        await deleteSubmission(row.id, user?.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete row.")
        return
      }
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key))
  }

  async function saveAll() {
    if (!ids || !user) return
    setSaving(true)
    setError(null)
    try {
      const updated: Row[] = []
      for (const row of rows) {
        if (isRowEmpty(sheet, row.data)) {
          // Skip blank new rows; keep existing untouched.
          if (row.id == null) continue
        }
        const subDate = dateField ? String(row.data[dateField] || today()) : today()
        const payload = {
          organization_id: user.organization_id,
          project_id: ids.projectId,
          register_id: ids.registerId,
          template_id: ids.templateId,
          submission_date: subDate,
          status: "submitted",
          form_data: row.data,
          submitted_by_id: user.id,
        }
        if (row.id == null) {
          const created = await createSubmission(payload)
          updated.push({ key: row.key, id: created.id, data: row.data, dirty: false })
        } else if (row.dirty) {
          await updateSubmission(row.id, payload)
          updated.push({ ...row, dirty: false })
        } else {
          updated.push(row)
        }
      }
      setRows(updated)
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  async function exportPdf() {
    if (!printRef.current) return
    const name = safeFilename([sheet.slug, projectSlug, dateFilter || "all"])
    await exportElementToPdf(printRef.current, name)
  }

  const dirtyCount = rows.filter((r) => r.dirty).length
  // Excel-like grid: every cell bordered, headers shaded, inputs fill the cell.
  const thBase =
    "px-2 py-2 text-slate-700 text-[11px] uppercase tracking-wide font-semibold text-center border border-slate-300 bg-slate-100 whitespace-nowrap"
  const tdBase = "border border-slate-300 align-middle p-0"
  const cellInput =
    "w-full bg-transparent px-2 py-1.5 text-[13px] focus:outline-none focus:bg-teal-50 rounded-none"

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100">
            {visibleRows.length} {visibleRows.length === 1 ? "entry" : "entries"}
          </span>
          {dateField && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">Filter by date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedAt && dirtyCount === 0 && !saving && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={exportPdf}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <FileDown className="w-4 h-4" />
            Save as PDF
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : dirtyCount > 0 ? `Save (${dirtyCount})` : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div ref={printRef} className="bg-white border border-slate-300 shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Excel-style merged title banner */}
            <tr>
              <th colSpan={sheet.fields.length + 2} className="border border-slate-300 bg-slate-100 px-4 py-3 text-center">
                <div className="text-base font-bold text-slate-800 uppercase tracking-wide">{sheet.title}</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  {sheet.code} · {projectName}{dateFilter ? ` · ${dateFilter}` : ""}
                </div>
              </th>
            </tr>
            <tr>
              <th className={thBase} style={{ width: 52 }}>Sr.</th>
              {sheet.fields.map((f) => (
                <th key={f.name} className={thBase} style={{ minWidth: f.width ?? 130 }}>
                  {f.label}
                  {f.required && <span className="text-red-400"> *</span>}
                </th>
              ))}
              <th className={thBase} style={{ width: 44 }} aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={sheet.fields.length + 2} className="border border-slate-300 px-4 py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline" /> Loading…
                </td>
              </tr>
            )}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={sheet.fields.length + 2} className="border border-slate-300 px-4 py-10 text-center text-slate-400 text-sm">
                  No entries yet. Click <span className="font-medium text-slate-600">Add Entry</span> to begin.
                </td>
              </tr>
            )}
            {!loading &&
              visibleRows.map((row, idx) => (
                <tr key={row.key} className="hover:bg-slate-50/60">
                  <td className="border border-slate-300 text-center text-xs text-slate-500 px-2 py-1">{idx + 1}</td>
                  {sheet.fields.map((f) => (
                    <td key={f.name} className={tdBase}>
                      <FieldInput
                        field={f}
                        value={row.data[f.name]}
                        onChange={(v) => updateCell(row.key, f, v)}
                        className={cellInput}
                      />
                    </td>
                  ))}
                  <td className="border border-slate-300 text-center px-1 py-1">
                    <button
                      onClick={() => removeRow(row)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-teal-700 border border-teal-300 border-dashed rounded-lg hover:bg-teal-50 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  className,
}: {
  field: SheetField
  value: RowValue
  onChange: (v: RowValue) => void
  className: string
}) {
  const v = value ?? ""

  if (field.type === "calc") {
    return (
      <input
        readOnly
        value={v === "" ? "" : String(v)}
        className={`${className} bg-teal-50/60 text-teal-800 font-medium text-right cursor-default`}
        style={{ minWidth: field.width ?? 120 }}
      />
    )
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(v)}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`${className} resize-y`}
        style={{ minWidth: field.width ?? 200 }}
      />
    )
  }

  if (field.type === "select") {
    return (
      <select
        value={String(v)}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        style={{ minWidth: field.width ?? 130 }}
      >
        <option value="">—</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={v === "" ? "" : String(v)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={`${className} text-right`}
        style={{ minWidth: field.width ?? 110 }}
      />
    )
  }

  return (
    <input
      type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
      value={String(v)}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ minWidth: field.width ?? 130 }}
    />
  )
}

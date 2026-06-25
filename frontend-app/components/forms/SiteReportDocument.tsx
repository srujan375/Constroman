'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Trash2, Save, FileDown, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  resolveProjectId,
  resolveRegister,
  fetchSubmissions,
  createSubmission,
  updateSubmission,
  type ApiSubmission,
} from "@/lib/api"
import { exportElementToPdf, safeFilename } from "@/lib/pdf"
import type { SheetDef } from "@/lib/sheets"

const LABOUR_CATS = ["carpenter", "fitter", "helper", "mason", "skilled", "unskilled"] as const
const BALANCE_ROWS = [
  ["previousReceipt", "Previous Receipt"],
  ["todaysReceipt", "Today's Receipt"],
  ["cumulativeReceipt", "Cumulative Receipt"],
  ["openingBalance", "Opening Balance"],
  ["todaysConsumption", "Today's Consumption"],
  ["closingBalance", "Closing Balance"],
] as const

interface WorkItem {
  description: string
  carpenter: number | ""
  fitter: number | ""
  helper: number | ""
  mason: number | ""
  skilled: number | ""
  unskilled: number | ""
}
interface MatRow {
  materialDescription: string
  unit: string
  supplierName: string
  challanNo: string
  previous: number | ""
  today: number | ""
  cumulative: number | ""
}
type Balance = Record<string, string>

interface ReportData {
  rainFrom: string
  rainTo: string
  workItems: WorkItem[]
  remarks: string
  rmc: Balance
  reinf: Balance
  decisionsPending: string
  milestones: string
  materialReceiptReport: MatRow[]
  siteVisitors: string
  preparedBy: string
  siteIncharge: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
function emptyWorkItem(): WorkItem {
  return { description: "", carpenter: "", fitter: "", helper: "", mason: "", skilled: "", unskilled: "" }
}
function emptyMatRow(): MatRow {
  return { materialDescription: "", unit: "", supplierName: "", challanNo: "", previous: "", today: "", cumulative: "" }
}
function emptyBalance(): Balance {
  return Object.fromEntries(BALANCE_ROWS.map(([k]) => [k, ""]))
}
function emptyReport(): ReportData {
  return {
    rainFrom: "", rainTo: "", workItems: [emptyWorkItem()], remarks: "",
    rmc: emptyBalance(), reinf: emptyBalance(),
    decisionsPending: "", milestones: "",
    materialReceiptReport: [emptyMatRow()], siteVisitors: "", preparedBy: "", siteIncharge: "",
  }
}

export default function SiteReportDocument({
  sheet,
  projectSlug,
  projectName,
}: {
  sheet: SheetDef
  projectSlug: string
  projectName: string
}) {
  const { user } = useAuth()
  const [date, setDate] = useState(today())
  const [data, setData] = useState<ReportData>(emptyReport())
  const [byDate, setByDate] = useState<Record<string, ApiSubmission>>({})
  const [ids, setIds] = useState<{ projectId: number | null; registerId: number; templateId: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!user) throw new Error("Not authenticated.")
      const [projectId, reg] = await Promise.all([
        resolveProjectId(projectSlug),
        resolveRegister(sheet.registerSlug),
      ])
      if (!reg) throw new Error("Site Report register not found on the server.")
      const subs = await fetchSubmissions({
        organizationId: user.organization_id,
        registerId: reg.registerId,
        projectId,
      })
      const map: Record<string, ApiSubmission> = {}
      for (const s of subs) map[s.submission_date] = s
      setByDate(map)
      setIds({ projectId, registerId: reg.registerId, templateId: reg.templateId })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.")
    } finally {
      setLoading(false)
    }
  }, [projectSlug, sheet, user])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  // When the selected date or loaded map changes, populate the form.
  useEffect(() => {
    const existing = byDate[date]
    if (existing) {
      setData({ ...emptyReport(), ...(existing.form_data as unknown as ReportData) })
    } else {
      setData(emptyReport())
    }
  }, [date, byDate])

  function patch(p: Partial<ReportData>) {
    setData((d) => ({ ...d, ...p }))
  }

  async function save() {
    if (!ids || !user) return
    setSaving(true)
    setError(null)
    try {
      const existing = byDate[date]
      const payload = {
        organization_id: user.organization_id,
        project_id: ids.projectId,
        register_id: ids.registerId,
        template_id: ids.templateId,
        submission_date: date,
        title: `Site Report ${date}`,
        status: "submitted",
        form_data: data as unknown as Record<string, unknown>,
        submitted_by_id: user.id,
      }
      const saved = existing ? await updateSubmission(existing.id, payload) : await createSubmission(payload)
      setByDate((m) => ({ ...m, [date]: saved }))
      setSavedAt(Date.now())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  async function exportPdf() {
    if (!printRef.current) return
    await exportElementToPdf(printRef.current, safeFilename(["site-report", projectSlug, date]))
  }

  const inp = "border border-slate-200 rounded px-2 py-1 text-[13px] w-full focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
  const num = `${inp} text-right`
  const cell = "border border-slate-200 px-1.5 py-1"
  const sectionTitle = "text-[11px] uppercase tracking-widest text-teal-600 font-semibold mb-2"

  const existingDates = Object.keys(byDate).sort().reverse()

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-medium">Report date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          />
          {byDate[date] ? (
            <span className="text-xs text-green-600">Existing report — editing</span>
          ) : (
            <span className="text-xs text-slate-400">New report</span>
          )}
          {existingDates.length > 0 && (
            <select
              value=""
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-600"
            >
              <option value="">Jump to saved…</option>
              {existingDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !saving && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button onClick={exportPdf} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">
            <FileDown className="w-4 h-4" /> Save as PDF
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Report"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /> Loading…</div>
      ) : (
        <div ref={printRef} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Header */}
          <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-teal-600 font-semibold">{projectName}</p>
              <h2 className="text-xl font-bold text-slate-800">Daily Site Report</h2>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-medium">{date}</p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-slate-400">Rain</span>
                <input type="time" value={data.rainFrom} onChange={(e) => patch({ rainFrom: e.target.value })} className="border border-slate-200 rounded px-1 py-0.5 w-24" />
                <span className="text-slate-400">to</span>
                <input type="time" value={data.rainTo} onChange={(e) => patch({ rainTo: e.target.value })} className="border border-slate-200 rounded px-1 py-0.5 w-24" />
              </div>
            </div>
          </div>

          {/* Labour employed */}
          <div>
            <div className="flex items-center justify-between">
              <p className={sectionTitle}>Work Done & Labour Employed</p>
              <button onClick={() => patch({ workItems: [...data.workItems, emptyWorkItem()] })} className="text-xs text-teal-700 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add row</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <th className={`${cell} text-left`} style={{ minWidth: 260 }}>Description</th>
                    {LABOUR_CATS.map((c) => (
                      <th key={c} className={`${cell} capitalize`} style={{ width: 90 }}>{c}</th>
                    ))}
                    <th className={cell} style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {data.workItems.map((w, i) => (
                    <tr key={i}>
                      <td className={cell}>
                        <input value={w.description} onChange={(e) => {
                          const items = [...data.workItems]; items[i] = { ...w, description: e.target.value }; patch({ workItems: items })
                        }} className={inp} />
                      </td>
                      {LABOUR_CATS.map((c) => (
                        <td key={c} className={cell}>
                          <input type="number" value={w[c] === "" ? "" : String(w[c])} onChange={(e) => {
                            const items = [...data.workItems]; items[i] = { ...w, [c]: e.target.value === "" ? "" : Number(e.target.value) }; patch({ workItems: items })
                          }} className={num} />
                        </td>
                      ))}
                      <td className={`${cell} text-center`}>
                        <button onClick={() => patch({ workItems: data.workItems.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className={`${cell} text-right`}>Total Strength</td>
                    {LABOUR_CATS.map((c) => {
                      const total = data.workItems.reduce((s, w) => s + (Number(w[c]) || 0), 0)
                      return <td key={c} className={`${cell} text-right`}>{total || ""}</td>
                    })}
                    <td className={cell} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* RMC + Reinforcement balances */}
          <div className="grid md:grid-cols-2 gap-6">
            {([["rmc", "RMC Report (All Grades)"], ["reinf", "Reinforcement Steel Report"]] as const).map(([key, label]) => (
              <div key={key}>
                <p className={sectionTitle}>{label}</p>
                <table className="w-full text-[13px] border-collapse">
                  <tbody>
                    {BALANCE_ROWS.map(([rk, rlabel]) => (
                      <tr key={rk}>
                        <td className={`${cell} text-slate-600`}>{rlabel}</td>
                        <td className={cell} style={{ width: 130 }}>
                          <input value={data[key][rk] ?? ""} onChange={(e) => patch({ [key]: { ...data[key], [rk]: e.target.value } } as Partial<ReportData>)} className={num} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Remarks / decisions / milestones */}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className={sectionTitle}>Remarks (Shortfall of Labour / Materials)</p>
              <textarea rows={4} value={data.remarks} onChange={(e) => patch({ remarks: e.target.value })} className={inp} />
            </div>
            <div>
              <p className={sectionTitle}>Decisions Pending / Required</p>
              <textarea rows={4} value={data.decisionsPending} onChange={(e) => patch({ decisionsPending: e.target.value })} className={inp} />
            </div>
            <div>
              <p className={sectionTitle}>Milestones Achieved / Missed</p>
              <textarea rows={4} value={data.milestones} onChange={(e) => patch({ milestones: e.target.value })} className={inp} />
            </div>
          </div>

          {/* Material receipt report */}
          <div>
            <div className="flex items-center justify-between">
              <p className={sectionTitle}>Material Receipt Report</p>
              <button onClick={() => patch({ materialReceiptReport: [...data.materialReceiptReport, emptyMatRow()] })} className="text-xs text-teal-700 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add row</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <th className={`${cell} text-left`}>Material Description</th>
                    <th className={cell} style={{ width: 70 }}>Unit</th>
                    <th className={`${cell} text-left`} style={{ width: 160 }}>Supplier</th>
                    <th className={cell} style={{ width: 110 }}>Challan No</th>
                    <th className={cell} style={{ width: 90 }}>Previous</th>
                    <th className={cell} style={{ width: 90 }}>Today</th>
                    <th className={cell} style={{ width: 90 }}>Cum.</th>
                    <th className={cell} style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {data.materialReceiptReport.map((m, i) => {
                    const set = (patchRow: Partial<MatRow>) => {
                      const rows = [...data.materialReceiptReport]; rows[i] = { ...m, ...patchRow }; patch({ materialReceiptReport: rows })
                    }
                    return (
                      <tr key={i}>
                        <td className={cell}><input value={m.materialDescription} onChange={(e) => set({ materialDescription: e.target.value })} className={inp} /></td>
                        <td className={cell}><input value={m.unit} onChange={(e) => set({ unit: e.target.value })} className={inp} /></td>
                        <td className={cell}><input value={m.supplierName} onChange={(e) => set({ supplierName: e.target.value })} className={inp} /></td>
                        <td className={cell}><input value={m.challanNo} onChange={(e) => set({ challanNo: e.target.value })} className={inp} /></td>
                        <td className={cell}><input type="number" value={m.previous === "" ? "" : String(m.previous)} onChange={(e) => set({ previous: e.target.value === "" ? "" : Number(e.target.value) })} className={num} /></td>
                        <td className={cell}><input type="number" value={m.today === "" ? "" : String(m.today)} onChange={(e) => set({ today: e.target.value === "" ? "" : Number(e.target.value) })} className={num} /></td>
                        <td className={cell}><input type="number" value={m.cumulative === "" ? "" : String(m.cumulative)} onChange={(e) => set({ cumulative: e.target.value === "" ? "" : Number(e.target.value) })} className={num} /></td>
                        <td className={`${cell} text-center`}><button onClick={() => patch({ materialReceiptReport: data.materialReceiptReport.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visitors + signatures */}
          <div>
            <p className={sectionTitle}>Site Visitors</p>
            <textarea rows={2} value={data.siteVisitors} onChange={(e) => patch({ siteVisitors: e.target.value })} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div>
              <label className="text-xs text-slate-500">Prepared By</label>
              <input value={data.preparedBy} onChange={(e) => patch({ preparedBy: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Site Incharge</label>
              <input value={data.siteIncharge} onChange={(e) => patch({ siteIncharge: e.target.value })} className={inp} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from "react"
import { useParams } from "next/navigation"
import { Plus, Trash2, Save } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import Header from "@/components/layout/Header"
import { projects, siteReports } from "@/lib/mock-data"
import type { WorkItem, MaterialReceiptReportEntry } from "@/lib/types"

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function SiteReportPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params.projectId
  const project = projects.find((p) => p.id === projectId)
  const existing = siteReports.find((r) => r.projectId === projectId)

  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10))
  const [rainFrom, setRainFrom] = useState(existing?.rainFrom ?? "")
  const [rainTo, setRainTo] = useState(existing?.rainTo ?? "")
  const [workItems, setWorkItems] = useState<WorkItem[]>(
    existing?.workItems ?? []
  )
  const [remarks, setRemarks] = useState(existing?.remarks ?? "")
  const [rmcPrevious, setRmcPrevious] = useState(existing?.rmcPreviousReceipt ?? "")
  const [rmcToday, setRmcToday] = useState(existing?.rmcTodaysReceipt ?? "")
  const [rmcCumulative, setRmcCumulative] = useState(existing?.rmcCumulativeReceipt ?? "")
  const [rmcOpening, setRmcOpening] = useState(existing?.rmcOpeningBalance ?? "")
  const [rmcConsumption, setRmcConsumption] = useState(existing?.rmcTodaysConsumption ?? "")
  const [rmcClosing, setRmcClosing] = useState(existing?.rmcClosingBalance ?? "")
  const [reinfPrevious, setReinfPrevious] = useState(existing?.reinfPreviousReceipt ?? "")
  const [reinfToday, setReinfToday] = useState(existing?.reinfTodaysReceipt ?? "")
  const [reinfCumulative, setReinfCumulative] = useState(existing?.reinfCumulativeReceipt ?? "")
  const [reinfOpening, setReinfOpening] = useState(existing?.reinfOpeningBalance ?? "")
  const [reinfConsumption, setReinfConsumption] = useState(existing?.reinfTodaysConsumption ?? "")
  const [reinfClosing, setReinfClosing] = useState(existing?.reinfClosingBalance ?? "")
  const [decisionsPending, setDecisionsPending] = useState(existing?.decisionsPending ?? "")
  const [milestonesAchieved, setMilestonesAchieved] = useState(existing?.milestonesAchieved ?? "")
  const [materialRows, setMaterialRows] = useState<MaterialReceiptReportEntry[]>(
    existing?.materialReceiptReport ?? []
  )
  const [siteVisitors, setSiteVisitors] = useState(existing?.siteVisitors ?? "")
  const [preparedBy, setPreparedBy] = useState(existing?.preparedBy ?? "")
  const [siteIncharge, setSiteIncharge] = useState(existing?.siteIncharge ?? "")

  function addWorkItem() {
    setWorkItems((prev) => [
      ...prev,
      { id: generateId(), itemNo: String(prev.length + 1), description: "", carpenter: 0, fitter: 0, helper: 0, mason: 0, skilled: 0, unskilled: 0 },
    ])
  }

  function updateWorkItem<K extends keyof WorkItem>(idx: number, key: K, value: WorkItem[K]) {
    setWorkItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)))
  }

  function deleteWorkItem(idx: number) {
    setWorkItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function totalFor(key: keyof Omit<WorkItem, "id" | "itemNo" | "description">) {
    return workItems.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
  }

  function addMaterialRow() {
    setMaterialRows((prev) => [
      ...prev,
      { id: generateId(), itemNo: String(prev.length + 1), materialDescription: "", unit: "", supplierName: "", challanNo: "", previous: 0, today: 0, cumulative: 0 },
    ])
  }

  function updateMaterialRow<K extends keyof MaterialReceiptReportEntry>(idx: number, key: K, value: MaterialReceiptReportEntry[K]) {
    setMaterialRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)))
  }

  function deleteMaterialRow(idx: number) {
    setMaterialRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    const data = {
      projectId, date, rainFrom, rainTo, workItems, remarks,
      rmcPreviousReceipt: rmcPrevious, rmcTodaysReceipt: rmcToday, rmcCumulativeReceipt: rmcCumulative,
      rmcOpeningBalance: rmcOpening, rmcTodaysConsumption: rmcConsumption, rmcClosingBalance: rmcClosing,
      reinfPreviousReceipt: reinfPrevious, reinfTodaysReceipt: reinfToday, reinfCumulativeReceipt: reinfCumulative,
      reinfOpeningBalance: reinfOpening, reinfTodaysConsumption: reinfConsumption, reinfClosingBalance: reinfClosing,
      decisionsPending, milestonesAchieved, materialReceiptReport: materialRows,
      siteVisitors, preparedBy, siteIncharge,
    }
    console.log("[Site Report] Saved:", data)
    exportToPDF(data)
  }

  function exportToPDF(data: any) {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPosition = 10

    // Helper function to add text with wrapping
    const addText = (text: string, size: number = 12, weight: "normal" | "bold" = "normal", y?: number) => {
      pdf.setFontSize(size)
      pdf.setFont("helvetica", weight)
      if (y) yPosition = y
      const splitText = pdf.splitTextToSize(text, pageWidth - 20)
      pdf.text(splitText, 10, yPosition)
      yPosition += splitText.length * (size / 3) + 2
    }

    const addNewPage = () => {
      pdf.addPage()
      yPosition = 10
    }

    // Title
    addText("DAILY SITE REPORT", 16, "bold")
    yPosition += 2

    // Report Header
    addText("Project: " + (project?.name ?? data.projectId), 11)
    addText("Date: " + data.date, 11)
    addText("Rain Time: " + (data.rainFrom || "N/A") + " to " + (data.rainTo || "N/A"), 11)
    yPosition += 3

    // Work Items Section
    if (data.workItems.length > 0) {
      addText("Work Items & Labour Deployed", 12, "bold")
      yPosition += 2

      const columnWidths = [15, 50, 15, 15, 15, 15, 15, 15, 15]
      const headers = ["Item No", "Description", "Carpenter", "Fitter", "Helper", "Mason", "Skilled", "Unskilled", "Total"]

      // Table header
      let xPosition = 10
      headers.forEach((header, idx) => {
        pdf.setFontSize(9)
        pdf.setFont("helvetica", "bold")
        pdf.text(header, xPosition, yPosition)
        xPosition += columnWidths[idx]
      })
      yPosition += 5

      // Table rows
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)
      data.workItems.forEach((item: any) => {
        const total = (item.carpenter || 0) + (item.fitter || 0) + (item.helper || 0) + (item.mason || 0) + (item.skilled || 0) + (item.unskilled || 0)
        const values = [item.itemNo, item.description, item.carpenter, item.fitter, item.helper, item.mason, item.skilled, item.unskilled, total]
        xPosition = 10
        values.forEach((val, idx) => {
          pdf.text(String(val), xPosition, yPosition)
          xPosition += columnWidths[idx]
        })
        yPosition += 4
        if (yPosition > pageHeight - 20) {
          addNewPage()
        }
      })
      yPosition += 3
    }

    // Remarks Section
    if (data.remarks) {
      addText("Remarks (Shortfall of Labors / Materials):", 11, "bold")
      addText(data.remarks, 10)
      yPosition += 2
    }

    // RMC Report
    if (data.rmcPreviousReceipt || data.rmcTodaysReceipt || data.rmcCumulativeReceipt || data.rmcOpeningBalance || data.rmcTodaysConsumption || data.rmcClosingBalance) {
      addText("RMC (Ready Mix Concrete) Report", 11, "bold")
      addText("Previous Receipt (cum): " + data.rmcPreviousReceipt, 10)
      addText("Today's Receipt (cum): " + data.rmcTodaysReceipt, 10)
      addText("Cumulative Receipt (cum): " + data.rmcCumulativeReceipt, 10)
      addText("Opening Balance (cum): " + data.rmcOpeningBalance, 10)
      addText("Today's Consumption (cum): " + data.rmcTodaysConsumption, 10)
      addText("Closing Balance (cum): " + data.rmcClosingBalance, 10)
      yPosition += 2
      if (yPosition > pageHeight - 40) addNewPage()
    }

    // Reinforcement Steel Report
    if (data.reinfPreviousReceipt || data.reinfTodaysReceipt || data.reinfCumulativeReceipt || data.reinfOpeningBalance || data.reinfTodaysConsumption || data.reinfClosingBalance) {
      addText("Reinforcement Steel Report", 11, "bold")
      addText("Previous Receipt (MT): " + data.reinfPreviousReceipt, 10)
      addText("Today's Receipt (MT): " + data.reinfTodaysReceipt, 10)
      addText("Cumulative Receipt (MT): " + data.reinfCumulativeReceipt, 10)
      addText("Opening Balance (MT): " + data.reinfOpeningBalance, 10)
      addText("Today's Consumption (MT): " + data.reinfTodaysConsumption, 10)
      addText("Closing Balance (MT): " + data.reinfClosingBalance, 10)
      yPosition += 2
      if (yPosition > pageHeight - 40) addNewPage()
    }

    // Decisions Pending
    if (data.decisionsPending) {
      addText("Decisions Pending:", 11, "bold")
      addText(data.decisionsPending, 10)
      yPosition += 2
      if (yPosition > pageHeight - 40) addNewPage()
    }

    // Milestones Achieved
    if (data.milestonesAchieved) {
      addText("Milestones Achieved / Missed:", 11, "bold")
      addText(data.milestonesAchieved, 10)
      yPosition += 2
      if (yPosition > pageHeight - 40) addNewPage()
    }

    // Material Receipt Report
    if (data.materialReceiptReport.length > 0) {
      addText("Material Receipt Report", 12, "bold")
      yPosition += 2

      const matColumnWidths = [15, 40, 15, 20, 15, 15, 15, 15]
      const matHeaders = ["Item No", "Material Description", "Unit", "Supplier Name", "Challan No", "Previous", "Today", "Cumulative"]

      // Table header
      let xPos = 10
      matHeaders.forEach((header, idx) => {
        pdf.setFontSize(8)
        pdf.setFont("helvetica", "bold")
        pdf.text(header, xPos, yPosition)
        xPos += matColumnWidths[idx]
      })
      yPosition += 4

      // Table rows
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7)
      data.materialReceiptReport.forEach((row: any) => {
        const values = [row.itemNo, row.materialDescription, row.unit, row.supplierName, row.challanNo, row.previous, row.today, row.cumulative]
        xPos = 10
        values.forEach((val, idx) => {
          pdf.text(String(val), xPos, yPosition)
          xPos += matColumnWidths[idx]
        })
        yPosition += 4
        if (yPosition > pageHeight - 20) {
          addNewPage()
        }
      })
      yPosition += 3
    }

    // Site Visitors
    if (data.siteVisitors) {
      if (yPosition > pageHeight - 40) addNewPage()
      addText("Site Visitors:", 11, "bold")
      addText(data.siteVisitors, 10)
      yPosition += 2
    }

    // Sign-off
    if (yPosition > pageHeight - 30) addNewPage()
    yPosition += 5
    addText("Sign-off", 11, "bold")
    yPosition += 3
    addText("Prepared By: " + data.preparedBy, 10)
    yPosition += 8
    addText("Site Incharge: " + data.siteIncharge, 10)

    // Save PDF
    const fileName = `SiteReport_${project?.name || data.projectId}_${data.date}.pdf`
    pdf.save(fileName)
  }

  const inputClass = "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
  const textareaClass = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
  const labelClass = "block text-xs font-medium text-slate-600 mb-1"
  const sectionClass = "bg-white rounded-lg shadow-sm border border-gray-200 p-5"
  const sectionTitleClass = "text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-gray-100"

  return (
    <div className="min-h-full bg-gray-50">
      <Header
        title="Daily Site Report"
        subtitle={project?.name ?? projectId}
      />

      <div className="p-6 space-y-5 max-w-5xl">
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Report Header</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Project</label>
              <input type="text" readOnly value={project?.name ?? projectId} className={`${inputClass} bg-gray-50 text-slate-500`} />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Rain From</label>
                <input type="time" value={rainFrom} onChange={(e) => setRainFrom(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Rain To</label>
                <input type="time" value={rainTo} onChange={(e) => setRainTo(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Work Items & Labour Deployed</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {["Item No", "Description", "Carpenter", "Fitter", "Helper", "Mason", "Skilled", "Unskilled", "Total", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-slate-600 text-xs uppercase font-semibold whitespace-nowrap border-b border-gray-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workItems.map((item, idx) => {
                  const total = (Number(item.carpenter) || 0) + (Number(item.fitter) || 0) + (Number(item.helper) || 0) + (Number(item.mason) || 0) + (Number(item.skilled) || 0) + (Number(item.unskilled) || 0)
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1.5">
                        <input type="text" value={item.itemNo} onChange={(e) => updateWorkItem(idx, "itemNo", e.target.value)} className="w-14 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={item.description} onChange={(e) => updateWorkItem(idx, "description", e.target.value)} className="w-48 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      {(["carpenter", "fitter", "helper", "mason", "skilled", "unskilled"] as const).map((key) => (
                        <td key={key} className="px-2 py-1.5">
                          <input type="number" min={0} value={item[key]} onChange={(e) => updateWorkItem(idx, key, Number(e.target.value))} className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-center" />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center font-semibold text-slate-700 text-xs">{total}</td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => deleteWorkItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {workItems.length > 0 && (
                  <tr className="bg-slate-50 font-semibold text-xs text-slate-700">
                    <td className="px-3 py-2 text-right" colSpan={2}>Total</td>
                    {(["carpenter", "fitter", "helper", "mason", "skilled", "unskilled"] as const).map((key) => (
                      <td key={key} className="px-3 py-2 text-center">{totalFor(key)}</td>
                    ))}
                    <td className="px-3 py-2 text-center text-blue-700">{(["carpenter", "fitter", "helper", "mason", "skilled", "unskilled"] as const).reduce((s, k) => s + totalFor(k), 0)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button onClick={addWorkItem} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Work Item
          </button>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Remarks</h2>
          <label className={labelClass}>Shortfall of Labors / Materials</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className={textareaClass} rows={3} placeholder="Note any shortfalls..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>RMC (Ready Mix Concrete) Report</h2>
            <div className="space-y-3">
              {[
                ["Previous Receipt (cum)", rmcPrevious, setRmcPrevious],
                ["Today's Receipt (cum)", rmcToday, setRmcToday],
                ["Cumulative Receipt (cum)", rmcCumulative, setRmcCumulative],
                ["Opening Balance (cum)", rmcOpening, setRmcOpening],
                ["Today's Consumption (cum)", rmcConsumption, setRmcConsumption],
                ["Closing Balance (cum)", rmcClosing, setRmcClosing],
              ].map(([label, val, setter]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-600 flex-1">{String(label)}</label>
                  <input
                    type="number"
                    value={String(val)}
                    onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                    className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>Reinforcement Steel Report</h2>
            <div className="space-y-3">
              {[
                ["Previous Receipt (MT)", reinfPrevious, setReinfPrevious],
                ["Today's Receipt (MT)", reinfToday, setReinfToday],
                ["Cumulative Receipt (MT)", reinfCumulative, setReinfCumulative],
                ["Opening Balance (MT)", reinfOpening, setReinfOpening],
                ["Today's Consumption (MT)", reinfConsumption, setReinfConsumption],
                ["Closing Balance (MT)", reinfClosing, setReinfClosing],
              ].map(([label, val, setter]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-slate-600 flex-1">{String(label)}</label>
                  <input
                    type="number"
                    value={String(val)}
                    onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                    className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Decisions Pending</h2>
          <textarea value={decisionsPending} onChange={(e) => setDecisionsPending(e.target.value)} className={textareaClass} rows={4} placeholder="List all pending decisions or approvals required..." />
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Milestones Achieved / Missed</h2>
          <textarea value={milestonesAchieved} onChange={(e) => setMilestonesAchieved(e.target.value)} className={textareaClass} rows={3} placeholder="Describe milestones achieved or missed today..." />
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Material Receipt Report</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {["Item No", "Material Description", "Unit", "Supplier Name", "Challan No", "Previous", "Today", "Cumulative", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-slate-600 text-xs uppercase font-semibold whitespace-nowrap border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materialRows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {(["itemNo", "materialDescription", "unit", "supplierName", "challanNo"] as const).map((key) => (
                      <td key={key} className="px-2 py-1.5">
                        <input
                          type="text"
                          value={String(row[key])}
                          onChange={(e) => updateMaterialRow(idx, key, e.target.value)}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-[80px]"
                        />
                      </td>
                    ))}
                    {(["previous", "today", "cumulative"] as const).map((key) => (
                      <td key={key} className="px-2 py-1.5">
                        <input
                          type="number"
                          value={row[key]}
                          onChange={(e) => updateMaterialRow(idx, key, Number(e.target.value))}
                          className="w-20 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <button onClick={() => deleteMaterialRow(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addMaterialRow} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors">
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Site Visitors</h2>
          <textarea value={siteVisitors} onChange={(e) => setSiteVisitors(e.target.value)} className={textareaClass} rows={3} placeholder="List all site visitors with name and purpose..." />
        </div>

        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Sign-off</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prepared By</label>
              <input type="text" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className={inputClass} placeholder="Engineer name" />
            </div>
            <div>
              <label className={labelClass}>Site Incharge</label>
              <input type="text" value={siteIncharge} onChange={(e) => setSiteIncharge(e.target.value)} className={inputClass} placeholder="Site incharge name" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pb-6">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            Save Report
          </button>
        </div>
      </div>
    </div>
  )
}

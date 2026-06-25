/**
 * Export a DOM element to a real PDF file saved to the user's computer.
 * Uses html2canvas to rasterize the element, then jsPDF to lay it out across
 * A4 pages. Wide content uses landscape automatically.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  })

  const landscape = canvas.width > canvas.height
  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 8
  const usableWidth = pageWidth - margin * 2

  // Height of the full image when scaled to the usable page width.
  const imgHeight = (canvas.height * usableWidth) / canvas.width
  const imgData = canvas.toDataURL("image/png")

  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeight)
  } else {
    // Paginate vertically.
    let remaining = imgHeight
    let position = margin
    const usableHeight = pageHeight - margin * 2
    let page = 0
    while (remaining > 0) {
      if (page > 0) pdf.addPage()
      pdf.addImage(
        imgData,
        "PNG",
        margin,
        position - page * usableHeight,
        usableWidth,
        imgHeight
      )
      remaining -= usableHeight
      page += 1
    }
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}

export function safeFilename(parts: (string | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

import * as pdfjsLib from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { useEffect, useRef } from "react"

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

interface Props {
  url: string
  title?: string
}

export default function PdfViewer({ url, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    pdfjsLib.getDocument(url).promise.then(async (pdf) => {
      if (cancelled) return

      container.innerHTML = ""
      const containerWidth = container.clientWidth
      const dpr = window.devicePixelRatio || 1

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled) break

        const page = await pdf.getPage(pageNum)
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = ((containerWidth || 800) / baseViewport.width) * dpr
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement("canvas")
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = "100%"
        canvas.style.display = "block"
        if (title && pageNum === 1) canvas.setAttribute("aria-label", title)

        // biome-ignore lint/style/noNonNullAssertion: 2d context is always available on a newly created canvas
        const ctx = canvas.getContext("2d")!
        await page.render({ canvasContext: ctx, viewport }).promise

        if (!cancelled) container.appendChild(canvas)
      }
    })

    return () => {
      cancelled = true
      if (container) container.innerHTML = ""
    }
  }, [url, title])

  return <div ref={containerRef} className="w-full" />
}

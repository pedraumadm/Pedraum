"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// ✅ react-pdf v10 usa estes paths (sem "esm")
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ✅ Worker pela CDN (compatível, sem copiar para /public/)
pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs";

type Props = { src: string; height?: number; initialPage?: number };

export default function PDFViewer({
  src,
  height = 720,
  initialPage = 1,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.1);
  const [err, setErr] = useState<string | null>(null);
  const style = useMemo(() => ({ height }), [height]);

  return (
    <div className="w-full rounded-2xl border bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-md disabled:opacity-50"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            ‹
          </button>
          <span className="text-sm">
            {pageNumber} / {numPages || "—"}
          </span>
          <button
            className="px-3 py-1.5 border rounded-md disabled:opacity-50"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 border rounded-md"
            onClick={() =>
              setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))
            }
          >
            −
          </button>
          <span className="text-sm w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            className="px-3 py-1.5 border rounded-md"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))}
          >
            +
          </button>
        </div>
      </div>

      <div className="overflow-auto" style={style}>
        <div className="flex justify-center py-4">
          <Document
            file={src}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(e) => {
              console.error(e);
              setErr("Não foi possível carregar o PDF.");
            }}
            loading={
              <div className="text-sm text-gray-500 px-4">Carregando PDF…</div>
            }
            error={<div className="text-sm text-red-500 px-4">{err}</div>}
            externalLinkTarget="_blank"
            renderMode="canvas"
          >
            {numPages > 0 && (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderAnnotationLayer
                renderTextLayer
              />
            )}
          </Document>
        </div>
      </div>
    </div>
  );
}

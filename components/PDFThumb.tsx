"use client";

import { useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/build/pdf.worker.min.mjs";

type Props = { src: string; width: number; className?: string };

export default function PDFThumb({ src, width, className }: Props) {
  const w = useMemo(
    () => Math.max(220, Math.min(560, Math.floor(width))),
    [width],
  );
  return (
    <div className={className}>
      <Document
        file={src}
        loading={<div className="pdf-thumb-loading">Carregando preview…</div>}
        error={
          <div className="pdf-thumb-error">
            Não foi possível carregar a miniatura.
          </div>
        }
        externalLinkTarget="_blank"
        renderMode="canvas"
      >
        <Page
          pageNumber={1}
          width={w}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </Document>
    </div>
  );
}

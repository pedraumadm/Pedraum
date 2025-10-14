"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker do pdf.js pela CDN (compatível com pdfjs-dist@5.x)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type DrivePDFViewerProps = {
  /** URL do PDF (passe via /api/pdf-proxy?file=... se precisar evitar CORS) */
  fileUrl: string;
  /** Altura total do viewer (px) quando embutido */
  height?: number;
  /** Começa na página N (1-based) */
  initialPage?: number;
  /** Mostrar barra de miniaturas à esquerda */
  showThumbnails?: boolean;
  /** Mostrar botões de abrir/baixar */
  allowDownload?: boolean;
};

export default function DrivePDFViewer({
  fileUrl,
  height = 720,
  initialPage = 1,
  showThumbnails = true,
  allowDownload = true,
}: DrivePDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [page, setPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.15);
  const [fitMode, setFitMode] = useState<"fit-width" | "fit-page" | "free">(
    "fit-width",
  );
  const [rotate, setRotate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ajusta zoom para caber na largura container (fit-width) ou página inteira (fit-page)
  const recalcScale = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // margem e barra de miniaturas
    const sidePadding = showThumbnails ? 260 : 32;
    const usable = container.clientWidth - sidePadding;
    if (usable <= 0) return;

    // heurística: 1.0 ~ 794px de largura para A4 em 72dpi
    if (fitMode === "fit-width") {
      const base = 794;
      setScale(Math.max(0.5, +(usable / base).toFixed(2)));
    } else if (fitMode === "fit-page") {
      const baseW = 794;
      const baseH = 1123;
      const byW = Math.max(0.3, +(usable / baseW).toFixed(2));
      const byH = Math.max(0.3, +((height - 140) / baseH).toFixed(2)); // 140px reserva toolbar/margens
      setScale(Math.max(0.3, Math.min(byW, byH)));
    }
  }, [fitMode, height, showThumbnails]);

  useEffect(() => {
    if (fitMode !== "free") recalcScale();
  }, [fitMode, showThumbnails, height, recalcScale]);

  useEffect(() => {
    const onResize = () => fitMode !== "free" && recalcScale();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitMode, recalcScale]);

  const onLoad = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setErr(null);
    if (page > numPages) setPage(numPages);
    if (fitMode !== "free") recalcScale();
  };

  const canPrev = page > 1;
  const canNext = page < numPages;

  const toolbarBtn =
    "px-2.5 py-1.5 text-sm rounded-md border hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed";
  const iconBtn =
    "px-2 py-1 rounded-md border hover:bg-slate-50 active:bg-slate-100";

  // Atalhos de teclado
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)));
        } else if (e.key === "-") {
          e.preventDefault();
          setScale((s) => Math.max(0.3, +(s - 0.1).toFixed(2)));
        } else if (e.key.toLowerCase() === "0") {
          e.preventDefault();
          setFitMode("fit-width");
          recalcScale();
        }
      } else if (e.key === "ArrowRight" && canNext) {
        setPage((p) => p + 1);
      } else if (e.key === "ArrowLeft" && canPrev) {
        setPage((p) => p - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canNext, canPrev, recalcScale]);

  const openInNewTab = () => {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = "arquivo.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      ref={containerRef}
      className="w-full border rounded-2xl bg-white overflow-hidden"
      style={{ height }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b gap-2">
        <div className="flex items-center gap-2">
          <button
            className={toolbarBtn}
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            title="Página anterior ←"
          >
            ←
          </button>

          <div className="flex items-center gap-1">
            <input
              className="w-14 px-2 py-1 border rounded-md text-center"
              type="number"
              min={1}
              max={numPages || 1}
              value={page}
              onChange={(e) =>
                setPage(
                  Math.min(numPages || 1, Math.max(1, Number(e.target.value))),
                )
              }
            />
            <span className="text-sm text-slate-600">/ {numPages || "—"}</span>
          </div>

          <button
            className={toolbarBtn}
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            title="Próxima página →"
          >
            →
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={iconBtn}
            onClick={() => {
              setFitMode("fit-width");
              recalcScale();
            }}
            title="Ajustar à largura (Ctrl+0)"
          >
            ↔︎
          </button>
          <button
            className={iconBtn}
            onClick={() => {
              setFitMode("fit-page");
              recalcScale();
            }}
            title="Ajustar à página"
          >
            ⤢
          </button>
          <button
            className={iconBtn}
            onClick={() => setFitMode("free")}
            title="Modo livre"
          >
            ●
          </button>

          <div className="w-px h-6 bg-slate-200" />

          <button
            className={iconBtn}
            onClick={() =>
              setScale((s) => Math.max(0.3, +(s - 0.1).toFixed(2)))
            }
            title="Zoom - (Ctrl -)"
          >
            −
          </button>
          <span className="text-sm w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            className={iconBtn}
            onClick={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))}
            title="Zoom + (Ctrl +)"
          >
            +
          </button>

          <div className="w-px h-6 bg-slate-200" />

          <button
            className={iconBtn}
            onClick={() => setRotate((r) => (r + 90) % 360)}
            title="Rotacionar 90°"
          >
            ⟳
          </button>

          {allowDownload && (
            <>
              <div className="w-px h-6 bg-slate-200" />
              <button
                className={iconBtn}
                onClick={openInNewTab}
                title="Abrir em nova aba"
              >
                ↗
              </button>
              <button className={iconBtn} onClick={download} title="Baixar PDF">
                ⬇
              </button>
            </>
          )}
        </div>
      </div>

      {/* Corpo: miniaturas + página */}
      <div className="flex h-[calc(100%-44px)]">
        {/* Thumbs */}
        {showThumbnails && (
          <div className="w-56 border-r overflow-auto p-2 bg-slate-50">
            {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                className={`mb-2 rounded-md border hover:shadow cursor-pointer ${
                  p === page ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setPage(p)}
              >
                <Document file={fileUrl}>
                  <Page
                    pageNumber={p}
                    width={200}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </Document>
                <div className="text-center text-xs py-1 text-slate-600">
                  Página {p}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Página principal */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="flex justify-center py-4">
            <Document
              file={fileUrl}
              onLoadSuccess={onLoad}
              onLoadError={(e) => {
                console.error(e);
                setErr("Não foi possível carregar o PDF.");
                setLoading(false);
              }}
              loading={
                <div className="text-sm text-slate-500 px-4 py-2">
                  Carregando PDF…
                </div>
              }
              error={
                <div className="text-sm text-red-500 px-4 py-2">{err}</div>
              }
              externalLinkTarget="_blank"
              renderMode="canvas"
            >
              {numPages > 0 && (
                <Page
                  pageNumber={page}
                  scale={scale}
                  rotate={rotate}
                  renderAnnotationLayer
                  renderTextLayer
                />
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}

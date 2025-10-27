// components/PDFUploader.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/uploadthing.config";

type EndpointName = Extract<keyof OurFileRouter, string>;

type PdfLabels = {
  title?: string;         // "Arquivo PDF"
  helper?: string;        
  button?: string;        // "Selecionar PDF"
  attached?: string;      // "PDF anexado:"
  open?: string;          // "abrir"
  remove?: string;        // "Remover"
  uploading?: string;     // "Enviando..."
  invalidType?: string;   // "Envie um arquivo PDF válido."
  tooLarge?: string;      // "Arquivo maior que {max}MB."
  routeError?: string;    // "Rota de upload de PDF não encontrada..."
  genericError?: string;  // "Falha no upload do PDF."
  limitHelper?: string;   // "Apenas 1 PDF • até {max}MB"
};

interface Props {
  /** URL inicial (modo edição) */
  initialUrl?: string | null;
  /** Callback com a URL final do PDF (ou null ao remover) */
  onUploaded: (url: string | null) => void;
  /** Slug de upload no backend (default: "pdfUploader") */
  endpoint?: EndpointName;
  className?: string;
  disableUpload?: boolean;
  /** Tamanho máximo aceito (MB). Default: 16 */
  maxSizeMB?: number;
  /** Rótulos em PT-BR (opcional) */
  labels?: PdfLabels;

  /** Compat: páginas antigas passam `mode="create" | "edit"` (ignorado) */
  mode?: string;
}

const defaultLabels: Required<PdfLabels> = {
  title: "Arquivo PDF",
  helper: "",
  button: "Selecionar PDF",
  attached: "PDF anexado:",
  open: "abrir",
  remove: "Remover",
  uploading: "Enviando...",
  invalidType: "Envie um arquivo PDF válido.",
  tooLarge: "Arquivo maior que {max}MB.",
  routeError:
    "Rota de upload de PDF não encontrada no backend. Verifique 'pdfUploader'.",
  genericError: "Falha no upload do PDF.",
  limitHelper: "Apenas 1 PDF • até {max}MB",
};

export default function PDFUploader({
  initialUrl = null,
  onUploaded,
  endpoint = "pdfUploader",
  className,
  disableUpload = false,
  maxSizeMB = 16,
  labels,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mode,
}: Props) {
  const L = { ...defaultLabels, ...(labels ?? {}) };

  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const hasFile = useMemo(() => !!currentUrl, [currentUrl]);

  // 🔄 Mantém o estado sincronizado se a prop initialUrl mudar
  useEffect(() => {
    setCurrentUrl(initialUrl ?? null);
  }, [initialUrl]);

  function handleRemove() {
    setCurrentUrl(null);
    onUploaded(null);
  }

  return (
    <div className={className ?? "space-y-3"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{L.title}</span>
          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200">
            {hasFile ? "1/1" : "0/1"}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {L.limitHelper.replace("{max}", String(maxSizeMB))}
        </span>
      </div>

      {/* Botão / Dropzone */}
      {!disableUpload && !hasFile && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-orange-50 to-white p-3">
          <UploadButton<OurFileRouter, EndpointName>
            endpoint={endpoint}
            onBeforeUploadBegin={(files) => {
              // aceita só PDF e limita a 1 arquivo + valida tamanho
              const maxBytes = maxSizeMB * 1024 * 1024;
              const pdfs = files.filter((f) => {
                const ct = (f.type ?? "").toLowerCase();
                const byCT = ct.includes("pdf");
                const byExt = (f.name ?? "").toLowerCase().endsWith(".pdf");
                const sizeOk = (f as File).size <= maxBytes;
                return (byCT || byExt) && sizeOk;
              });

              if (pdfs.length === 0) {
                // verifica se houve PDF mas estourou tamanho
                const anyPdf = files.some((f) => {
                  const ct = (f.type ?? "").toLowerCase();
                  const byCT = ct.includes("pdf");
                  const byExt = (f.name ?? "").toLowerCase().endsWith(".pdf");
                  return byCT || byExt;
                });
                alert(
                  anyPdf
                    ? L.tooLarge.replace("{max}", String(maxSizeMB))
                    : L.invalidType,
                );
              }
              return pdfs.slice(0, 1);
            }}
            onUploadProgress={() => setIsUploading(true)}
            onClientUploadComplete={(res) => {
              setIsUploading(false);
              if (res?.length) {
                const url = res[0]?.url;
                if (url) {
                  setCurrentUrl(url);
                  onUploaded(url);
                }
              }
            }}
            onUploadError={(error) => {
              setIsUploading(false);
              const msg = error?.message?.includes("No file route found")
                ? L.routeError
                : error?.message || L.genericError;
              alert(msg);
            }}
            appearance={{
              button:
                "ut-ready:bg-orange-600 ut-ready:hover:bg-orange-700 ut-uploading:bg-gray-400 px-4 py-2 rounded-md font-semibold text-white",
              container: "flex flex-col items-start",
              allowedContent: "text-xs text-slate-500 mt-1",
            }}
            // rótulo PT-BR no botão
            // @ts-ignore - compat com versões do uploadthing
            content={{ button: L.button }}
          />
          <p className="text-xs text-slate-500 mt-2">{L.helper}</p>
        </div>
      )}

      {/* Cartão de arquivo anexado */}
      {hasFile ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 flex items-center justify-between shadow-sm">
          <div className="truncate">
            <span className="font-semibold">{L.attached}</span>{" "}
            <a
              href={currentUrl!}
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              {L.open}
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="ml-3 bg-white hover:bg-slate-50 border rounded-md px-2 py-1 text-xs font-semibold text-red-600 border-red-200 shadow-sm"
          >
            {L.remove}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {isUploading ? L.uploading : L.helper}
        </p>
      )}
    </div>
  );
}

// components/ImageUploader.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/uploadthing.config";

type EndpointName = Extract<keyof OurFileRouter, string>;

type UploaderLabels = {
  title?: string;          // "Imagens"
  helper?: string;         // "Arraste e solte ou clique para enviar"
  counter?: string;        // "Você pode adicionar até {restantes} imagem(ns)."
  limitReached?: string;   // "Limite de {max} imagens atingido."
  uploading?: string;      // "Enviando..."
  button?: string;         // "Selecionar imagens"
  moveLeft?: string;       // "Mover para a esquerda"
  moveRight?: string;      // "Mover para a direita"
  remove?: string;         // "Remover"
  errorRoute?: string;     // "Rota de upload não encontrada..."
  errorGeneric?: string;   // "Falha no upload."
};

interface Props {
  imagens: string[];
  setImagens: (urls: string[]) => void;
  max?: number;
  circular?: boolean;
  endpoint?: EndpointName; // default: "imageUploader"
  className?: string;
  enableReorder?: boolean;
  labels?: UploaderLabels;
}

const defaultLabels: Required<UploaderLabels> = {
  title: "Imagens",
  helper: "Arraste e solte ou clique para enviar",
  counter: "Você pode adicionar até {restantes} imagem(ns).",
  limitReached: "Limite de {max} imagens atingido.",
  uploading: "Enviando...",
  button: "Selecionar imagens",
  moveLeft: "Mover para a esquerda",
  moveRight: "Mover para a direita",
  remove: "Remover",
  errorRoute:
    "Rota de upload não encontrada no backend. Confira o slug no ourFileRouter.",
  errorGeneric: "Falha no upload.",
};

export default function ImageUploader({
  imagens,
  setImagens,
  max = 5,
  circular = false,
  endpoint = "imageUploader",
  className,
  enableReorder = true,
  labels,
}: Props) {
  const L = { ...defaultLabels, ...(labels ?? {}) };

  const [isUploading, setIsUploading] = useState(false);

  const limiteAtingido = useMemo(
    () => imagens.length >= max,
    [imagens.length, max],
  );
  const restantes = useMemo(
    () => Math.max(0, max - imagens.length),
    [imagens.length, max],
  );

  function remover(idx: number) {
    const clone = [...imagens];
    clone.splice(idx, 1);
    setImagens(clone);
  }

  function mover(idx: number, dir: -1 | 1) {
    if (!enableReorder) return;
    const novo = [...imagens];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
    setImagens(novo);
  }

  useEffect(() => {
    if (imagens.length > max) setImagens(imagens.slice(0, max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max]);

  return (
    <div className={className ?? "space-y-3"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{L.title}</span>
          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200">
            {imagens.length}/{max}
          </span>
        </div>
      </div>

      {/* Botão / Drop */}
      {!limiteAtingido ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-3">
          <UploadButton<OurFileRouter, EndpointName>
            endpoint={endpoint}
            onBeforeUploadBegin={(files) =>
              files.slice(0, Math.max(0, max - imagens.length))
            }
            onUploadProgress={() => setIsUploading(true)}
            onClientUploadComplete={(res) => {
              setIsUploading(false);
              if (res?.length) {
                const urls = res.map((f) => f.url);
                const unique = Array.from(new Set([...imagens, ...urls])).slice(
                  0,
                  max,
                );
                setImagens(unique);
              }
            }}
            onUploadError={(error) => {
              setIsUploading(false);
              const msg = error?.message?.includes("No file route found")
                ? L.errorRoute
                : error?.message || L.errorGeneric;
              alert("Erro ao enviar imagem: " + msg);
            }}
            appearance={{
              button:
                "ut-ready:bg-blue-600 ut-ready:hover:bg-blue-700 ut-uploading:bg-gray-400 px-4 py-2 rounded-md font-semibold text-white",
              container: "flex flex-col items-start",
              allowedContent:
                "text-xs text-slate-500 mt-1", // legenda do uploadthing
            }}
            // Força rótulos PT-BR no botão (APIs novas do uploadthing aceitam `content`)
            
            content={{
              button: L.button,
            }}
          />
          <p className="text-xs text-slate-500 mt-2">{L.helper}</p>
        </div>
      ) : (
        <p className="text-sm text-red-500">
          {L.limitReached.replace("{max}", String(max))}
        </p>
      )}

      {/* Contador/Status */}
      <div className="text-xs text-slate-500">
        {isUploading
          ? L.uploading
          : L.counter.replace("{restantes}", String(restantes))}
      </div>

      {/* Grade de imagens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {imagens.map((url, i) => (
          <div
            key={url + i}
            className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm"
          >
            <img
              src={url}
              alt={`Imagem ${i + 1}`}
              className={[
                "w-full h-28 object-cover",
                circular ? "rounded-full" : "",
              ].join(" ")}
            />

            <div className="absolute inset-x-0 top-0 p-1.5 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
              {enableReorder && (
                <>
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    className="bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 text-xs font-semibold shadow-sm"
                    title={L.moveLeft}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    className="bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 text-xs font-semibold shadow-sm"
                    title={L.moveRight}
                  >
                    ▶
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => remover(i)}
                className="bg-white/90 hover:bg-white text-red-600 border border-red-200 rounded-md px-2 py-0.5 text-xs font-semibold shadow-sm"
                title={L.remove}
              >
                {L.remove}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

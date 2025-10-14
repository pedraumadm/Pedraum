// components/ImageUploader.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/uploadthing.config";

type EndpointName = Extract<keyof OurFileRouter, string>;

interface Props {
  imagens: string[];
  setImagens: (urls: string[]) => void;
  max?: number;
  circular?: boolean;
  endpoint?: EndpointName; // default: "imageUploader"
  className?: string;
  enableReorder?: boolean;
}

export default function ImageUploader({
  imagens,
  setImagens,
  max = 5,
  circular = false,
  endpoint = "imageUploader",
  className,
  enableReorder = true,
}: Props) {
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
      {!limiteAtingido ? (
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
              ? "Rota de upload não encontrada no backend. Confira o slug no ourFileRouter."
              : error.message || "Falha no upload.";
            alert("Erro ao enviar imagem: " + msg);
          }}
          appearance={{
            button:
              "ut-ready:bg-blue-600 ut-ready:hover:bg-blue-700 ut-uploading:bg-gray-400 px-4 py-2 rounded-md font-semibold text-white",
            container: "flex flex-col items-start",
          }}
        />
      ) : (
        <p className="text-sm text-red-500">
          Limite de {max} imagens atingido.
        </p>
      )}

      <div className="text-xs text-slate-500">
        {isUploading
          ? "Enviando..."
          : `Você pode adicionar até ${restantes} imagem(ns).`}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {imagens.map((url, i) => (
          <div key={url + i} className="relative group">
            <img
              src={url}
              alt={`Imagem ${i + 1}`}
              className={[
                "w-full h-28 object-cover border",
                circular ? "rounded-full" : "rounded-xl",
              ].join(" ")}
            />
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {enableReorder && (
                <>
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    className="bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 text-xs font-semibold"
                    title="Mover esq."
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    className="bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md px-2 py-0.5 text-xs font-semibold"
                    title="Mover dir."
                  >
                    ▶
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => remover(i)}
                className="bg-white/90 hover:bg-white text-red-600 border border-red-200 rounded-md px-2 py-0.5 text-xs font-semibold"
                title="Remover"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

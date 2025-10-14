"use client";
import Link from "next/link";
import { useState } from "react";
import InteresseModal from "./InteresseModal";

interface Props {
  id: string;
  nome: string;
  preco: number;
  imagens: string[];
  idVendedor?: string;
  categoria?: string;
  condicao?: string;
  ano?: string | number;
  estado?: string;
  localizacao?: string; // Ex: "Contagem, MG"
  destaque?: boolean; // Se for anúncio premium ou patrocinado
  descricaoCurta?: string;
  marca?: string;
  modelo?: string;
}

export default function MachineCard({
  id,
  nome,
  preco,
  imagens,
  categoria,
  condicao,
  ano,
  estado,
  localizacao,
  destaque,
  descricaoCurta,
  marca,
  modelo,
}: Props) {
  // Para possível modal de interesse no futuro
  const [showModal, setShowModal] = useState(false);

  return (
    <div
      className={`
        group flex flex-col justify-between rounded-2xl bg-white
        shadow-[0_4px_24px_0_rgba(33,50,89,0.06)]
        border ${destaque ? "border-[#FB8500]" : "border-[#f1f1f3]"}
        hover:border-orange-500 hover:shadow-lg transition-all duration-200
        min-w-[230px] max-w-[270px] w-full mx-auto
        relative
      `}
      style={{
        textDecoration: "none",
        minHeight: 350,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Destaque/Premium */}
      {destaque && (
        <span className="absolute top-3 right-3 bg-[#FB8500] text-white text-xs font-bold px-3 py-1 rounded-xl z-20 shadow animate-pulse select-none">
          PREMIUM
        </span>
      )}

      {/* Imagem */}
      <Link href={`/machines/${id}`}>
        <div className="w-full aspect-square flex items-center justify-center overflow-hidden rounded-t-2xl bg-[#f6f8fa] border-b">
          <img
            src={imagens && imagens[0] ? imagens[0] : "/no-image.jpg"}
            alt={nome}
            className="object-contain w-full h-full p-5 group-hover:scale-105 transition-transform"
            draggable={false}
            loading="lazy"
            style={{
              minHeight: 120,
              maxHeight: 180,
              borderRadius: "1rem 1rem 0 0",
            }}
          />
        </div>
      </Link>

      {/* Conteúdo */}
      <div className="flex flex-col gap-1 px-5 py-3 flex-1">
        {/* Nome e categoria */}
        <div className="flex items-center gap-2 mb-1">
          <h3
            className="font-bold text-[#23272f] text-[1.06rem] truncate flex-1"
            title={nome}
          >
            {nome}
          </h3>
          {categoria && (
            <span className="text-xs bg-[#e6eef8] text-[#023047] rounded px-2 py-0.5 font-semibold uppercase tracking-wide">
              {categoria}
            </span>
          )}
        </div>

        {/* Marca/modelo/ano */}
        <div className="flex flex-wrap gap-2 mb-1 text-xs text-gray-600">
          {marca && (
            <span>
              <b>Marca:</b> {marca}
            </span>
          )}
          {modelo && (
            <span>
              <b>Modelo:</b> {modelo}
            </span>
          )}
          {ano && (
            <span>
              <b>Ano:</b> {ano}
            </span>
          )}
          {condicao && <span className="capitalize">{condicao}</span>}
        </div>

        {/* Localização */}
        {localizacao || estado ? (
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
            <span>
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                className="inline mr-1 -mt-1"
              >
                <path
                  d="M12 2C7.05 2 3 6.04 3 10.96c0 2.45 1.28 5.31 3.83 8.5 1.25 1.58 2.48 2.84 3.38 3.7.4.37 1.02.37 1.42 0 .9-.86 2.13-2.12 3.38-3.7C19.72 16.27 21 13.41 21 10.96 21 6.04 16.95 2 12 2Zm0 14a4 4 0 100-8 4 4 0 000 8Z"
                  fill="#FB8500"
                />
              </svg>
              {localizacao || estado}
            </span>
          </div>
        ) : null}

        {/* Descrição curta */}
        {descricaoCurta && (
          <div className="text-xs text-gray-700 mb-1 line-clamp-2">
            {descricaoCurta}
          </div>
        )}

        {/* Preço */}
        <span className="text-lg font-extrabold text-[#23272f] mb-1">
          {preco
            ? `R$ ${Number(preco).toLocaleString("pt-BR")}`
            : "A Consultar"}
        </span>

        {/* Botão de detalhes */}
        <Link
          href={`/machines/${id}`}
          className="inline-block mt-2 text-[0.99rem] font-semibold text-[#FB8500] hover:underline transition self-start"
          tabIndex={-1}
        >
          Ver detalhes →
        </Link>
      </div>
    </div>
  );
}

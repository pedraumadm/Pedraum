// =============================
// app/favoritos/page.tsx (Favoritos - Moderno, Responsivo, por Tipo)
// =============================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Loader2,
  Star,
  Wrench,
  HelpCircle,
  Building2,
} from "lucide-react";

// Tipos genéricos para favoritos de diferentes coleções
interface Machine {
  id: string;
  nome: string;
  preco?: string;
  imagens?: string[] | string;
}
interface Service {
  id: string;
  titulo: string;
  preco?: string;
}
interface Demanda {
  id: string;
  titulo: string;
}

type Favorito =
  | { tipo: "machine"; data: Machine }
  | { tipo: "service"; data: Service }
  | { tipo: "demanda"; data: Demanda };

export default function FavoritosPage() {
  // Mock de favoritos (substitua pela busca real do usuário depois)
  const [favoritos, setFavoritos] = useState<Favorito[] | null>(null);

  useEffect(() => {
    // Simule fetch do Firestore (substituir pelo fetch real)
    setTimeout(() => {
      setFavoritos([
        {
          tipo: "machine",
          data: {
            id: "1",
            nome: "Britadeira X10",
            preco: "89.000",
            imagens: ["/img-placeholder.png"],
          },
        },
        {
          tipo: "service",
          data: {
            id: "2",
            titulo: "Manutenção Preventiva em Máquinas Pesadas",
            preco: "A combinar",
          },
        },
        {
          tipo: "demanda",
          data: {
            id: "3",
            titulo: "Procuro locação de escavadeira em MG",
          },
        },
      ]);
    }, 1000);
  }, []);

  function handleRemove(id: string, tipo: string) {
    setFavoritos((old) =>
      old ? old.filter((f) => !(f.tipo === tipo && f.data.id === id)) : old,
    );
  }

  if (!favoritos)
    return (
      <div className="flex justify-center py-28 text-blue-700 animate-pulse">
        <Loader2 className="animate-spin mr-2" />
        Carregando favoritos...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto py-10 px-2 sm:px-6">
      <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-8 flex items-center gap-2">
        <Heart className="text-orange-500" size={32} /> Meus Favoritos
      </h1>
      {favoritos.length === 0 ? (
        <div className="text-center text-gray-500 py-24 text-lg">
          Você ainda não favoritou nenhum item.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {favoritos.map((fav, idx) => (
            <div
              key={fav.tipo + fav.data.id}
              className="flex items-center bg-white rounded-2xl shadow border border-gray-100 p-4 gap-5 hover:shadow-lg transition-all"
            >
              {/* Ícone/tipo */}
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-50 shrink-0">
                {fav.tipo === "machine" && (
                  <Building2 className="text-blue-600" size={26} />
                )}
                {fav.tipo === "service" && (
                  <Wrench className="text-orange-600" size={26} />
                )}
                {fav.tipo === "demanda" && (
                  <HelpCircle className="text-blue-500" size={26} />
                )}
              </div>
              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base md:text-xl text-blue-900 line-clamp-1">
                    {fav.tipo === "machine" && (fav.data as Machine).nome}
                    {fav.tipo === "service" && (fav.data as Service).titulo}
                    {fav.tipo === "demanda" && (fav.data as Demanda).titulo}
                  </span>
                  {fav.tipo === "machine" && (
                    <span className="px-2 py-0.5 text-xs rounded bg-orange-50 text-orange-700 font-semibold ml-2">
                      Máquina
                    </span>
                  )}
                  {fav.tipo === "service" && (
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-semibold ml-2">
                      Serviço
                    </span>
                  )}
                  {fav.tipo === "demanda" && (
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-semibold ml-2">
                      Demanda
                    </span>
                  )}
                </div>
                {/* Descrição/preço se existir */}
                {fav.tipo === "machine" && (
                  <span className="text-orange-600 font-bold block mt-0.5">
                    R$ {(fav.data as Machine).preco}
                  </span>
                )}
                {fav.tipo === "service" && (
                  <span className="text-gray-500 font-medium block mt-0.5">
                    {(fav.data as Service).preco}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {/* Link para detalhes */}
                {fav.tipo === "machine" && (
                  <Link
                    href={`/machines/${fav.data.id}`}
                    className="px-3 py-1.5 rounded-xl bg-blue-500 text-white font-semibold text-xs hover:bg-blue-700"
                  >
                    Ver Anúncio
                  </Link>
                )}
                {fav.tipo === "service" && (
                  <Link
                    href={`/services/${fav.data.id}`}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-semibold text-xs hover:bg-orange-600"
                  >
                    Ver Serviço
                  </Link>
                )}
                {fav.tipo === "demanda" && (
                  <Link
                    href={`/demandas/${fav.data.id}`}
                    className="px-3 py-1.5 rounded-xl bg-blue-100 text-blue-800 font-semibold text-xs hover:bg-blue-200"
                  >
                    Ver Demanda
                  </Link>
                )}
                <button
                  onClick={() => handleRemove(fav.data.id, fav.tipo)}
                  className="px-2 py-1 rounded-xl bg-red-50 text-red-500 font-bold text-xs hover:bg-red-100 mt-2"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

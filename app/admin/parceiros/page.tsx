"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface Parceiro {
  id: string;
  nome: string;
  descricao: string;
  logo: string;
  site?: string;
  premium?: boolean;
}

export default function AdminParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarParceiros() {
      try {
        const q = query(collection(db, "parceiros"), orderBy("nome", "asc"));
        const snapshot = await getDocs(q);
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Parceiro[];
        setParceiros(dados);
      } catch (error) {
        console.error("Erro ao buscar parceiros:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarParceiros();
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="px-4 py-10 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Parceiros Cadastrados
        </h1>

        {loading ? (
          <p className="text-gray-600">Carregando parceiros...</p>
        ) : parceiros.length === 0 ? (
          <p className="text-gray-600">Nenhum parceiro encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {parceiros.map((p) => (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl p-4 shadow text-center ${
                  p.premium
                    ? "border-yellow-500 ring-2 ring-yellow-300 bg-yellow-50"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={p.logo}
                  alt={p.nome}
                  className="w-20 h-20 object-contain mx-auto mb-3"
                />
                <h3 className="font-bold text-lg text-[#023047]">{p.nome}</h3>
                <p className="text-sm text-gray-600 mb-2">{p.descricao}</p>
                {p.site && (
                  <a
                    href={p.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Visitar site
                  </a>
                )}
                {p.premium && (
                  <span className="block mt-2 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                    Parceiro Premium ⭐
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

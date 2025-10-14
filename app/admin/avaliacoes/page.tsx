"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Star } from "lucide-react";

interface Avaliacao {
  id: string;
  nome: string;
  comentario: string;
  estrelas: number;
  createdAt?: any;
}

export default function AvaliacoesAdminPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarAvaliacoes() {
      try {
        const avaliacoesQuery = query(
          collection(db, "avaliacoes"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(avaliacoesQuery);
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Avaliacao[];
        setAvaliacoes(dados);
      } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarAvaliacoes();
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Avaliações Recebidas
        </h1>

        {loading ? (
          <p className="text-gray-600">Carregando avaliações...</p>
        ) : avaliacoes.length === 0 ? (
          <p className="text-gray-600">Nenhuma avaliação encontrada.</p>
        ) : (
          <ul className="space-y-4">
            {avaliacoes.map((a) => (
              <li key={a.id} className="bg-white border rounded-xl p-6 shadow">
                <div className="flex items-center mb-2">
                  {[...Array(a.estrelas)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="text-yellow-500 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-800 mb-2 italic">
                  "{a.comentario}"
                </p>
                <p className="text-xs text-gray-500 text-right">– {a.nome}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

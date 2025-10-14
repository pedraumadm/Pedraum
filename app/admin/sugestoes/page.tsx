"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface Sugestao {
  id: string;
  nome?: string;
  mensagem: string;
  createdAt?: any;
}

export default function SugestoesAdminPage() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarSugestoes() {
      try {
        const sugestoesQuery = query(
          collection(db, "sugestoes"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(sugestoesQuery);
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Sugestao[];
        setSugestoes(dados);
      } catch (error) {
        console.error("Erro ao buscar sugestões:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarSugestoes();
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Sugestões Enviadas
        </h1>

        {loading ? (
          <p className="text-gray-600">Carregando sugestões...</p>
        ) : sugestoes.length === 0 ? (
          <p className="text-gray-600">Nenhuma sugestão encontrada.</p>
        ) : (
          <ul className="space-y-4">
            {sugestoes.map((s) => (
              <li key={s.id} className="bg-white border rounded-xl p-6 shadow">
                <p className="text-sm text-gray-800 mb-2 italic">
                  "{s.mensagem}"
                </p>
                <p className="text-xs text-gray-500 text-right">
                  Enviado por: {s.nome || "Anônimo"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

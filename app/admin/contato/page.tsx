"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

interface Mensagem {
  id: string;
  nome?: string;
  email?: string;
  mensagem: string;
  createdAt?: any;
}

export default function AdminContatoPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMensagens() {
      try {
        const q = query(
          collection(db, "mensagensContato"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Mensagem[];
        setMensagens(dados);
      } catch (error) {
        console.error("Erro ao buscar mensagens:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarMensagens();
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Mensagens de Contato
        </h1>

        {loading ? (
          <p className="text-gray-600">Carregando mensagens...</p>
        ) : mensagens.length === 0 ? (
          <p className="text-gray-600">Nenhuma mensagem encontrada.</p>
        ) : (
          <ul className="space-y-4">
            {mensagens.map((m) => (
              <li key={m.id} className="bg-white border rounded-xl p-6 shadow">
                <p className="text-sm text-gray-800 mb-2 italic">
                  "{m.mensagem}"
                </p>
                <p className="text-xs text-gray-500">
                  {m.nome || "Anônimo"} — {m.email || "Sem e-mail"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

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

export default function MensagensPage() {
  const [contatos, setContatos] = useState<Mensagem[]>([]);
  const [sugestoes, setSugestoes] = useState<Mensagem[]>([]);

  useEffect(() => {
    async function carregarMensagens() {
      const contatosSnap = await getDocs(
        query(collection(db, "mensagensContato"), orderBy("createdAt", "desc")),
      );
      const sugestoesSnap = await getDocs(
        query(collection(db, "sugestoes"), orderBy("createdAt", "desc")),
      );

      setContatos(
        contatosSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Mensagem[],
      );
      setSugestoes(
        sugestoesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Mensagem[],
      );
    }

    carregarMensagens();
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        <h1 className="text-3xl font-bold text-[#023047]">
          Mensagens Recebidas
        </h1>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-[#023047]">
            Formulário de Contato
          </h2>
          {contatos.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma mensagem ainda.</p>
          ) : (
            <ul className="space-y-4">
              {contatos.map((msg) => (
                <li
                  key={msg.id}
                  className="border rounded-xl p-4 bg-white shadow"
                >
                  <p className="text-sm text-gray-800 italic mb-1">
                    "{msg.mensagem}"
                  </p>
                  <p className="text-xs text-gray-600">
                    Nome: {msg.nome || "Anônimo"}
                  </p>
                  <p className="text-xs text-gray-600">
                    Email: {msg.email || "Não informado"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-[#023047]">
            Sugestões de Melhoria
          </h2>
          {sugestoes.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma sugestão ainda.</p>
          ) : (
            <ul className="space-y-4">
              {sugestoes.map((msg) => (
                <li
                  key={msg.id}
                  className="border rounded-xl p-4 bg-white shadow"
                >
                  <p className="text-sm text-gray-800 italic mb-1">
                    "{msg.mensagem}"
                  </p>
                  <p className="text-xs text-gray-600">
                    Nome: {msg.nome || "Anônimo"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </LayoutWithSidebar>
  );
}

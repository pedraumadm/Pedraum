"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function ConfiguracoesAdminPage() {
  const { register, handleSubmit, reset } = useForm();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarConfig() {
      try {
        const docRef = doc(db, "sistema", "configuracoes");
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          reset(snapshot.data());
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarConfig();
  }, [reset]);

  const onSubmit = async (data: any) => {
    try {
      await setDoc(doc(db, "sistema", "configuracoes"), {
        ...data,
        atualizadoEm: serverTimestamp(),
      });
      setSuccess(true);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Configurações do Sistema
        </h1>

        {loading ? (
          <p className="text-gray-600">Carregando...</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              type="text"
              placeholder="Nome da plataforma"
              {...register("nome")}
              className="w-full border border-gray-300 rounded-xl px-4 py-2"
            />
            <textarea
              placeholder="Descrição institucional"
              {...register("descricao")}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-2"
            />
            <input
              type="text"
              placeholder="WhatsApp de contato"
              {...register("whatsapp")}
              className="w-full border border-gray-300 rounded-xl px-4 py-2"
            />
            <input
              type="email"
              placeholder="E-mail de suporte"
              {...register("email")}
              className="w-full border border-gray-300 rounded-xl px-4 py-2"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition"
            >
              Salvar
            </button>
            {success && (
              <p className="text-green-600 text-sm">
                Configurações salvas com sucesso!
              </p>
            )}
          </form>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

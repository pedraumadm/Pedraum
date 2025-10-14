"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function EnviarNotificacaoPage() {
  const { register, handleSubmit, reset } = useForm();
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, "notificacoes"), {
        ...data,
        lida: false,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      reset();
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Enviar Notificação
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            type="text"
            placeholder="Título"
            {...register("titulo", { required: true })}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <textarea
            placeholder="Mensagem"
            {...register("mensagem", { required: true })}
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            Enviar
          </button>
          {success && (
            <p className="text-green-600 text-sm">
              Notificação enviada com sucesso!
            </p>
          )}
        </form>
      </div>
    </LayoutWithSidebar>
  );
}

"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function CadastrarParceiroPage() {
  const { register, handleSubmit, reset } = useForm();
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, "parceiros"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      reset();
    } catch (error) {
      console.error("Erro ao cadastrar parceiro:", error);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Cadastrar Parceiro
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            type="text"
            placeholder="Nome da empresa"
            {...register("nome", { required: true })}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <textarea
            placeholder="Descrição do parceiro"
            {...register("descricao", { required: true })}
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <input
            type="text"
            placeholder="Link do site (opcional)"
            {...register("site")}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <input
            type="text"
            placeholder="URL do logo (temporário)"
            {...register("logo", { required: true })}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            Cadastrar
          </button>
          {success && (
            <p className="text-green-600 text-sm">
              Parceiro cadastrado com sucesso!
            </p>
          )}
        </form>
      </div>
    </LayoutWithSidebar>
  );
}

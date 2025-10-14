"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function CadastrarAvaliacaoPage() {
  const { register, handleSubmit, reset } = useForm();
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, "avaliacoes"), {
        ...data,
        estrelas: Number(data.estrelas),
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      reset();
    } catch (error) {
      console.error("Erro ao cadastrar avaliação:", error);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Cadastrar Avaliação
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input
            type="text"
            placeholder="Nome do avaliador"
            {...register("nome", { required: true })}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <textarea
            placeholder="Comentário"
            {...register("comentario", { required: true })}
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          />
          <select
            {...register("estrelas", { required: true })}
            className="w-full border border-gray-300 rounded-xl px-4 py-2"
          >
            <option value="">Nota (1 a 5 estrelas)</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} estrela{n > 1 && "s"}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition"
          >
            Cadastrar
          </button>
          {success && (
            <p className="text-green-600 text-sm">
              Avaliação cadastrada com sucesso!
            </p>
          )}
        </form>
      </div>
    </LayoutWithSidebar>
  );
}

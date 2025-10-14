// =============================
// app/admin/create-demand/page.tsx
// =============================

"use client";

import { useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";

export default function CreateDemandPage() {
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    try {
      await addDoc(collection(db, "demandas"), {
        categoria,
        descricao,
        createdAt: serverTimestamp(),
      });
      setSuccess("Demanda cadastrada com sucesso!");
      setCategoria("");
      setDescricao("");
    } catch (err) {
      setError("Erro ao cadastrar demanda. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8">
        <h2 className="text-2xl font-bold text-[#023047] mb-6">
          Cadastrar Nova Demanda
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none"
              placeholder="Ex: Britagem, Transporte, Equipamento..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none"
              placeholder="Detalhe o que está sendo procurado"
            />
          </div>

          {success && <p className="text-green-600 text-sm">{success}</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FB8500] hover:bg-[#FFB703] transition-colors text-white font-semibold py-2 px-4 rounded-xl"
          >
            {loading ? "Salvando..." : "Cadastrar Demanda"}
          </button>
        </form>
      </div>
    </LayoutWithSidebar>
  );
}

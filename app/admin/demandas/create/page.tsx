// =============================
// app/admin/demandas/create/page.tsx — Criar Nova Demanda (ADMIN)
// =============================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

function CriarDemandaAdmin() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [userId, setUserId] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      await addDoc(collection(db, "demandas"), {
        titulo,
        categoria,
        descricao,
        userId,
        nomeUsuario,
        status: "ativa",
        createdAt: serverTimestamp(),
      });
      router.push("/admin/demandas");
    } catch (err: any) {
      setErro(err.message || "Erro ao criar demanda");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f9fa] flex flex-col items-center py-8 px-2">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-5">
          <ClipboardList size={32} className="text-[#FB8500]" />
          <h1 className="text-2xl font-bold text-[#023047]">Nova Demanda</h1>
        </div>
        <form onSubmit={handleCriar} className="space-y-5">
          <div>
            <label className="block font-semibold text-[#023047] mb-1">
              Título
            </label>
            <input
              type="text"
              required
              className="input"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">
              Categoria
            </label>
            <input
              type="text"
              required
              className="input"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">
              Descrição
            </label>
            <textarea
              required
              className="input min-h-[80px]"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">
              ID do Criador (userId)
            </label>
            <input
              type="text"
              className="input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Opcional, vincula demanda a um usuário"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#023047] mb-1">
              Nome do Criador
            </label>
            <input
              type="text"
              className="input"
              value={nomeUsuario}
              onChange={(e) => setNomeUsuario(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          {erro && (
            <div className="text-red-600 bg-red-50 rounded p-2 text-sm">
              {erro}
            </div>
          )}
          <div className="flex gap-2 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#FB8500] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-[#ff9800]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : null}
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <Link
              href="/admin/demandas"
              className="ml-2 bg-gray-200 text-gray-600 px-8 py-3 rounded-full font-bold hover:bg-gray-300"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default withRoleProtection(CriarDemandaAdmin, { allowed: ["admin"] });

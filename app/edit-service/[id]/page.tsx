// =============================
// app/edit-service/[id]/page.tsx (Editar Serviço - Moderno, Responsivo)
// =============================

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";

interface Service {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  preco?: string;
  prestador?: string;
  estado?: string;
}

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchService();
    // eslint-disable-next-line
  }, [id]);

  async function fetchService() {
    setLoading(true);
    const ref = doc(db, "services", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setService({ id, ...snap.data() } as Service);
    } else {
      setService(null);
    }
    setLoading(false);
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    if (!service) return;
    setService({ ...service, [e.target.name]: e.target.value });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!service) return;
    setSaving(true);
    const { titulo, descricao, categoria, preco, prestador, estado } = service;
    await updateDoc(doc(db, "services", id), {
      titulo,
      descricao,
      categoria,
      preco,
      prestador,
      estado,
    });
    setSaving(false);
    router.push("/services");
  }

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[300px] text-blue-700 animate-pulse">
        <Loader2 className="animate-spin mr-2" />
        Carregando...
      </div>
    );
  if (!service)
    return (
      <div className="text-center text-red-600 py-12">
        Serviço não encontrado.
      </div>
    );

  return (
    <div className="max-w-lg mx-auto py-8 px-2 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 text-blue-700"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">
          Editar Serviço
        </h1>
      </div>
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-md px-3 sm:px-6 py-6 space-y-4"
      >
        <div>
          <label className="block font-bold text-blue-800 mb-1">
            Título do Serviço
          </label>
          <input
            name="titulo"
            value={service.titulo}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />
        </div>
        <div>
          <label className="block font-bold text-blue-800 mb-1">
            Descrição
          </label>
          <textarea
            name="descricao"
            value={service.descricao ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 min-h-[80px] focus:ring-2 focus:ring-blue-100 outline-none"
            required
          />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Categoria
            </label>
            <input
              name="categoria"
              value={service.categoria ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Estado (UF)
            </label>
            <input
              name="estado"
              value={service.estado ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Prestador
            </label>
            <input
              name="prestador"
              value={service.prestador ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Preço (opcional)
            </label>
            <input
              name="preco"
              value={service.preco ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-100 outline-none"
              type="number"
              min={0}
              placeholder="R$"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 transition-all shadow disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="animate-spin inline-block mr-2" />
            ) : null}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}

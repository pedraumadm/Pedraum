// =============================
// app/edit-machine/[id]/page.tsx (Editar Máquina - Moderno, Responsivo, Mobile-First)
// =============================

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Eye, ArrowLeft, UploadCloud, Loader2 } from "lucide-react";
import Link from "next/link";

interface Machine {
  id: string;
  nome: string;
  preco: string;
  imagens?: string[] | string;
  descricao?: string;
  categoria?: string;
  estado?: string;
  situacao?: string;
}

export default function EditMachinePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagens, setImagens] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMachine();
    // eslint-disable-next-line
  }, [id]);

  async function fetchMachine() {
    setLoading(true);
    const ref = doc(db, "machines", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Machine;
      setMachine({ ...data, id });
      setImagens(
        Array.isArray(data.imagens)
          ? data.imagens
          : data.imagens
            ? [data.imagens]
            : [],
      );
    } else {
      setMachine(null);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (!machine) return;
    const { nome, preco, descricao, categoria, estado, situacao } = machine;
    await updateDoc(doc(db, "machines", id), {
      nome,
      preco,
      descricao,
      categoria,
      estado,
      situacao,
      imagens,
    });
    setSaving(false);
    router.push("/machines");
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    if (!machine) return;
    setMachine({ ...machine, [e.target.name]: e.target.value });
  }

  function handleImageChange(index: number, url: string) {
    const newImgs = [...imagens];
    newImgs[index] = url;
    setImagens(newImgs);
  }
  function handleImageRemove(index: number) {
    setImagens(imagens.filter((_, i) => i !== index));
  }

  // Fake upload handler (placeholder)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    setUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      const newUrl = URL.createObjectURL(e.target.files![0]);
      setImagens([...imagens, newUrl]);
      setUploading(false);
    }, 1000);
  }

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[300px] text-blue-700 animate-pulse">
        <Loader2 className="animate-spin mr-2" />
        Carregando...
      </div>
    );
  if (!machine)
    return (
      <div className="text-center text-red-600 py-12">
        Máquina não encontrada.
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto py-7 px-2 sm:px-4">
      <div className="mb-6 flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 text-blue-700"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">
          Editar Máquina
        </h1>
      </div>
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-md px-3 sm:px-6 py-5 sm:py-7 space-y-4"
      >
        {/* Nome */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Nome</label>
          <input
            name="nome"
            value={machine.nome}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />
        </div>
        {/* Preço */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Preço</label>
          <input
            name="preco"
            value={machine.preco}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-lg focus:ring-2 focus:ring-orange-200 outline-none"
            required
            type="number"
            min={0}
          />
        </div>
        {/* Descrição */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">
            Descrição
          </label>
          <textarea
            name="descricao"
            value={machine.descricao ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 min-h-[80px] focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        {/* Categoria, Estado, Situação */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Categoria
            </label>
            <input
              name="categoria"
              value={machine.categoria ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Estado (UF)
            </label>
            <input
              name="estado"
              value={machine.estado ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block font-bold text-blue-800 mb-1">
              Situação
            </label>
            <select
              name="situacao"
              value={machine.situacao ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Selecione...</option>
              <option value="Nova">Nova</option>
              <option value="Usada">Usada</option>
              <option value="Seminova">Seminova</option>
            </select>
          </div>
        </div>
        {/* Imagens */}
        <div>
          <label className="block font-bold text-blue-800 mb-1">Imagens</label>
          <div className="flex gap-2 flex-nowrap overflow-x-auto pb-2 max-w-full">
            {imagens.map((img, idx) => (
              <div key={idx} className="relative group flex-shrink-0">
                <img
                  src={img}
                  alt={`img${idx}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow hover:bg-red-600"
                  onClick={() => handleImageRemove(idx)}
                >
                  ×
                </button>
              </div>
            ))}
            {/* Botão de adicionar imagem */}
            <label className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-blue-300 rounded-lg flex flex-col items-center justify-center text-blue-400 hover:border-blue-500 hover:text-blue-600 transition-colors cursor-pointer flex-shrink-0 relative">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="animate-spin" size={26} />
              ) : (
                <UploadCloud size={28} />
              )}
              <span className="text-xs font-semibold">Adicionar</span>
            </label>
          </div>
          <span className="text-xs text-gray-400">
            (Máximo: 5 imagens. Arraste para o lado para ver todas no mobile)
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push("/machines")}
            className="px-4 py-2 rounded-xl bg-gray-200 text-blue-800 font-bold hover:bg-gray-300 transition-all w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 transition-all shadow disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto"
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

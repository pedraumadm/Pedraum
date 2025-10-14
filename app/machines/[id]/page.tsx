"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ArrowLeft, Mail, X } from "lucide-react";

// Tipos de dados
interface Machine {
  id: string;
  nome: string;
  preco: string;
  descricao: string;
  imagens: string[];
  userId: string; // vendedor
  createdAt?: any;
  nomeAnunciante?: string;
  estado?: string;
  ano?: string;
  condicao?: string;
  categoria?: string;
  [key: string]: any;
}

export default function MachineDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    empresa: "",
    endereco: "",
    email: "",
    mensagem: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notLogged, setNotLogged] = useState(false);

  // Checar usuário logado com Firebase Auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setNotLogged(!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMachine = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "machines", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setMachine({ id: snap.id, ...snap.data() } as Machine);
        } else {
          setMachine(null);
        }
      } catch {
        setMachine(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMachine();
  }, [id]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");
    setSuccess(false);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para solicitar contato.");
      setFormLoading(false);
      return;
    }

    if (
      !form.nome ||
      !form.telefone ||
      !form.empresa ||
      !form.endereco ||
      !form.email
    ) {
      setError("Preencha todos os campos obrigatórios.");
      setFormLoading(false);
      return;
    }
    try {
      await addDoc(collection(db, "leads"), {
        ...form,
        createdAt: serverTimestamp(),
        machineId: id,
        machineNome: machine?.nome,
        vendedorId: machine?.userId || "",
        compradorId: user.uid,
        status: "novo",
        statusPagamento: "pendente",
        valorLead: 19.9,
        metodoPagamento: "mercado_pago",
        paymentLink: "",
        pagoEm: "",
        liberadoEm: "",
        idTransacao: "",
        isTest: false,
        imagens: machine?.imagens || [],
      });
      setSuccess(true);
      setForm({
        nome: "",
        telefone: "",
        empresa: "",
        endereco: "",
        email: "",
        mensagem: "",
      });
      setShowForm(false);
    } catch {
      setError("Erro ao enviar. Tente novamente.");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="text-blue-700 animate-pulse">
          Carregando detalhes...
        </span>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <span className="text-gray-400">Máquina não encontrada.</span>
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          onClick={() => router.back()}
        >
          <ArrowLeft size={18} className="inline mr-2" /> Voltar
        </button>
      </div>
    );
  }

  const detalhes = [
    { label: "Ano", value: machine.ano },
    { label: "Condição", value: machine.condicao },
    { label: "Categoria", value: machine.categoria },
    { label: "Estado", value: machine.estado },
    {
      label: "Publicado em",
      value: machine.createdAt
        ? machine.createdAt.seconds
          ? new Date(machine.createdAt.seconds * 1000).toLocaleDateString()
          : machine.createdAt
        : "---",
    },
    {
      label: "Anunciante",
      value: machine.nome || machine.nomeAnunciante || "---",
    },
    {
      label: "Localização",
      value: machine.estado || machine.localizacao || "---",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 py-10">
      {/* Modal de sucesso */}
      {success && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center">
            <span className="text-2xl text-green-700 font-bold mb-2">
              Lead enviado com sucesso!
            </span>
            <button
              onClick={() => setSuccess(false)}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      <button
        className="flex items-center gap-2 mb-6 text-blue-700 hover:underline text-sm"
        onClick={() => router.back()}
      >
        <ArrowLeft size={18} /> Voltar para listagem
      </button>
      <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col md:flex-row gap-10">
        {/* Imagem principal e miniaturas */}
        <div className="md:w-1/2 w-full flex flex-col items-center">
          <div
            className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ maxWidth: 420 }}
          >
            <img
              src={machine.imagens?.[imgIndex] || "/img-placeholder.png"}
              alt={machine.nome}
              className="object-contain w-full h-full max-h-80"
            />
          </div>
          {machine.imagens && machine.imagens.length > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              {machine.imagens.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setImgIndex(idx)}
                  className={`w-12 h-12 rounded-lg border-2 ${idx === imgIndex ? "border-orange-500" : "border-gray-200"} bg-gray-50 overflow-hidden p-1 transition-all`}
                >
                  <img
                    src={img}
                    alt={machine.nome + " miniatura"}
                    className="object-contain w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Infos OU Formulário */}
        <div className="md:w-1/2 w-full flex flex-col justify-between">
          {showForm ? (
            <form
              onSubmit={handleFormSubmit}
              className="bg-white rounded-2xl shadow-md p-4 sm:p-6 w-full flex flex-col gap-2 border border-orange-200 animate-fade-in"
              style={{ minWidth: 0 }}
            >
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="mb-4 self-end text-gray-400 hover:text-orange-600"
                title="Voltar para detalhes"
              >
                <X size={26} />
              </button>
              <h2 className="text-2xl font-extrabold text-orange-600 mb-6 tracking-tight">
                Solicitar Contato
              </h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-base font-semibold mb-1 text-gray-700">
                    Nome do responsável*
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={form.nome}
                    onChange={handleFormChange}
                    className="w-full rounded-xl bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 shadow-inner px-4 py-3 text-lg transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold mb-1 text-gray-700">
                    Telefone (WhatsApp)*
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleFormChange}
                    className="w-full rounded-xl bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 shadow-inner px-4 py-3 text-lg transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold mb-1 text-gray-700">
                    Nome da empresa ou residência*
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    value={form.empresa}
                    onChange={handleFormChange}
                    className="w-full rounded-xl bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 shadow-inner px-4 py-3 text-lg transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold mb-1 text-gray-700">
                    Endereço*
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={form.endereco}
                    onChange={handleFormChange}
                    className="w-full rounded-xl bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 shadow-inner px-4 py-3 text-lg transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold mb-1 text-gray-700">
                    E-mail para contato*
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    className="w-full rounded-xl bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 shadow-inner px-4 py-3 text-lg transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-semibold mb-1 text-gray-700">
                    Mensagem adicional
                  </label>
                  <textarea
                    name="mensagem"
                    value={form.mensagem}
                    onChange={handleFormChange}
                    className="w-full rounded-xl bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 shadow-inner px-4 py-3 text-lg min-h-[64px] resize-none transition-all outline-none"
                    maxLength={400}
                  />
                </div>
                {error && (
                  <span className="text-red-500 text-base font-semibold mt-2">
                    {error}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="mt-6 w-full flex items-center justify-center gap-3 px-8 py-3 rounded-xl border-2 border-orange-500 bg-orange-500 hover:bg-white hover:text-orange-600 hover:shadow-xl transition-all text-white text-lg font-bold shadow-lg hover:scale-[1.03] active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
              >
                {formLoading ? (
                  "Enviando..."
                ) : (
                  <>
                    <Mail size={22} className="opacity-90" /> Enviar contato
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {machine.nome}
              </h1>
              <span className="text-2xl font-bold text-blue-700 mb-4 block">
                R$ {machine.preco}
              </span>
              <h2 className="text-lg font-semibold mb-1 text-gray-700">
                Descrição
              </h2>
              <p className="text-gray-600 whitespace-pre-line mb-4 text-base">
                {machine.descricao}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-2">
                {detalhes.map((d, i) => (
                  <div key={i} className="text-xs text-gray-500 mb-1">
                    <span className="font-semibold text-gray-700">
                      {d.label}:
                    </span>{" "}
                    {d.value || "---"}
                  </div>
                ))}
              </div>
              {/* Botão para exibir o formulário */}
              <button
                onClick={() => {
                  if (notLogged) {
                    router.push("/auth/login");
                  } else {
                    setShowForm(true);
                  }
                }}
                className="mt-7 w-full max-w-xs flex items-center justify-center gap-3 px-8 py-3 rounded-xl border-2 border-orange-500 bg-orange-500 hover:bg-white hover:text-orange-600 hover:shadow-xl transition-all text-white text-lg font-bold shadow-lg hover:scale-[1.03] active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400 self-end"
                type="button"
              >
                <Mail size={22} className="opacity-90" />
                Entrar em contato
              </button>
              {notLogged && (
                <p className="text-orange-600 text-center mt-3 font-medium text-base">
                  Faça login para solicitar contato.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

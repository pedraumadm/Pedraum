"use client";

import type React from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import ImageUploader from "@/components/ImageUploader";
import dynamic from "next/dynamic";
import { useTaxonomia } from "@/hooks/useTaxonomia";

const PDFUploader = dynamic(() => import("@/components/PDFUploader"), {
  ssr: false,
});
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), {
  ssr: false,
});

import {
  Loader2,
  Save,
  Tag,
  DollarSign,
  Calendar,
  MapPin,
  BookOpen,
  Package,
  List,
  Layers,
  FileText,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

/* ===================== Constantes ===================== */
const condicoes = [
  "Novo com garantia",
  "Novo sem garantia",
  "Reformado com garantia",
  "Reformado",
  "No estado que se encontra",
];

const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

/* ===================== Tipos ===================== */
type Subcat = { nome: string; slug?: string; itens?: { nome: string }[] };
type Cat = { nome: string; slug?: string; subcategorias?: Subcat[] };

type Produto = {
  id?: string;
  tipo?: "produto" | string;
  nome: string;
  categoria: string;
  subcategoria: string;
  itemFinal?: string;
  categoriaPath?: string[];
  outraCategoriaTexto?: string | null;
  preco: number | null;
  estado: string;
  cidade: string;
  ano: number | null;
  condicao: string;
  descricao: string;
  imagens: string[];
  pdfUrl?: string | null;
  hasWarranty?: boolean;
  warrantyMonths?: number | null;
  userId?: string;
  status?: string;
  visivel?: boolean;
  createdAt?: any;
  expiraEm?: Timestamp;
  updatedAt?: any;
};

/* ===================== Utils ===================== */
function normalizePrice(str: string): number | null {
  if (!str) return null;
  const n = Number(str.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

/* ===================== Page Wrapper ===================== */
export default function EditProdutoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#023047]">Carregando…</div>}>
      <EditProdutoForm />
    </Suspense>
  );
}

/* ===================== Form Component ===================== */
function EditProdutoForm() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const { categorias, loading: taxLoading } = useTaxonomia() as {
    categorias: Cat[];
    loading: boolean;
  };

  const [loadingDoc, setLoadingDoc] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // imagens e PDF
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // form
  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    subcategoria: "",
    outraCategoriaTexto: "",
    preco: "",
    estado: "",
    cidade: "",
    ano: "",
    condicao: "",
    descricao: "",
    hasWarranty: false,
    warrantyMonths: "",
  });

  // cidades por UF (IBGE)
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  /* ====== Carrega produto ====== */
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!id) return;
        setLoadingDoc(true);
        setErro(null);

        const ref = doc(db, "produtos", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Produto não encontrado.");

        const data = snap.data() as Produto;

        const user = auth.currentUser;
        if (!user || (data.userId && data.userId !== user.uid)) {
          throw new Error(
            "Você não tem permissão para editar este produto."
          );
        }

        setImagens(Array.isArray(data.imagens) ? data.imagens : []);
        setPdfUrl(data.pdfUrl || null);

        const c1 = data.categoria || "";
        const c2 = data.subcategoria || "";
        const outraTexto =
          data.outraCategoriaTexto ??
          (c1 === "Outros" || c2 === "Outros" ? data.itemFinal ?? "" : "");

        setForm({
          nome: data.nome || "",
          categoria: c1,
          subcategoria: c2,
          outraCategoriaTexto: outraTexto || "",
          preco: data.preco != null ? String(data.preco) : "",
          estado: data.estado || "",
          cidade: data.cidade || "",
          ano: data.ano != null ? String(data.ano) : "",
          condicao: data.condicao || "",
          descricao: data.descricao || "",
          hasWarranty: !!data.hasWarranty,
          warrantyMonths:
            data.hasWarranty && data.warrantyMonths != null
              ? String(data.warrantyMonths)
              : "",
        });
      } catch (e: any) {
        if (active) setErro(e.message || "Erro ao carregar produto.");
      } finally {
        if (active) setLoadingDoc(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  /* ====== Opções por nível ====== */
  const catEhOutros = form.categoria === "Outros";
  const subcatEhOutros = form.subcategoria === "Outros";

  const categoriaSelecionada = useMemo(
    () => categorias.find((c) => c.nome === form.categoria),
    [categorias, form.categoria]
  );
  const subcategoriasDisponiveis: Subcat[] = useMemo(
    () => categoriaSelecionada?.subcategorias ?? [],
    [categoriaSelecionada]
  );

  /* ====== Handlers ====== */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value, type, checked } = e.target as any;

    if (name === "hasWarranty") {
      setForm((f) => ({
        ...f,
        hasWarranty: checked,
        warrantyMonths: checked ? f.warrantyMonths : "",
      }));
      return;
    }

    if (name === "condicao") {
      const v = value as string;
      const autoHas = v.includes("com garantia")
        ? true
        : v.includes("sem garantia")
        ? false
        : form.hasWarranty;
      setForm((f) => ({ ...f, condicao: v, hasWarranty: autoHas }));
      return;
    }

    if (name === "categoria") {
      setForm((f) => ({
        ...f,
        categoria: value,
        subcategoria: "",
        outraCategoriaTexto: "",
      }));
      return;
    }

    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  /* ====== IBGE cidades (inclui cidade atual se não vier da API) ====== */
  useEffect(() => {
    let abort = false;

    async function fetchCidades(uf: string) {
      if (!uf) {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as Array<{ nome: string }>;
        if (abort) return;

        const nomes = data
          .map((m) => m.nome)
          .sort((a, b) => a.localeCompare(b, "pt-BR"));
        if (form.cidade && !nomes.includes(form.cidade)) nomes.unshift(form.cidade);
        setCidades(nomes);
      } catch {
        if (!abort) {
          setCidades((prev) =>
            prev.length ? prev : form.cidade ? [form.cidade] : []
          );
        }
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }

    fetchCidades(form.estado);
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.estado]);

  /* ====== Submit (update) ====== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setSubmitting(true);

    try {
      const baseOk = !!(
        form.nome &&
        form.estado &&
        form.cidade &&
        form.descricao &&
        form.ano &&
        form.condicao
      );

      let taxOk = false;
      if (catEhOutros || subcatEhOutros) {
        taxOk = !!form.outraCategoriaTexto.trim();
      } else {
        taxOk = !!(form.categoria && form.subcategoria);
      }

      if (!(baseOk && taxOk)) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }
      if (imagens.length === 0) {
        throw new Error("Envie pelo menos uma imagem.");
      }
      if (form.hasWarranty) {
        const months = Number(form.warrantyMonths);
        if (!months || months <= 0) {
          throw new Error("Informe um prazo de garantia válido (em meses).");
        }
      }

      const resolvedItemFinal =
        catEhOutros || subcatEhOutros
          ? form.outraCategoriaTexto.trim()
          : form.subcategoria || form.categoria;

      const categoriaPath = catEhOutros
        ? ["Outros", resolvedItemFinal]
        : subcatEhOutros
        ? [form.categoria, "Outros"]
        : [form.categoria, form.subcategoria];

      const ref = doc(db, "produtos", id);
      await updateDoc(ref, {
        tipo: "produto",
        nome: form.nome,

        categoria: form.categoria || "Outros",
        subcategoria: subcatEhOutros
          ? "Outros"
          : form.subcategoria || (catEhOutros ? "—" : ""),
        itemFinal: resolvedItemFinal,
        categoriaPath,
        outraCategoriaTexto: form.outraCategoriaTexto.trim() || null,

        preco: normalizePrice(form.preco),
        estado: form.estado,
        cidade: form.cidade,
        ano: form.ano ? Number(form.ano) : null,
        condicao: form.condicao,
        descricao: form.descricao,
        imagens,
        pdfUrl: pdfUrl || null,
        hasWarranty: !!form.hasWarranty,
        warrantyMonths: form.hasWarranty
          ? Number(form.warrantyMonths)
          : null,

        updatedAt: serverTimestamp(),
      });

      setOk("Alterações salvas com sucesso!");
      setTimeout(() => router.push("/meus-produtos"), 900);
    } catch (e: any) {
      setErro(e.message || "Erro ao salvar alterações.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ====== Loading/Erro ====== */
  if (loadingDoc || taxLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin mb-3" size={38} />
        <div className="text-lg font-bold text-[#219EBC]">
          Carregando produto…
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f8fbfd] p-6">
        <div className="max-w-xl w-full bg-white border border-[#e5eef6] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 text-[#7c2d12] font-extrabold mb-2">
            <AlertTriangle size={18} /> Não foi possível continuar
          </div>
          <p className="text-[#0f172a] font-semibold mb-4">{erro}</p>
          <Link
            href="/meus-produtos"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#219ebc] text-white font-extrabold"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
        </div>
      </main>
    );
  }

  /* ===================== UI ===================== */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      {/* 🔙 Voltar */}
      <div className="w-full max-w-5xl px-2 mb-3 flex">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
          style={{
            background: "linear-gradient(90deg,#e0e7ef,#f8fafc)",
            border: "1.5px solid #cfd8e3",
            color: "#023047",
          }}
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
          Voltar
        </button>
      </div>

      <section
        style={{
          maxWidth: 960,
          width: "100%",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 8px 40px rgba(2,48,71,0.08)",
          padding: "40px 2vw 48px 2vw",
          marginTop: 18,
          border: "1px solid #eef2f7",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-0.5px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Package className="w-9 h-9 text-orange-500" />
            Editar Produto
          </h1>

          <button
            type="button"
            onClick={() => router.back()}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold rounded-xl px-3 py-2"
            style={{
              background: "#eef2f7",
              color: "#0f172a",
              border: "1px solid #e3e8ef",
            }}
            aria-label="Voltar"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* ================= Uploads (Imagens + PDF) ================= */}
          <div
            className="rounded-2xl border"
            style={{
              background: "linear-gradient(180deg,#f8fbff, #ffffff)",
              borderColor: "#e6ebf2",
              padding: "18px",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-slate-700" />
              <h3 className="text-slate-800 font-black tracking-tight">
                Arquivos do anúncio
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Imagens */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: "#e6ebf2",
                  background:
                    "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff",
                }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-700" />
                  <strong className="text-[#0f172a]">
                    Imagens do Produto *
                  </strong>
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-dashed p-3">
                    <ImageUploader
                      imagens={imagens}
                      setImagens={setImagens}
                      max={5}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Envie até 5 imagens (JPG/PNG). Dica: use fotos nítidas e com
                    boa iluminação.
                  </p>
                </div>
              </div>

              {/* PDF */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: "#e6ebf2",
                  background:
                    "radial-gradient(1200px 300px at -200px -200px, #fff1e6 0%, transparent 60%), #ffffff",
                }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <strong className="text-[#0f172a]">
                    Ficha técnica (PDF) — opcional
                  </strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-dashed p-3">
                    <PDFUploader
                      initialUrl={pdfUrl ?? undefined}
                      onUploaded={setPdfUrl}
                    />
                  </div>

                  {pdfUrl ? (
                    <div
                      className="rounded-lg border overflow-hidden"
                      style={{ height: 300 }}
                    >
                      <DrivePDFViewer
                        fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(
                          pdfUrl || ""
                        )}`}
                        height={300}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Anexe manuais, especificações ou ficha técnica (até 8MB).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================= Campos ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <FormField label="Nome *" icon={<Tag size={15} />}>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Pá carregadeira, motor, filtro, etc."
                required
              />
            </FormField>

            {/* Categoria */}
            <FormField label="Categoria *" icon={<List size={15} />}>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">
                  {taxLoading ? "Carregando..." : "Selecione"}
                </option>
                {categorias.map((cat) => (
                  <option key={cat.slug ?? cat.nome} value={cat.nome}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Subcategoria */}
            <FormField label="Subcategoria *" icon={<Layers size={15} />}>
              {form.categoria === "Outros" ? (
                <input
                  name="outraCategoriaTexto"
                  value={form.outraCategoriaTexto}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Descreva com suas palavras"
                  required
                />
              ) : (
                <select
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                  disabled={!form.categoria}
                >
                  <option value="">
                    {form.categoria
                      ? "Selecione"
                      : "Selecione a categoria primeiro"}
                  </option>
                  {subcategoriasDisponiveis.map((sub) => (
                    <option key={sub.slug ?? sub.nome} value={sub.nome}>
                      {sub.nome}
                    </option>
                  ))}
                  <option value="Outros">Outros</option>
                </select>
              )}
            </FormField>

            {/* Preço */}
            <FormField label="Preço (R$)" icon={<DollarSign size={15} />}>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="text"
                inputMode="decimal"
                style={inputStyle}
                placeholder="Ex: 15.000,00"
              />
            </FormField>

            {/* Ano */}
            <FormField label="Ano *" icon={<Calendar size={15} />}>
              <input
                name="ano"
                value={form.ano}
                onChange={handleChange}
                type="number"
                style={inputStyle}
                placeholder="Ex: 2021"
                required
                min={1900}
              />
            </FormField>

            {/* Condição */}
            <FormField label="Condição *" icon={<Tag size={15} />}>
              <select
                name="condicao"
                value={form.condicao}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {condicoes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Estado */}
            <FormField label="Estado *" icon={<MapPin size={15} />}>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                {estados.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Cidade */}
          <FormField label="Cidade *" icon={<MapPin size={15} />}>
            <select
              name="cidade"
              value={form.cidade}
              onChange={handleChange}
              style={inputStyle}
              required
              disabled={!form.estado || carregandoCidades}
            >
              <option value="">
                {carregandoCidades
                  ? "Carregando..."
                  : form.estado
                  ? "Selecione a cidade"
                  : "Selecione primeiro o estado"}
              </option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>

          {/* Descrição */}
          <FormField label="Descrição *" icon={<BookOpen size={15} />}>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              style={{ ...inputStyle, height: 110 }}
              placeholder="Descreva com detalhes o produto, condição, uso, etc."
              rows={4}
              required
            />
          </FormField>

          {/* Garantia */}
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <strong className="text-slate-800">Garantia</strong>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  name="hasWarranty"
                  checked={form.hasWarranty}
                  onChange={handleChange}
                />
                Existe garantia?
              </label>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700">
                  Tempo de garantia
                </span>
                <input
                  type="number"
                  name="warrantyMonths"
                  min={1}
                  placeholder="ex: 12"
                  value={form.warrantyMonths}
                  onChange={handleChange}
                  disabled={!form.hasWarranty}
                  style={{ ...inputStyle, width: 120, marginBottom: 0 }}
                />
                <span className="text-sm text-slate-700">meses</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Dica: se escolher “com garantia” na condição, a opção acima é
              marcada automaticamente.
            </p>
          </div>

          {/* Alerts */}
          {erro && (
            <div
              style={{
                background: "#fff7f7",
                color: "#d90429",
                border: "1.5px solid #ffe5e5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginTop: -10,
                fontWeight: 700,
              }}
            >
              {erro}
            </div>
          )}
          {ok && (
            <div
              style={{
                background: "#f7fafc",
                color: "#16a34a",
                border: "1.5px solid #c3f3d5",
                padding: "12px 0",
                borderRadius: 11,
                textAlign: "center",
                marginTop: -10,
                fontWeight: 700,
              }}
            >
              {ok}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "linear-gradient(90deg,#fb8500,#219ebc)",
                color: "#fff",
                border: "none",
                borderRadius: 13,
                padding: "16px 0",
                fontWeight: 800,
                fontSize: 20,
                boxShadow: "0 8px 40px rgba(251,133,0,0.25)",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {submitting ? (
                <Loader2 className="animate-spin w-6 h-6" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {submitting ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/* ===================== UI helpers ===================== */
function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

/* ===================== Estilos ===================== */
const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#023047",
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
  letterSpacing: -0.2,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1.6px solid #e5e7eb",
  fontSize: 16,
  color: "#0f172a",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 2,
  outline: "none",
  marginTop: 2,
  minHeight: 46,
  boxShadow: "0 0 0 0 rgba(0,0,0,0)",
};

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
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
  Slash,
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
type Item = { nome: string; slug?: string };
type Subcat = { nome: string; slug?: string; itens?: Item[] };
type Cat = { nome: string; slug?: string; subcategorias?: Subcat[] };

type TaxIndexRow = {
  label: string;
  path: string[]; // ["Categoria","Subcategoria","Item"]
  haystack: string;
};

type UsuarioFS = {
  id?: string;
  nome?: string;
  email?: string;
  status?: "ativo" | "suspenso" | "banido";
  // outros campos que você tem no /usuarios
};

/* ===================== RequireAuth (embutido) ===================== */
function RequireAuth({ onReady }: { onReady: (uid: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) {
        router.replace("/login?next=/create-produto");
      } else {
        onReady(u.uid);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, onReady]);

  if (loading) {
    return (
      <div className="p-6 text-[#023047] flex items-center gap-2">
        <Loader2 className="animate-spin w-4 h-4" />
        Verificando acesso…
      </div>
    );
  }
  return null;
}

/* ===================== Page Wrapper ===================== */
export default function CreateProdutoPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#023047]">Carregando…</div>}>
      <CreateProdutoForm />
    </Suspense>
  );
}

/* ===================== Helpers de busca ===================== */
// normaliza texto: sem acentos, minúsculo, sem pontuação
function normalize(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// achata a taxonomia em linhas pesquisáveis
function buildTaxIndex(categorias: Cat[]): TaxIndexRow[] {
  const rows: TaxIndexRow[] = [];
  for (const cat of categorias) {
    const catName = cat?.nome || "";
    const subs = Array.isArray(cat?.subcategorias) ? cat.subcategorias : [];
    if (subs.length) {
      for (const sub of subs) {
        const subName = sub?.nome || "";
        const itens = Array.isArray(sub?.itens) ? sub.itens : [];
        if (itens.length) {
          for (const it of itens) {
            const itemName = it?.nome || "";
            const hay = normalize([catName, subName, itemName].join(" "));
            rows.push({
              label: itemName || subName || catName,
              path: [catName, subName, itemName],
              haystack: hay,
            });
          }
        } else {
          const hay = normalize([catName, subName].join(" "));
          rows.push({
            label: subName || catName,
            path: [catName, subName],
            haystack: hay,
          });
        }
      }
    } else {
      rows.push({
        label: catName,
        path: [catName],
        haystack: normalize(catName),
      });
    }
  }
  return rows;
}

// busca com ranking simples
function searchTaxIndex(index: TaxIndexRow[], q: string): TaxIndexRow[] {
  const nq = normalize(q);
  if (!nq) return [];
  const scored = index.map((r) => {
    const labelN = normalize(r.label);
    let score = 0;
    if (labelN === nq) score += 100;
    if (labelN.startsWith(nq)) score += 40;
    if (r.haystack.includes(nq)) score += 25;
    if (r.path[2] && normalize(r.path[2]).includes(nq)) score += 30;
    return { row: r, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.row);
}

/* ===================== Form Component ===================== */
function CreateProdutoForm() {
  const router = useRouter();

  // 🔐 Estado de auth/usuário
  const [uid, setUid] = useState<string | null>(null);
  const [userDoc, setUserDoc] = useState<UsuarioFS | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  // 🔗 Taxonomia unificada (Firestore > fallback local)
  const { categorias, loading: taxLoading } = useTaxonomia() as {
    categorias: Cat[];
    loading: boolean;
  };

  // imagens e PDF
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // form
  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    subcategoria: "",
    itemFinal: "", // ⭐ 3º nível
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

  // loading do submit
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ===== RequireAuth + carregar usuario FS =====
  function handleAuthReady(authUid: string) {
    setUid(authUid);
  }

  useEffect(() => {
    let ignore = false;
    async function fetchUser() {
      if (!uid) return;
      setUserLoading(true);
      try {
        const snap = await getDoc(doc(db, "usuarios", uid));
        if (ignore) return;
        if (snap.exists()) {
          const data = snap.data() as UsuarioFS;
          setUserDoc({ id: uid, ...data });

          // 🚫 Regras de bloqueio para cadastrar produto/serviço
          const status = (data.status || "ativo") as UsuarioFS["status"];
          if (status === "banido") {
            setBlockedReason(
              "Sua conta está banida. Você não pode cadastrar produtos ou serviços."
            );
          } else if (status === "suspenso") {
            setBlockedReason(
              "Sua conta está suspensa. Você não pode cadastrar produtos ou serviços durante a suspensão."
            );
          } else {
            setBlockedReason(null);
          }
        } else {
          // Se o doc não existe, considere como ativo por padrão, mas recomendo criar o perfil no sign up
          setUserDoc({ id: uid, status: "ativo" });
          setBlockedReason(null);
        }
      } catch {
        if (!ignore) {
          setUserDoc({ id: uid, status: "ativo" });
          setBlockedReason(null);
        }
      } finally {
        if (!ignore) setUserLoading(false);
      }
    }
    fetchUser();
    return () => {
      ignore = true;
    };
  }, [uid]);

  // ======= opções por nível =======
  const categoriaSelecionada = useMemo(
    () => categorias.find((c) => c.nome === form.categoria),
    [categorias, form.categoria]
  );
  const subcategoriasDisponiveis: Subcat[] = useMemo(
    () => categoriaSelecionada?.subcategorias ?? [],
    [categoriaSelecionada]
  );
  const subcategoriaSelecionada = useMemo(
    () => subcategoriasDisponiveis.find((s) => s.nome === form.subcategoria),
    [subcategoriasDisponiveis, form.subcategoria]
  );
  const itensDisponiveis: Item[] = useMemo(
    () => subcategoriaSelecionada?.itens ?? [],
    [subcategoriaSelecionada]
  );

  const catEhOutros = form.categoria === "Outros";
  const subcatEhOutros = form.subcategoria === "Outros";

  // ======= busca (autocomplete) =======
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TaxIndexRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const taxIndex = useMemo(() => buildTaxIndex(categorias), [categorias]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const r = searchTaxIndex(taxIndex, searchTerm);
    setResults(r);
    setShowResults(true);
    setHighlight(0);
  }, [searchTerm, taxIndex]);

  function selectTaxonomyPath(path: string[]) {
    const [c1, c2, c3] = path;
    setForm((prev) => ({
      ...prev,
      categoria: c1 || "",
      subcategoria: c2 || "",
      itemFinal: c3 || "",
      outraCategoriaTexto: "",
    }));
    setSearchTerm("");
    setShowResults(false);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[highlight];
      if (chosen) selectTaxonomyPath(chosen.path);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  }

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

    // resets em cascata
    if (name === "categoria") {
      setForm((f) => ({
        ...f,
        categoria: value,
        subcategoria: "",
        itemFinal: "",
        outraCategoriaTexto: "",
      }));
      return;
    }
    if (name === "subcategoria") {
      setForm((f) => ({ ...f, subcategoria: value, itemFinal: "" }));
      return;
    }

    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  // carrega cidades ao escolher UF (IBGE)
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
        setCidades(nomes);
      } catch {
        if (!abort) setCidades([]);
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }

    fetchCidades(form.estado);
    return () => {
      abort = true;
    };
  }, [form.estado]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar um produto.");
      setSubmitting(false);
      return;
    }

    // Bloqueio: banido/suspenso
    if (blockedReason) {
      setError(blockedReason);
      setSubmitting(false);
      return;
    }

    // validações
    const baseOk = !!(
      form.nome &&
      form.estado &&
      form.cidade &&
      form.descricao &&
      form.ano &&
      form.condicao
    );

    let taxOk = false;
    const catEhOutros = form.categoria === "Outros";
    const subcatEhOutros = form.subcategoria === "Outros";

    if (catEhOutros) {
      taxOk = !!form.outraCategoriaTexto.trim();
    } else if (subcatEhOutros) {
      taxOk = !!form.outraCategoriaTexto.trim();
    } else {
      taxOk = !!(form.categoria && form.subcategoria && form.itemFinal);
    }

    if (!(baseOk && taxOk)) {
      setError("Preencha todos os campos obrigatórios.");
      setSubmitting(false);
      return;
    }

    if (imagens.length === 0) {
      setError("Envie pelo menos uma imagem.");
      setSubmitting(false);
      return;
    }

    if (form.hasWarranty) {
      const months = Number(form.warrantyMonths);
      if (!months || months <= 0) {
        setError("Informe um prazo de garantia válido (em meses).");
        setSubmitting(false);
        return;
      }
    }

    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 45); // 45 dias

      const finalItem =
        catEhOutros || subcatEhOutros
          ? form.outraCategoriaTexto.trim()
          : form.itemFinal;

      const categoriaPath = catEhOutros
        ? ["Outros", finalItem]
        : subcatEhOutros
        ? [form.categoria, "Outros", finalItem]
        : [form.categoria, form.subcategoria, finalItem];

      // ======== CURADORIA: entra invisível e pendente =========
      await addDoc(collection(db, "produtos"), {
        tipo: "produto",
        nome: form.nome,

        // taxonomia 3 níveis + path
        categoria: form.categoria || "Outros",
        subcategoria: subcatEhOutros
          ? "Outros"
          : form.subcategoria || (catEhOutros ? "—" : ""),
        itemFinal: finalItem,
        categoriaPath,

        preco: form.preco ? parseFloat(form.preco) : null,
        estado: form.estado,
        cidade: form.cidade,
        ano: form.ano ? Number(form.ano) : null,
        condicao: form.condicao,
        descricao: form.descricao,
        imagens,
        pdfUrl: pdfUrl || null,
        hasWarranty: !!form.hasWarranty,
        warrantyMonths: form.hasWarranty ? Number(form.warrantyMonths) : null,

        // identificação
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // validade
        expiraEm: Timestamp.fromDate(expiresAt),

        // 🔒 curadoria
        status: "em_curadoria", // (antes estava "ativo")
        visivel: false,
        origem: "usuario",
        curadoriaStatus: "pendente",
        curadoriaBy: null,
        curadoriaAt: null,
      });

      setSuccess("Seu produto foi enviado para curadoria! 🎯");
      setForm({
        nome: "",
        categoria: "",
        subcategoria: "",
        itemFinal: "",
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
      setImagens([]);
      setPdfUrl(null);
      setTimeout(() => router.push("/painel"), 900);
    } catch (err) {
      console.error(err);
      setError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  // ======= UI =======
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      {/* RequireAuth: trava a tela até autenticar */}
      <RequireAuth onReady={handleAuthReady} />

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
            Cadastrar Produto
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

        {/* Avisos de status de conta */}
        {userLoading ? (
          <div className="mb-4 text-slate-700 flex items-center gap-2">
            <Loader2 className="animate-spin w-4 h-4" />
            Carregando permissões…
          </div>
        ) : blockedReason ? (
          <div
            className="mb-6 rounded-xl border p-4"
            style={{ borderColor: "#ffe0e0", background: "#fff7f7" }}
          >
            <div className="flex items-center gap-2 font-extrabold text-[#b00020]">
              <Slash className="w-5 h-5" />
              Ação bloqueada
            </div>
            <p className="text-sm text-[#b00020] mt-1">{blockedReason}</p>
            <p className="text-xs text-[#b00020] mt-2">
              Se você acredita que isso é um engano, fale com o suporte.
            </p>
          </div>
        ) : (
          <div
            className="mb-6 rounded-xl border p-4"
            style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
          >
            <p className="text-slate-700 text-sm">
              Seu anúncio será enviado para <strong>curadoria</strong>. Após
              aprovado, ficará visível na vitrine.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* ================= Uploads (Imagens + PDF) ================= */}
          <div
            className="rounded-2xl border"
            style={{
              background: "linear-gradient(180deg,#f8fbff, #ffffff)",
              borderColor: "#e6ebf2",
              padding: "18px",
              opacity: blockedReason ? 0.6 : 1,
              pointerEvents: blockedReason ? "none" as const : "auto",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-slate-700" />
              <h3 className="text-slate-800 font-black tracking-tight">
                Arquivos do anúncio
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card Imagens */}
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

              {/* Card PDF */}
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
                    <PDFUploader onUploaded={setPdfUrl} />
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
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            style={{
              opacity: blockedReason ? 0.6 : 1,
              pointerEvents: blockedReason ? "none" as const : "auto",
            }}
          >
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

            {/* ===== Busca rápida por item/caminho ===== */}
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
            >
              <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5 text-orange-500" /> Buscar por nome do
                item (atalho)
              </h3>

              <div className="relative">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm && setShowResults(true)}
                  onKeyDown={onSearchKeyDown}
                  onBlur={() => setTimeout(() => setShowResults(false), 120)}
                  placeholder="Ex.: britador de mandíbulas, peneira vibratória, CLP, etc."
                  style={inputStyle}
                  aria-autocomplete="list"
                  aria-expanded={showResults}
                />

                {showResults && results.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "#ffffff",
                      border: "1px solid #e6ebf2",
                      borderRadius: 12,
                      boxShadow: "0 12px 28px rgba(2,48,71,0.12)",
                      zIndex: 9999,
                      maxHeight: 320,
                      overflowY: "auto",
                    }}
                    onMouseLeave={() => setHighlight(0)}
                  >
                    <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>
                      {results.map((r, i) => {
                        const [c1, c2, c3] = r.path;
                        const active = i === highlight;
                        return (
                          <li
                            key={r.label + i}
                            onMouseEnter={() => setHighlight(i)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectTaxonomyPath(r.path)}
                            style={{
                              cursor: "pointer",
                              borderRadius: 10,
                              padding: "8px 10px",
                              background: active
                                ? "rgba(251,133,0,0.08)"
                                : "transparent",
                            }}
                          >
                            <div className="text-sm font-semibold text-slate-800">
                              {r.label}
                            </div>
                            <div className="text-xs text-slate-500">
                              {[c1, c2, c3].filter(Boolean).join(" › ")}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {showResults && results.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "#ffffff",
                      border: "1px solid #e6ebf2",
                      borderRadius: 12,
                      boxShadow: "0 12px 28px rgba(2,48,71,0.12)",
                      zIndex: 9999,
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    Nada encontrado. Tente “mandibulas”, “mandíbula”,
                    “mandibula”…
                  </div>
                )}
              </div>
            </div>

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
              {catEhOutros ? (
                <input
                  name="outraCategoriaTexto"
                  value={form.outraCategoriaTexto}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Descreva com suas palavras o que você precisa"
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
                </select>
              )}
            </FormField>

            {/* Item final */}
            <FormField label="Item final *" icon={<Layers size={15} />}>
              {catEhOutros || subcatEhOutros ? (
                <input
                  name="outraCategoriaTexto"
                  value={form.outraCategoriaTexto}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Ex.: Descreva exatamente o que precisa"
                  required
                />
              ) : (
                <select
                  name="itemFinal"
                  value={form.itemFinal}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                  disabled={!form.subcategoria || itensDisponiveis.length === 0}
                >
                  <option value="">
                    {!form.subcategoria
                      ? "Selecione a subcategoria primeiro"
                      : itensDisponiveis.length
                      ? "Selecione"
                      : "Sem itens disponíveis"}
                  </option>
                  {itensDisponiveis.map((it) => (
                    <option key={it.slug ?? it.nome} value={it.nome}>
                      {it.nome}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Preço */}
            <FormField label="Preço (R$)" icon={<DollarSign size={15} />}>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="number"
                style={inputStyle}
                placeholder="Ex: 15000"
                min={0}
                step={0.01}
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
              disabled={!form.estado || carregandoCidades || !!blockedReason}
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
              disabled={!!blockedReason}
            />
          </FormField>

          {/* Garantia */}
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "#e6ebf2",
              background: "#f8fafc",
              opacity: blockedReason ? 0.6 : 1,
              pointerEvents: blockedReason ? "none" as const : "auto",
            }}
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
                <span className="text-sm text-slate-700">Tempo de garantia</span>
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
          {error && (
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
              {error}
            </div>
          )}
          {success && (
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
              {success}
            </div>
          )}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row-reverse gap-3">
            <button
              type="submit"
              disabled={submitting || !!blockedReason}
              style={{
                background: "linear-gradient(90deg,#fb8500,#219ebc)",
                color: "#fff",
                border: "none",
                borderRadius: 13,
                padding: "16px 0",
                fontWeight: 800,
                fontSize: 20,
                boxShadow: "0 8px 40px rgba(251,133,0,0.25)",
                cursor: submitting || blockedReason ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: blockedReason ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <Loader2 className="animate-spin w-6 h-6" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {submitting ? "Enviando para curadoria..." : "Cadastrar Produto"}
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

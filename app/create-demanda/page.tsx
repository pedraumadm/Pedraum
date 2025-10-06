"use client";

import AuthGateRedirect from "@/components/AuthGateRedirect";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import nextDynamic from "next/dynamic";
import {
  Loader2, Save, Tag, MapPin, CheckCircle2, Sparkles, Upload, BookOpen,
  List, Layers, Info, ArrowLeft, FileText, Image as ImageIcon
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/** ============ SSR/ISR ============ */
export const dynamic = "force-dynamic";
const PDFUploader = nextDynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = nextDynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

/* ================== Tipos e Constantes ================== */
// O hook useTaxonomia expõe Cat/Subcat com `itens` (Item[]).
type Item = { nome: string; slug?: string };
type Subcat = { nome: string; slug?: string; itens?: Item[] };
type Cat = { nome: string; slug?: string; subcategorias?: Subcat[] };

type FormState = {
  titulo: string;
  descricao: string;

  /** Nível 1 */
  categoria: string;

  /** Nível 2 */
  subcategoria: string;

  /** Nível 3 (item final) */
  itemFinal: string;

  /** Texto livre quando o usuário seleciona "Outros" (cat ou subcat) */
  outraCategoriaTexto: string;

  estado: string;
  cidade: string;
  prazo: string;

  autorNome: string;
  autorEmail: string;
  autorWhatsapp: string;
  whatsapp?: string;
};

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
] as const;

const RASCUNHO_KEY = "pedraum:create-demandas:draft_v3";

/* ================== Helpers de busca ================== */
// Normaliza texto (sem acentos, caixa baixa, sem pontuação)
function normalize(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type TaxIndexRow = {
  label: string;
  path: string[]; // 1 a 3 elementos
  haystack: string;
};

// Achata a taxonomia em linhas pesquisáveis
function buildTaxIndex(
  categorias: { nome: string; subcategorias?: { nome: string; itens?: { nome: string }[] }[] }[]
): TaxIndexRow[] {
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
            const label = itemName || subName || catName;
            const hay = normalize([catName, subName, itemName].filter(Boolean).join(" "));
            rows.push({ label, path: [catName, subName, itemName], haystack: hay });
          }
        } else {
          // se não há itens, indexa a própria sub como final
          const label = subName || catName;
          const hay = normalize([catName, subName].filter(Boolean).join(" "));
          rows.push({ label, path: [catName, subName], haystack: hay });
        }
      }
    } else {
      // categoria sem subcategorias
      const hay = normalize(catName);
      rows.push({ label: catName, path: [catName], haystack: hay });
    }
  }
  return rows;
}

// Busca com ranking simples
function searchTaxIndex(index: TaxIndexRow[], q: string): TaxIndexRow[] {
  const nq = normalize(q);
  if (!nq) return [];

  const scored = index.map(r => {
    const labelN = normalize(r.label);
    let score = 0;

    if (labelN === nq) score += 100;           // match exato no label
    if (labelN.startsWith(nq)) score += 40;    // começa com
    if (r.haystack.includes(nq)) score += 25;  // aparece no caminho completo
    if (r.path[2] && normalize(r.path[2]).includes(nq)) score += 30; // bônus no item final

    return { row: r, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.row);
}

/* ================== Página interna ================== */
function CreateDemandaContent() {
  const router = useRouter();

  // 🔗 Taxonomia (Firestore > fallback local)
  const { categorias, loading: taxLoading } = useTaxonomia() as {
    categorias: Cat[];
    loading: boolean;
  };

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",

    categoria: "",      // nivel 1
    subcategoria: "",   // nivel 2
    itemFinal: "",      // nivel 3
    outraCategoriaTexto: "",

    estado: "",
    cidade: "",
    prazo: "",

    autorNome: "",
    autorEmail: "",
    autorWhatsapp: "",
    whatsapp: "",
  });

  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ---------- Autosave local ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p?.form) {
          setForm((prev) => ({
            ...prev,
            ...Object.fromEntries(
              Object.entries(p.form).filter(([k]) =>
                [
                  "titulo","descricao","categoria","subcategoria","itemFinal",
                  "outraCategoriaTexto","estado","cidade","prazo",
                  "autorNome","autorEmail","autorWhatsapp","whatsapp",
                ].includes(k)
              )
            ),
          }));
        }
        if (Array.isArray(p?.imagens)) setImagens(p.imagens);
        if (p?.pdfUrl) setPdfUrl(p.pdfUrl);
      } catch {}
    }
  }, []);

  useEffect(() => {
    const draft = { form, imagens, pdfUrl };
    setSavingDraft(true);
    const id = setTimeout(() => {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(draft));
      setSavingDraft(false);
    }, 500);
    return () => clearTimeout(id);
  }, [form, imagens, pdfUrl]);

  /* ---------- Autofill do autor ---------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const uref = doc(db, "usuarios", user.uid);
        const usnap = await getDoc(uref);
        const prof = usnap.exists() ? (usnap.data() as any) : {};
        setForm((prev) => ({
          ...prev,
          autorNome: prev.autorNome || prof?.nome || user.displayName || "",
          autorEmail: prev.autorEmail || prof?.email || user.email || "",
          autorWhatsapp: prev.autorWhatsapp || prof?.whatsapp || prof?.telefone || "",
          whatsapp: prev.whatsapp || prof?.whatsapp || prof?.telefone || "",
        }));
      } catch {
        setForm((prev) => ({
          ...prev,
          autorNome: prev.autorNome || auth.currentUser?.displayName || "",
          autorEmail: prev.autorEmail || auth.currentUser?.email || "",
        }));
      }
    });
    return () => unsub();
  }, []);

  /* ---------- Cidades por UF (IBGE) ---------- */
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
        const nomes = data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
        setCidades(nomes);
      } catch {
        if (!abort) setCidades([]);
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }
    fetchCidades(form.estado);
    return () => { abort = true; };
  }, [form.estado]);

  /* ---------- Helpers de seleção (3 níveis) ---------- */
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

  /* ---------- Flags "Outros" ---------- */
  const catEhOutros = form.categoria === "Outros";
  const subcatEhOutros = form.subcategoria === "Outros";

  /* ---------- Busca de taxonomia (autocomplete) ---------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TaxIndexRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const taxIndex = useMemo(() => buildTaxIndex(categorias as any), [categorias]);

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
    setForm(prev => ({
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
      setHighlight(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[highlight];
      if (chosen) selectTaxonomyPath(chosen.path);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  }

  /* ---------- Handlers ---------- */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target as any;

    // Reset em cascata
    if (name === "categoria") {
      setForm((prev) => ({
        ...prev,
        categoria: value,
        subcategoria: "",
        itemFinal: "",
        outraCategoriaTexto: "",
      }));
      return;
    }
    if (name === "subcategoria") {
      setForm((prev) => ({
        ...prev,
        subcategoria: value,
        itemFinal: "",
        outraCategoriaTexto: prev.outraCategoriaTexto,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  /* ---------- Preview ---------- */
  const preview = useMemo(() => {
    const local = form.estado ? `${form.cidade ? form.cidade + ", " : ""}${form.estado}` : "—";
    const caminho =
      catEhOutros
        ? `Outros > ${form.outraCategoriaTexto?.trim() || "—"}`
        : subcatEhOutros
          ? `${form.categoria} > Outros > ${form.outraCategoriaTexto?.trim() || "—"}`
          : `${form.categoria || "—"} > ${form.subcategoria || "—"} > ${form.itemFinal || "—"}`;

    return {
      titulo: form.titulo?.trim() || "—",
      caminho,
      local,
      prazo: form.prazo || "—",
      imagens: imagens.length,
    };
  }, [form, imagens, catEhOutros, subcatEhOutros]);

  /* ---------- Submit ---------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Você precisa estar logado para cadastrar uma demanda.");
      setSubmitting(false);
      return;
    }

    // Regras de obrigatórios
    const baseOk = !!(form.titulo && form.descricao && form.prazo && form.estado && form.cidade);
    let categoriaOk = false;
    let subcategoriaOk = false;
    let itemOk = false;

    if (catEhOutros) {
      categoriaOk = true;
      subcategoriaOk = true; // subcategoria desconsiderada
      itemOk = !!form.outraCategoriaTexto.trim(); // texto livre obrigatório
    } else if (subcatEhOutros) {
      categoriaOk = !!form.categoria;
      subcategoriaOk = true;
      itemOk = !!form.outraCategoriaTexto.trim(); // texto livre obrigatório
    } else {
      categoriaOk = !!form.categoria;
      subcategoriaOk = !!form.subcategoria;
      itemOk = !!form.itemFinal;
    }

    if (!(baseOk && categoriaOk && subcategoriaOk && itemOk)) {
      setError("Preencha todos os campos obrigatórios (*).");
      setSubmitting(false);
      return;
    }

    try {
      const finalItem = catEhOutros || subcatEhOutros
        ? form.outraCategoriaTexto.trim()
        : form.itemFinal;

      const categoriaPath = catEhOutros
        ? ["Outros", finalItem]
        : subcatEhOutros
          ? [form.categoria, "Outros", finalItem]
          : [form.categoria, form.subcategoria, finalItem];

      const searchBase = [
        form.titulo, form.descricao,
        ...categoriaPath,
        form.estado, form.cidade,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const payload = {
        // Conteúdo
        titulo: form.titulo,
        descricao: form.descricao,

        // Taxonomia 3 níveis
        categoria: form.categoria || "Outros",
        subcategoria: subcatEhOutros ? "Outros" : (form.subcategoria || (catEhOutros ? "—" : "")),
        itemFinal: finalItem,
        categoriaPath, // útil para filtros/indexação

        // Local
        estado: form.estado,
        cidade: form.cidade,
        prazo: form.prazo,

        // Autor
        autorNome: form.autorNome || "",
        autorEmail: form.autorEmail || "",
        autorWhatsapp: form.autorWhatsapp || "",
        whatsapp: form.whatsapp || form.autorWhatsapp || "",

        // Anexos
        imagens,
        pdfUrl: pdfUrl || null,
        imagesCount: imagens.length,

        // Busca
        searchKeywords: searchBase.split(/\s+/).slice(0, 80),

        // Meta
        status: "Aberta",
        statusHistory: [{ status: "Aberta", at: new Date() }],

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.uid,
      };

      await addDoc(collection(db, "demandas"), payload);
      localStorage.removeItem(RASCUNHO_KEY);
      setSuccess("Demanda cadastrada com sucesso!");
      setTimeout(() => router.push("/demandas"), 900);
    } catch (err) {
      console.error(err);
      setError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <main
      className="min-h-screen flex flex-col items-center py-8 px-2 sm:px-4"
      style={{ background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)" }}
    >
      <div className="w-full max-w-3xl px-2 mb-3 flex">
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
          maxWidth: 760,
          width: "100%",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 4px 32px #0001",
          padding: "48px 2vw 55px 2vw",
          marginTop: 8,
          border: "1px solid #eef2f7",
        }}
      >
        <AuthGateRedirect />

        <h1
          style={{
            fontSize: "2.3rem",
            fontWeight: 900,
            color: "#023047",
            letterSpacing: "-1px",
            margin: "0 0 20px 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Sparkles className="w-9 h-9 text-orange-500" />
          Cadastrar Demanda
        </h1>

        <div style={hintCardStyle}>
          <Info className="w-5 h-5" />
          <p style={{ margin: 0 }}>
            Quanto mais detalhes, melhor a conexão com fornecedores ideais. Você pode anexar imagens e PDF.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Anexos */}
          <div
            className="rounded-2xl border"
            style={{ background: "linear-gradient(180deg,#f8fbff, #ffffff)", borderColor: "#e6ebf2", padding: 18 }}
          >
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" /> Arquivos do pedido
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Imagens */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff" }}>
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-700" />
                  <strong className="text-[#0f172a]">Imagens (opcional)</strong>
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-dashed p-3">
                    <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Adicione até 5 imagens reais para contextualizar.</p>
                </div>
              </div>

              {/* PDF */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #fff1e6 0%, transparent 60%), #ffffff" }}>
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <strong className="text-[#0f172a]">Anexo PDF (opcional)</strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-dashed p-3">
                    <PDFUploader onUploaded={setPdfUrl} />
                  </div>

                  {pdfUrl ? (
                    <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                      <DrivePDFViewer
                        fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`}
                        height={300}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Envie orçamento, memorial ou ficha técnica (até ~8MB).</p>
                  )}
                </div>
              </div>
            </div>
          </div>


          {/* Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label style={labelStyle}><Tag size={15} /> Título da Demanda *</label>
              <input
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Ex: Manutenção em pá carregadeira CAT 938G"
                required
                maxLength={120}
              />
              <div style={smallInfoStyle}>{form.titulo.length}/120</div>
            </div>

            <div>
              <label style={labelStyle}><CheckCircle2 size={15} /> Prazo (urgência) *</label>
              <select name="prazo" value={form.prazo} onChange={handleChange} style={inputStyle} required>
                <option value="">Selecione</option>
                <option value="urgente">Urgente</option>
                <option value="até 3 dias">Até 3 dias</option>
                <option value="até 7 dias">Até 7 dias</option>
                <option value="até 15 dias">Até 15 dias</option>
                <option value="flexível">Flexível</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label style={labelStyle}><BookOpen size={15} /> Descrição *</label>
              <textarea
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                style={{ ...inputStyle, height: 110 }}
                placeholder="Marca/modelo, sintomas, local, horários, prazos, requisitos etc."
                required
                maxLength={2000}
              />
              <div style={smallInfoStyle}>{form.descricao.length}/2000</div>
            </div>
          </div>
   {/* ===== Busca rápida por item/caminho ===== */}
<div
  className="rounded-2xl border p-4"
  style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
>
  <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
    <Tag className="w-5 h-5 text-orange-500" /> Buscar por nome do item (atalho)
  </h3>

  {/* wrapper relativo para posicionar o dropdown */}
  <div className="relative">
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onFocus={() => searchTerm && setShowResults(true)}
      onKeyDown={onSearchKeyDown}
      onBlur={() => setTimeout(() => setShowResults(false), 120)} // permite clicar no item
      placeholder="Ex.: britador de mandíbulas, peneira vibratória, CLP, etc."
      style={inputStyle}
      aria-autocomplete="list"
      aria-expanded={showResults}
    />

    {/* Dropdown sólido (portal local) */}
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
                onMouseDown={(e) => e.preventDefault()} // evita blur antes do click
                onClick={() => selectTaxonomyPath(r.path)}
                style={{
                  cursor: "pointer",
                  borderRadius: 10,
                  padding: "8px 10px",
                  background: active ? "rgba(251,133,0,0.08)" : "transparent",
                }}
              >
                <div className="text-sm font-semibold text-slate-800">{r.label}</div>
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
        Nada encontrado. Tente “mandibulas”, “mandíbula”, “mandibula”…
      </div>
    )}
  </div>
</div>



          {/* Categoria / Subcategoria / Item final */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nível 1 */}
            <div>
              <label style={labelStyle}><List size={15} /> Categoria *</label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
                {categorias.map((cat) => (
                  <option key={cat.slug ?? cat.nome} value={cat.nome}>{cat.nome}</option>
                ))}
              </select>
            </div>

            {/* Nível 2 */}
            <div>
              <label style={labelStyle}><Layers size={15} /> Subcategoria *</label>

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
                  <option value="">{form.categoria ? "Selecione" : "Selecione a categoria primeiro"}</option>
                  {subcategoriasDisponiveis.map((sub) => (
                    <option key={sub.slug ?? sub.nome} value={sub.nome}>{sub.nome}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Nível 3 */}
            <div>
              <label style={labelStyle}><Layers size={15} /> Item final *</label>

              {(catEhOutros || subcatEhOutros) ? (
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
                    {!form.subcategoria ? "Selecione a subcategoria primeiro" :
                      itensDisponiveis.length ? "Selecione" : "Sem itens disponíveis"}
                  </option>
                  {itensDisponiveis.map((it) => (
                    <option key={it.slug ?? it.nome} value={it.nome}>{it.nome}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}>
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" /> Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Estado (UF) *</label>
                <select name="estado" value={form.estado} onChange={handleChange} style={inputStyle} required>
                  <option value="">Selecione o Estado</option>
                  {ESTADOS.map((uf) => (<option key={uf} value={uf}>{uf}</option>))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label style={labelStyle}>Cidade *</label>
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
                  {cidades.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Dados do autor */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#e6ebf2", background: "#fff" }}>
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-500" /> Seus dados (editáveis)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Nome *</label>
                <input name="autorNome" value={form.autorNome} onChange={handleChange} style={inputStyle} required placeholder="Seu nome" />
              </div>
              <div>
                <label style={labelStyle}>E-mail *</label>
                <input name="autorEmail" value={form.autorEmail} onChange={handleChange} style={inputStyle} type="email" required placeholder="seuemail@exemplo.com" />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp (opcional)</label>
                <input name="autorWhatsapp" value={form.autorWhatsapp} onChange={handleChange} style={inputStyle} placeholder="(xx) xxxxx-xxxx" inputMode="tel" />
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div style={previewCardStyle}>
            <div style={{ fontWeight: 800, color: "#023047", marginBottom: 8 }}>Pré-visualização</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
              <div><span style={muted}>Título:</span> {preview.titulo}</div>
              <div><span style={muted}>Caminho:</span> {preview.caminho}</div>
              <div><span style={muted}>Local:</span> {preview.local}</div>
              <div><span style={muted}>Prazo:</span> {preview.prazo}</div>
              <div><span style={muted}>Imagens:</span> {preview.imagens}</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft ? "Salvando rascunho..." : "Rascunho salvo automaticamente"}
            </div>
          </div>

          {/* Alertas */}
          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}

          {/* Botão principal */}
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
            {submitting ? <Loader2 className="animate-spin w-6 h-6" /> : <Save className="w-5 h-5" />}
            {submitting ? "Cadastrando..." : "Cadastrar Demanda"}
          </button>
        </form>
      </section>
    </main>
  );
}

/* ===== Página exportada com Suspense ===== */
export default function CreateDemandaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
      <CreateDemandaContent />
    </Suspense>
  );
}

/* ---------- Estilos ---------- */
const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#023047",
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 14,
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
  marginBottom: 6,
  outline: "none",
  marginTop: 2,
  minHeight: 46,
};
const previewCardStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1.6px solid #e5e7eb",
  background: "#f8fafc",
  padding: "14px 14px",
};
const hintCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#eef6ff",
  border: "1.6px solid #dbeafe",
  color: "#0c4a6e",
  padding: "12px 14px",
  borderRadius: 14,
  marginBottom: 16,
};
const smallInfoStyle: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 4 };
const errorStyle: React.CSSProperties = {
  background: "#fff7f7",
  color: "#d90429",
  border: "1.5px solid #ffe5e5",
  padding: "12px 0",
  borderRadius: 11,
  textAlign: "center",
  fontWeight: 700,
};
const successStyle: React.CSSProperties = {
  background: "#f7fafc",
  color: "#16a34a",
  border: "1.5px solid #c3f3d5",
  padding: "12px 0",
  borderRadius: 11,
  textAlign: "center",
  fontWeight: 700,
};
const muted: React.CSSProperties = { color: "#6b7280" };

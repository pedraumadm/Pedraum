// app/create-service/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AuthGateRedirect from "@/components/AuthGateRedirect";
import ImageUploader from "@/components/ImageUploader";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Loader2,
  Save,
  Tag,
  DollarSign,
  Layers,
  MapPin,
  Globe,
  CalendarClock,
  Upload,
  Info,
  Sparkles,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/* ===== PDF (client-only) ===== */
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), {
  ssr: false,
});
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), {
  ssr: false,
});

/* ================== Constantes ================== */
const estados = [
  "BRASIL",
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
] as const;

const disponibilidades = [
  "Manhã",
  "Tarde",
  "Noite",
  "Integral",
  "24 horas",
  "Sob consulta",
] as const;

const RASCUNHO_KEY = "pedraum:create-service:draft_v4";

/* ================== Helpers ================== */
function normalize(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Tipos locais apenas para percorrer a taxonomia */
type SubAny = { nome: string; slug?: string; subcategorias?: SubAny[] };

/** Constrói índice de folhas (caminhos completos até o item final) */
function buildLeafIndex(cats: SubAny[]) {
  const out: { path: string[]; label: string; hay: string }[] = [];

  function dfs(node: SubAny, path: string[]) {
    const nextPath = [...path, node.nome];
    const subs = Array.isArray(node.subcategorias) ? node.subcategorias : [];
    if (subs.length === 0) {
      const label = nextPath.join(" > ");
      out.push({ path: nextPath, label, hay: normalize(label) });
    } else {
      subs.forEach((sn) => dfs(sn, nextPath));
    }
  }

  (cats || []).forEach((c) => dfs(c, []));
  return out;
}

/** Busca por termo nas folhas (caminho completo) */
function searchLeaves(index: ReturnType<typeof buildLeafIndex>, q: string) {
  const nq = normalize(q);
  if (!nq) return [];
  return index.filter((x) => x.hay.includes(nq)).slice(0, 12);
}

/* ================== Form types ================== */
type FormState = {
  titulo: string;
  descricao: string;

  categoria: string; // nível 1
  subcategoria: string; // nível 2
  itemFinal: string; // nível 3
  outrosCategoriaTexto: string; // se categoria == "Outros"

  preco: string; // string; vira number | "Sob consulta" no submit
  estado: string;
  abrangencia: string;
  disponibilidade: string;

  prestadorNome: string;
  prestadorEmail: string;
  prestadorWhatsapp: string;
};

export default function CreateServicePage() {
  const router = useRouter();

  // 🔗 Taxonomia (Firestore > local)
  const { categorias: taxCats, loading: taxLoading } = useTaxonomia() as {
    categorias: SubAny[];
    loading: boolean;
  };

  // Índice de folhas (A > B > C)
  const leafIndex = useMemo(() => buildLeafIndex(taxCats), [taxCats]);

  // mídia
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    itemFinal: "",
    outrosCategoriaTexto: "",

    preco: "",
    estado: "",
    abrangencia: "",
    disponibilidade: "",

    prestadorNome: "",
    prestadorEmail: "",
    prestadorWhatsapp: "",
  });

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ===== Busca rápida por item/caminho =====
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<{ path: string[]; label: string }[]>(
    [],
  );
  const [showResults, setShowResults] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const r = searchLeaves(leafIndex, searchTerm).map(({ path, label }) => ({
      path,
      label,
    }));
    setResults(r);
    setShowResults(true);
    setHighlight(0);
  }, [searchTerm, leafIndex]);

  function applyPath(path: string[]) {
    const [c1, c2, c3] = path;
    setForm((prev) => ({
      ...prev,
      categoria: c1 || "",
      subcategoria: c2 || "",
      itemFinal: c3 || c2 || "",
      outrosCategoriaTexto: "",
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
      if (chosen) applyPath(chosen.path);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  }

  /* ---------- Autosave local ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p?.form) setForm((prev) => ({ ...prev, ...p.form }));
        if (Array.isArray(p?.imagens)) setImagens(p.imagens);
        if (typeof p?.pdfUrl === "string" || p?.pdfUrl === null)
          setPdfUrl(p.pdfUrl);
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
          prestadorNome:
            prev.prestadorNome || prof?.nome || user.displayName || "",
          prestadorEmail:
            prev.prestadorEmail || prof?.email || user.email || "",
          prestadorWhatsapp:
            prev.prestadorWhatsapp || prof?.whatsapp || prof?.telefone || "",
        }));
      } catch {
        setForm((prev) => ({
          ...prev,
          prestadorNome:
            prev.prestadorNome || auth.currentUser?.displayName || "",
          prestadorEmail: prev.prestadorEmail || auth.currentUser?.email || "",
        }));
      }
    });
    return () => unsub();
  }, []);

  /* ---------- Handlers ---------- */
  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>,
  ) {
    const { name, value } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "categoria"
        ? { subcategoria: "", itemFinal: "", outrosCategoriaTexto: "" }
        : null),
      ...(name === "subcategoria" ? { itemFinal: "" } : null),
    }));
  }

  const precoPreview = useMemo(() => {
    if (!form.preco) return "Sob consulta";
    const n = Number(form.preco);
    if (Number.isNaN(n)) return "Sob consulta";
    return `R$ ${n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [form.preco]);

  /* ---------- Derivados da taxonomia ---------- */
  const subcatsLvl2: SubAny[] = (taxCats.find((c) => c.nome === form.categoria)
    ?.subcategorias ?? []) as SubAny[];

  const itemsLvl3: SubAny[] = (subcatsLvl2.find(
    (s) => s.nome === form.subcategoria,
  )?.subcategorias ?? []) as SubAny[];

  const isOutros = form.categoria === "Outros";

  /* ---------- Submit ---------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const user = auth.currentUser;
    if (!user) {
      setError("Faça login para cadastrar um serviço.");
      setLoading(false);
      return;
    }

    const subOk = isOutros
      ? !!form.outrosCategoriaTexto.trim()
      : !!form.subcategoria;
    const itemOk = isOutros ? true : !!form.itemFinal;

    if (
      !form.titulo ||
      !form.descricao ||
      !form.categoria ||
      !subOk ||
      !itemOk ||
      !form.estado ||
      !form.abrangencia ||
      !form.disponibilidade ||
      !form.prestadorNome ||
      !form.prestadorEmail
    ) {
      setError("Preencha todos os campos obrigatórios (*).");
      setLoading(false);
      return;
    }

    if (imagens.length === 0) {
      setError("Envie pelo menos uma imagem do serviço.");
      setLoading(false);
      return;
    }

    try {
      // preço: número ou "Sob consulta"
      let preco: number | string = "Sob consulta";
      if (form.preco.trim() !== "") {
        const n = Number(form.preco);
        if (!Number.isNaN(n) && n >= 0) preco = Number(n.toFixed(2));
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 45);

      const finalCategoria = isOutros ? "Outros (livre)" : form.categoria;

      const categoriaPath = isOutros
        ? ["Outros", form.outrosCategoriaTexto.trim()]
        : [form.categoria, form.subcategoria, form.itemFinal].filter(Boolean);

      const categoriaPathLabel = categoriaPath.join(" > ");

      // keywords para busca
      const searchBase = normalize(
        [
          form.titulo,
          form.descricao,
          categoriaPathLabel,
          form.estado,
          form.abrangencia,
          form.disponibilidade,
          form.prestadorNome,
        ]
          .filter(Boolean)
          .join(" "),
      );

      const payload = {
        // principais
        titulo: form.titulo,
        descricao: form.descricao,

        categoria: finalCategoria,
        subcategoria: isOutros ? "" : form.subcategoria,
        itemFinal: isOutros ? form.outrosCategoriaTexto.trim() : form.itemFinal,

        categoriaPath,
        categoriaPathLabel,

        preco,
        estado: form.estado,
        abrangencia: form.abrangencia,
        disponibilidade: form.disponibilidade,

        // mídia
        imagens,
        imagesCount: imagens.length,
        pdfUrl: pdfUrl || null,

        // autor / vendedor
        vendedorId: user.uid,
        prestadorNome: form.prestadorNome || "",
        prestadorEmail: form.prestadorEmail || "",
        prestadorWhatsapp: form.prestadorWhatsapp || "",

        // busca e status
        searchKeywords: searchBase.split(/\s+/).slice(0, 60),
        status: "ativo",
        statusHistory: [{ status: "ativo", at: now }],
        tipo: "serviço",

        // datas
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expiresAt),
      };

      await addDoc(collection(db, "services"), payload);
      localStorage.removeItem(RASCUNHO_KEY);
      setSuccess("Serviço cadastrado com sucesso!");
      setTimeout(() => router.push("/services"), 900);
    } catch (err) {
      console.error(err);
      setError("Erro ao cadastrar serviço. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- UI ---------- */
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-8">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="animate-spin w-5 h-5" />
            <span>Carregando...</span>
          </div>
        </main>
      }
    >
      <main
        className="min-h-screen flex flex-col items-center py-10 px-2 sm:px-4"
        style={{
          background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)",
        }}
      >
        <section
          style={{
            maxWidth: 960,
            width: "100%",
            background: "#fff",
            borderRadius: 22,
            boxShadow: "0 4px 32px #0001",
            padding: "48px 2vw 55px 2vw",
            marginTop: 18,
            border: "1px solid #eef2f7",
          }}
        >
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-1px",
              margin: "0 0 25px 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Sparkles className="w-9 h-9 text-orange-500" />
            Cadastrar Serviço
          </h1>

          {/* Dica topo */}
          <div style={hintCardStyle}>
            <Info className="w-5 h-5" />
            <p style={{ margin: 0 }}>
              Quanto mais detalhes, melhor a conexão com clientes ideais. Pelo
              menos 1 imagem é obrigatória.
            </p>
          </div>

          <AuthGateRedirect />

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 22 }}
          >
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
                      Imagens do Serviço *
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
                      Envie até 5 imagens (JPG/PNG). Dica: use fotos nítidas e
                      com boa iluminação.
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
                      Documento (PDF) — opcional
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
                          fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`}
                          height={300}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Anexe um portfólio, escopo, certificado ou ficha técnica
                        (até ~8MB).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ================= Principais ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label style={labelStyle}>
                  <Tag size={15} /> Título do Serviço *
                </label>
                <input
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Ex: Manutenção corretiva em britador"
                  maxLength={80}
                  required
                  autoComplete="off"
                />
                <div style={smallInfoStyle}>{form.titulo.length}/80</div>
              </div>

              <div>
                <label style={labelStyle}>
                  <DollarSign size={15} /> Valor (R$)
                </label>
                <input
                  name="preco"
                  value={form.preco}
                  onChange={handleChange}
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  placeholder="Ex: 1200 (opcional)"
                  autoComplete="off"
                />
                <div style={smallInfoStyle}>
                  Pré-visualização: {precoPreview}
                </div>
              </div>

              {/* ===== Busca rápida por item/caminho ===== */}
              <div
                className="rounded-2xl border p-4 mb-4"
                style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
              >
                <h3 className="text-slate-800 font-black tracking-tight mb-2 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-500" /> Buscar por nome
                  do item (atalho)
                </h3>
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm && setShowResults(true)}
                    onKeyDown={onSearchKeyDown}
                    onBlur={() => setTimeout(() => setShowResults(false), 120)}
                    style={inputStyle}
                    placeholder="Ex.: britador de mandíbulas, peneira vibratória, CLP, etc."
                    disabled={taxLoading}
                  />
                  {showResults && results.length > 0 && (
                    <ul
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 12px 30px rgba(2,48,71,0.08)",
                        borderRadius: 12,
                        zIndex: 50,
                        maxHeight: 280,
                        overflowY: "auto",
                        padding: "6px 0",
                      }}
                    >
                      {results.map(({ label, path }, i) => (
                        <li
                          key={label + i}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyPath(path)}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            color: "#0f172a",
                            fontWeight: 700,
                            background:
                              i === highlight
                                ? "rgba(251,133,0,0.12)"
                                : "transparent",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                          title={label}
                        >
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {results.length === 0 && searchTerm.trim() && (
                  <div className="text-xs text-slate-500 mt-2">
                    Nada encontrado. Tente “mandíbulas”, “vibratória”, “CLP”,
                    etc.
                  </div>
                )}
              </div>
              {/* Categoria / Subcategoria / Item final */}
              <div>
                <label style={labelStyle}>
                  <Layers size={15} /> Categoria *
                </label>
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
                  {taxCats.map((cat) => (
                    <option key={cat.nome} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Subcategoria *</label>
                {isOutros ? (
                  <input
                    name="outrosCategoriaTexto"
                    value={form.outrosCategoriaTexto}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Descreva sua necessidade"
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
                    {subcatsLvl2.map((s) => (
                      <option key={s.nome} value={s.nome}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {!isOutros && (
                <div className="md:col-span-2">
                  <label style={labelStyle}>Item final *</label>
                  <select
                    name="itemFinal"
                    value={form.itemFinal}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                    disabled={!form.subcategoria}
                  >
                    <option value="">
                      {form.subcategoria
                        ? "Selecione"
                        : "Selecione a subcategoria primeiro"}
                    </option>
                    {itemsLvl3.map((it) => (
                      <option key={it.nome} value={it.nome}>
                        {it.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={labelStyle}>
                  <MapPin size={15} /> Estado (UF) *
                </label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecione</option>
                  {estados.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  <Globe size={15} /> Abrangência *
                </label>
                <input
                  name="abrangencia"
                  value={form.abrangencia}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Ex: Minas Gerais, Sudeste, Brasil inteiro..."
                  maxLength={60}
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <CalendarClock size={15} /> Disponibilidade *
                </label>
                <select
                  name="disponibilidade"
                  value={form.disponibilidade}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecione</option>
                  {disponibilidades.map((disp) => (
                    <option key={disp} value={disp}>
                      {disp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label style={labelStyle}>
                <Tag size={15} /> Descrição detalhada *
              </label>
              <textarea
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                style={{ ...inputStyle, height: 110 }}
                placeholder="Descreva o serviço, experiência, materiais, área de atendimento, diferenciais, etc."
                rows={4}
                maxLength={400}
                required
              />
              <div style={smallInfoStyle}>{form.descricao.length}/400</div>
            </div>

            {/* Dados do prestador */}
            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                <Info className="w-5 h-5 text-orange-500" /> Seus dados
                (editáveis)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input
                    name="prestadorNome"
                    value={form.prestadorNome}
                    onChange={handleChange}
                    style={inputStyle}
                    required
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label style={labelStyle}>E-mail *</label>
                  <input
                    name="prestadorEmail"
                    value={form.prestadorEmail}
                    onChange={handleChange}
                    style={inputStyle}
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp (opcional)</label>
                  <input
                    name="prestadorWhatsapp"
                    value={form.prestadorWhatsapp}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="(xx) xxxxx-xxxx"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            {/* Alertas */}
            {error && (
              <div
                style={{
                  background: "#fff7f7",
                  color: "#d90429",
                  border: "1.5px solid #ffe5e5",
                  padding: "12px 0",
                  borderRadius: 11,
                  textAlign: "center",
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
                  fontWeight: 700,
                }}
              >
                {success}
              </div>
            )}

            {/* Botão principal */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(90deg,#fb8500,#219ebc)",
                color: "#fff",
                border: "none",
                borderRadius: 13,
                padding: "16px 0",
                fontWeight: 800,
                fontSize: 22,
                boxShadow: "0 2px 20px #fb850022",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginTop: 2,
                transition: "filter .2s, transform .02s",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "translateY(1px)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
              onMouseEnter={(e) =>
                (e.currentTarget.style.filter = "brightness(0.98)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
            >
              {loading ? (
                <Loader2 className="animate-spin w-7 h-7" />
              ) : (
                <Save className="w-6 h-6" />
              )}
              {loading ? "Cadastrando..." : "Cadastrar Serviço"}
            </button>

            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft
                ? "Salvando rascunho..."
                : "Rascunho salvo automaticamente"}
            </div>
          </form>
        </section>
      </main>
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
  borderRadius: 10,
  border: "1.6px solid #e5e7eb",
  fontSize: 16,
  color: "#1f2937",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 8,
  outline: "none",
  marginTop: 4,
  minHeight: 46,
};
const sectionCardStyle: React.CSSProperties = {
  background: "#f3f6fa",
  borderRadius: 12,
  padding: "24px 18px",
  border: "1.6px solid #e8eaf0",
  marginBottom: 6,
};
const sectionTitleStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
  marginBottom: 12,
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  gap: 8,
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
const smallInfoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};

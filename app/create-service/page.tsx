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
  Check,
  Slash,
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

const UFS = [
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
const UFS_SET = new Set<string>(UFS);

const disponibilidades = [
  "Manhã",
  "Tarde",
  "Noite",
  "Integral",
  "24 horas",
  "Sob consulta",
] as const;

/** Bump de draft: v6 inclui atendeBrasil/ufsAtendidas */
const RASCUNHO_KEY = "pedraum:create-service:draft_v6";

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

/** Tipos mínimos para carregar categorias de nível 1 */
type SubAny = { nome: string; slug?: string; subcategorias?: SubAny[] };

type UsuarioFS = {
  nome?: string;
  email?: string;
  whatsapp?: string;
  telefone?: string;
  status?: "ativo" | "suspenso" | "banido";
};

/* ================== Form types ================== */
type FormState = {
  titulo: string;
  descricao: string;

  categoria: string; // nível 1 selecionado
  outrosCategoriaTexto: string; // se categoria == "Outros"

  preco: string; // string; vira number | "Sob consulta" no submit
  estado: string;

  /** Cobertura no padrão do Perfil */
  atendeBrasil: boolean;
  ufsAtendidas: string[]; // lista de UFs quando não atendeBrasil

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

  // mídia
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",
    categoria: "",
    outrosCategoriaTexto: "",

    preco: "",
    estado: "",

    atendeBrasil: false,
    ufsAtendidas: [],

    disponibilidade: "",

    prestadorNome: "",
    prestadorEmail: "",
    prestadorWhatsapp: "",
  });

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 🔒 controle de curadoria/bloqueio
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  /* ---------- Autosave local ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p?.form) {
          setForm((prev) => ({ ...prev, ...p.form }));
        }
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

  /* ---------- Autofill do autor + status (curadoria/bloqueio) ---------- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setUserLoading(false);
        setBlockedReason(null);
        return;
      }
      try {
        const uref = doc(db, "usuarios", user.uid);
        const usnap = await getDoc(uref);
        const prof = usnap.exists()
          ? (usnap.data() as UsuarioFS)
          : ({} as UsuarioFS);

        const status = (prof.status || "ativo") as UsuarioFS["status"];
        if (status === "banido") {
          setBlockedReason(
            "Sua conta está banida. Você não pode cadastrar serviços."
          );
        } else if (status === "suspenso") {
          setBlockedReason(
            "Sua conta está suspensa. Você não pode cadastrar serviços durante a suspensão."
          );
        } else {
          setBlockedReason(null);
        }

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
        // fallback: considera ativo
        setBlockedReason(null);
        const u = auth.currentUser;
        setForm((prev) => ({
          ...prev,
          prestadorNome: prev.prestadorNome || u?.displayName || "",
          prestadorEmail: prev.prestadorEmail || u?.email || "",
        }));
      } finally {
        setUserLoading(false);
      }
    });
    return () => unsub();
  }, []);

  /* ---------- Handlers ---------- */
  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "categoria" ? { outrosCategoriaTexto: "" } : null),
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

  /* ---------- Derivados ---------- */
  const isOutros = form.categoria === "Outros";
  const subcategoriaFixa = "Serviços";

  function toggleUfAtendida(uf: string) {
    if (uf === "BRASIL") {
      setForm((f) => ({
        ...f,
        atendeBrasil: !f.atendeBrasil,
        ufsAtendidas: !f.atendeBrasil ? ["BRASIL"] : [],
      }));
      return;
    }
    const val = String(uf).trim().toUpperCase();
    if (!UFS_SET.has(val)) return;

    if (form.atendeBrasil) {
      setForm((f) => ({ ...f, atendeBrasil: false, ufsAtendidas: [val] }));
      return;
    }

    const has = form.ufsAtendidas.includes(val);
    setForm((f) => ({
      ...f,
      ufsAtendidas: has
        ? f.ufsAtendidas.filter((u) => u !== val)
        : [...f.ufsAtendidas, val],
    }));
  }

  function buildAbrangenciaLabel(atendeBrasil: boolean, ufs: string[]) {
    if (atendeBrasil) return "Brasil inteiro";
    const list = (ufs || []).filter((u) => u !== "BRASIL");
    if (list.length === 0) return "";
    if (list.length === 1) return list[0];
    if (list.length <= 4) return list.join(", ");
    return `${list.length} UFs`;
  }

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

    // bloqueio por curadoria (banido/suspenso)
    if (blockedReason) {
      setError(blockedReason);
      setLoading(false);
      return;
    }

    // Validações
    const coberturaOk = form.atendeBrasil || form.ufsAtendidas.length > 0;
    if (!coberturaOk) {
      setError(
        "Selecione pelo menos uma UF ou marque que atende o Brasil inteiro."
      );
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

      // Caminho padronizado: [Categoria, "Serviços"] (ou com texto livre em Outros)
      const categoriaPath = isOutros
        ? ["Outros", "Serviços", form.outrosCategoriaTexto.trim()].filter(
            Boolean
          )
        : [form.categoria, subcategoriaFixa];

      const categoriaPathLabel = categoriaPath.join(" > ");

      const abrangenciaLabel = buildAbrangenciaLabel(
        form.atendeBrasil,
        form.ufsAtendidas
      );

      // keywords para busca
      const searchBase = normalize(
        [
          form.titulo,
          form.descricao,
          categoriaPathLabel,
          form.estado,
          abrangenciaLabel,
          form.disponibilidade,
          form.prestadorNome,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const payload = {
        // principais
        titulo: form.titulo,
        descricao: form.descricao,

        categoria: finalCategoria,
        subcategoria: subcategoriaFixa, // fixa
        itemFinal: isOutros ? form.outrosCategoriaTexto.trim() : "",

        categoriaPath,
        categoriaPathLabel,

        preco,
        estado: form.estado,

        // Cobertura (novo padrão, igual Perfil)
        atendeBrasil: !!form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil
          ? ["BRASIL"]
          : Array.from(
              new Set(
                (form.ufsAtendidas || []).map((u) =>
                  String(u).trim().toUpperCase()
                )
              )
            ),

        // Compatibilidade antiga (string amigável)
        abrangencia: abrangenciaLabel,
        abrangenciaLabel,

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

        // 🔒 CURADORIA EM SERVIÇOS
        tipo: "serviço",
        status: "em_curadoria",
        statusHistory: [{ status: "em_curadoria", at: now }],
        visivel: false,
        origem: "usuario",
        curadoriaStatus: "pendente",
        curadoriaBy: null,
        curadoriaAt: null,

        // datas
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiraEm: Timestamp.fromDate(expiresAt),
      };

      await addDoc(collection(db, "services"), payload);
      localStorage.removeItem(RASCUNHO_KEY);
      setSuccess("Seu serviço foi enviado para curadoria! 🎯");
      setTimeout(() => router.push("/vitrine"), 900);
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

          {/* Aviso de curadoria + dica topo */}
          <div style={hintCardStyle}>
            <Info className="w-5 h-5" />
            <p style={{ margin: 0 }}>
              Seu serviço será enviado para <strong>curadoria</strong>. Após
              aprovado, ficará visível na vitrine para compradores. Quanto mais
              detalhes e imagens, melhor a conexão com clientes ideais.
            </p>
          </div>

          {/* Mensagem sobre status da conta */}
          {userLoading ? (
            <div
              style={{
                marginBottom: 16,
                fontSize: 14,
                color: "#475569",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando permissões da sua conta…
            </div>
          ) : blockedReason ? (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1.5px solid #ffe0e0",
                background: "#fff7f7",
                color: "#b00020",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 900,
                }}
              >
                <Slash className="w-4 h-4" />
                Ação bloqueada
              </div>
              <span style={{ fontSize: 13 }}>{blockedReason}</span>
              <span style={{ fontSize: 11 }}>
                Se você acredita que isso é um engano, entre em contato com o
                suporte.
              </span>
            </div>
          ) : null}

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
                opacity: blockedReason ? 0.6 : 1,
                pointerEvents: blockedReason ? "none" : "auto",
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
  Imagens do Serviço (recomendado)
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
                      Envie até 5 imagens (JPG/PNG). Use fotos nítidas, antes e
                      depois, equipe em campo, etc.
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
                          fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(
                            pdfUrl || ""
                          )}`}
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
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              style={{
                opacity: blockedReason ? 0.6 : 1,
                pointerEvents: blockedReason ? "none" : "auto",
              }}
            >
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

              {/* Categoria (único campo de taxonomia visível) */}
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
                <div className="text-xs text-slate-500 mt-1">
                  Subcategoria aplicada automaticamente: <b>Serviços</b>
                </div>
              </div>

              {/* Se Categoria = Outros, abre um campo livre para especificar */}
              {isOutros && (
                <div>
                  <label style={labelStyle}>
                    Detalhe a categoria (livre) *
                  </label>
                  <input
                    name="outrosCategoriaTexto"
                    value={form.outrosCategoriaTexto}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Descreva sua categoria"
                    required
                  />
                </div>
              )}

              {/* Estado base (local do prestador) */}
              <div>
                <label style={labelStyle}>
                  <MapPin size={15} /> Estado (UF) Sua Localização*
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

              {/* Disponibilidade */}
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

            {/* ===== Cobertura / Abrangência (igual Perfil) ===== */}
            <div className="card">
              <div className="card-title">Cobertura / Abrangência</div>

              <label className="checkbox" style={{ marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={form.atendeBrasil}
                  onChange={() => toggleUfAtendida("BRASIL")}
                />
                <span>Atendo o Brasil inteiro</span>
              </label>

              {!form.atendeBrasil && (
                <>
                  <div className="label" style={{ marginTop: 8 }}>
                    Selecione UFs
                  </div>
                  <div className="grid grid-cols-8 gap-2 max-sm:grid-cols-4">
                    {UFS.map((uf) => {
                      const checked = form.ufsAtendidas.includes(uf);
                      return (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => toggleUfAtendida(uf)}
                          className="pill"
                          style={{
                            background: checked ? "#219EBC" : "#f3f6fa",
                            color: checked ? "#fff" : "#023047",
                            borderColor: checked ? "#1a7a93" : "#e6e9ef",
                          }}
                          title={
                            checked
                              ? "Selecionado"
                              : "Clique para selecionar"
                          }
                        >
                          {checked && <Check size={12} />}
                          {uf}
                        </button>
                      );
                    })}
                  </div>
                  {form.ufsAtendidas.length === 0 && (
                    <div className="hint">
                      Dica: selecione pelo menos 1 UF ou marque “Brasil
                      inteiro”.
                    </div>
                  )}
                </>
              )}
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
              disabled={loading || !!blockedReason}
              style={{
                background: "linear-gradient(90deg,#fb8500,#219ebc)",
                color: "#fff",
                border: "none",
                borderRadius: 13,
                padding: "16px 0",
                fontWeight: 800,
                fontSize: 22,
                boxShadow: "0 2px 20px #fb850022",
                cursor:
                  loading || blockedReason ? "not-allowed" : "pointer",
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
              onMouseLeave={(e) =>
                (e.currentTarget.style.filter = "none")
              }
            >
              {loading ? (
                <Loader2 className="animate-spin w-7 h-7" />
              ) : (
                <Save className="w-6 h-6" />
              )}
              {loading
                ? "Enviando para curadoria..."
                : "Cadastrar Serviço"}
            </button>

            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft
                ? "Salvando rascunho..."
                : "Rascunho salvo automaticamente"}
            </div>
          </form>
          <style jsx>{`
            /* === mesmo visual do Perfil === */
            .card {
              background: #fff;
              border-radius: 20px;
              box-shadow: 0 4px 28px #0001;
              padding: 24px 22px;
              border: 1px solid #e6ebf2;
            }
            .card-title {
              font-weight: 900;
              color: #023047;
              font-size: 1.2rem;
              margin-bottom: 14px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .label {
              font-weight: 800;
              color: #023047;
              margin-bottom: 6px;
              display: block;
            }
            .checkbox {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-weight: 800;
              color: #023047;
            }
            .pill {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              border: 1px solid #e6e9ef;
              border-radius: 999px;
              padding: 8px 12px;
              font-weight: 800;
              font-size: 0.95rem;
              transition: transform 0.02s, filter 0.15s;
            }
            .pill:active {
              transform: translateY(1px);
            }
            .hint {
              margin-top: 8px;
              font-size: 12px;
              color: #64748b;
            }
          `}</style>
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

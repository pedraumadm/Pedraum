"use client";

import AuthGateRedirect from "@/components/AuthGateRedirect";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import nextDynamic from "next/dynamic";
import {
  Loader2,
  Save,
  Tag,
  MapPin,
  CheckCircle2,
  Sparkles,
  Upload,
  BookOpen,
  Info,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

/** ============ SSR/ISR ============ */
export const dynamic = "force-dynamic";
const PDFUploader = nextDynamic(() => import("@/components/PDFUploader"), {
  ssr: false,
});
const DrivePDFViewer = nextDynamic(
  () => import("@/components/DrivePDFViewer"),
  { ssr: false },
);

/* ================== Tipos e Constantes ================== */
type FormState = {
  titulo: string;
  descricao: string;

  /** Estes campos existem apenas para compatibilidade futura; ficarão vazios aqui */
  categoria: string;
  subcategoria: string;
  itemFinal: string;
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
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

const RASCUNHO_KEY = "pedraum:create-demandas:draft_v3";

/* ================== Página interna ================== */
function CreateDemandaContent() {
  const router = useRouter();

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    titulo: "",
    descricao: "",

    // categorias vazias por padrão (ADM fará curadoria)
    categoria: "",
    subcategoria: "",
    itemFinal: "",
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
                  "titulo","descricao",
                  "estado","cidade","prazo",
                  "autorNome","autorEmail","autorWhatsapp","whatsapp",
                ].includes(k),
              ),
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
          autorWhatsapp:
            prev.autorWhatsapp || prof?.whatsapp || prof?.telefone || "",
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
          { cache: "no-store" },
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

  /* ---------- Handlers ---------- */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  /* ---------- Preview ---------- */
  const preview = useMemo(() => {
    const local = form.estado
      ? `${form.cidade ? form.cidade + ", " : ""}${form.estado}`
      : "—";
    return {
      titulo: form.titulo?.trim() || "—",
      caminho: "A definir pela curadoria",
      local,
      prazo: form.prazo || "—",
      imagens: imagens.length,
    };
  }, [form, imagens]);

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

    // Agora exigimos apenas os campos essenciais
    const baseOk = !!(
      form.titulo &&
      form.descricao &&
      form.prazo &&
      form.estado &&
      form.cidade
    );

    if (!baseOk) {
      setError("Preencha todos os campos obrigatórios (*).");
      setSubmitting(false);
      return;
    }

    try {
      const searchBase = [
        form.titulo,
        form.descricao,
        form.estado,
        form.cidade,
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

        // Taxonomia será definida pelo ADM
        categoria: "",
        subcategoria: "",
        itemFinal: "",
        categoriaPath: [] as string[],

        // Sinalizadores de curadoria
        curated: false, // ADM ainda não categorizou
        curationNotes: "",

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
      style={{
        background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)",
      }}
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
            Quanto mais detalhes, melhor a conexão com fornecedores ideais. Você
            pode anexar imagens e PDF.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 22 }}
        >
          {/* Anexos */}
          <div
            className="rounded-2xl border"
            style={{
              background: "linear-gradient(180deg,#f8fbff, #ffffff)",
              borderColor: "#e6ebf2",
              padding: 18,
            }}
          >
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" /> Arquivos do pedido
            </h3>

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
                  <strong className="text-[#0f172a]">Imagens (opcional)</strong>
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
                    Adicione até 5 imagens reais para contextualizar.
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
                    Anexo PDF (opcional)
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
                      Envie orçamento, memorial ou ficha técnica (até ~8MB).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label style={labelStyle}>
                <Tag size={15} /> Título da Demanda *
              </label>
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
              <label style={labelStyle}>
                <CheckCircle2 size={15} /> Prazo (urgência) *
              </label>
              <select
                name="prazo"
                value={form.prazo}
                onChange={handleChange}
                style={inputStyle}
                required
              >
                <option value="">Selecione</option>
                <option value="urgente">Urgente</option>
                <option value="até 3 dias">Até 3 dias</option>
                <option value="até 7 dias">Até 7 dias</option>
                <option value="até 15 dias">Até 15 dias</option>
                <option value="flexível">Flexível</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label style={labelStyle}>
                <BookOpen size={15} /> Descrição *
              </label>
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

          {/* Localização */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
          >
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" /> Localização
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Estado (UF) *</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecione o Estado</option>
                  {ESTADOS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
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
                  {cidades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dados do autor */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "#e6ebf2", background: "#fff" }}
          >
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-500" /> Seus dados
              (editáveis)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Nome *</label>
                <input
                  name="autorNome"
                  value={form.autorNome}
                  onChange={handleChange}
                  style={inputStyle}
                  required
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label style={labelStyle}>E-mail *</label>
                <input
                  name="autorEmail"
                  value={form.autorEmail}
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
                  name="autorWhatsapp"
                  value={form.autorWhatsapp}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="(xx) xxxxx-xxxx"
                  inputMode="tel"
                />
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div style={previewCardStyle}>
            <div style={{ fontWeight: 800, color: "#023047", marginBottom: 8 }}>
              Pré-visualização
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}
            >
              <div>
                <span style={muted}>Título:</span> {preview.titulo}
              </div>
              <div>
                <span style={muted}>Categoria:</span> {preview.caminho}
              </div>
              <div>
                <span style={muted}>Local:</span> {preview.local}
              </div>
                           <div>
                <span style={muted}>Prazo:</span> {preview.prazo}
              </div>

              <div>
                <span style={muted}>Imagens:</span> {preview.imagens}
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              {savingDraft
                ? "Salvando rascunho..."
                : "Rascunho salvo automaticamente"}
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
            {submitting ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              <Save className="w-5 h-5" />
            )}
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Carregando…
        </div>
      }
    >
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
const smallInfoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};
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

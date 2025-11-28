// app/create-demanda/page.tsx
"use client";

import AuthGateRedirect from "@/components/AuthGateRedirect";
import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  Sparkles,
  Upload,
  Info,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  User as UserIcon,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAfterSaveRedirect } from "@/hooks/useAfterSaveRedirect";

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
  descricao: string;

  // Autor — auto-preenchido, mas o usuário pode editar
  autorNome: string;
  autorEmail: string;
  autorWhatsapp: string;
};

const RASCUNHO_KEY = "pedraum:create-demandas:draft_v5_min_author";
const DESC_MAX = 4000;
const DESC_MIN = 10;
const IMAGES_MAX = 5;

/* ================== Utils ================== */
function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(text: string, max = 80) {
  const base = normalizeText(text);
  if (!base) return [];
  const words = base.split(" ").filter(Boolean);
  // Remove duplicadas preservando ordem
  const uniq: string[] = [];
  for (const w of words) if (!uniq.includes(w)) uniq.push(w);
  return uniq.slice(0, max);
}

function sanitizeWhatsapp(s: string) {
  // Mantém apenas dígitos
  const digits = (s || "").replace(/\D+/g, "");
  return digits;
}

/* ================== Página interna ================== */
function CreateDemandaContent() {
  const router = useRouter();
  const goAfterSave = useAfterSaveRedirect("/demandas");

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    descricao: "",
    autorNome: "",
    autorEmail: "",
    autorWhatsapp: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const descLen = form.descricao?.length || 0;
  const descPct = Math.min(100, Math.round((descLen / DESC_MAX) * 100));
  const firstInvalidRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  /* ---------- Autosave local (carrega) ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RASCUNHO_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.form) {
        setForm((prev) => ({
          ...prev,
          descricao: p.form.descricao ?? prev.descricao,
          autorNome: p.form.autorNome ?? prev.autorNome,
          autorEmail: p.form.autorEmail ?? prev.autorEmail,
          autorWhatsapp: p.form.autorWhatsapp ?? prev.autorWhatsapp,
        }));
      }
      if (Array.isArray(p?.imagens)) setImagens(p.imagens.slice(0, IMAGES_MAX));
      if (typeof p?.pdfUrl === "string" || p?.pdfUrl === null) setPdfUrl(p.pdfUrl);
    } catch {
      /* ignore */
    }
  }, []);

  /* ---------- Autosave local (salva) ---------- */
  useEffect(() => {
    const draft = { form, imagens, pdfUrl };
    setSavingDraft(true);
    const id = setTimeout(() => {
      try {
        localStorage.setItem(RASCUNHO_KEY, JSON.stringify(draft));
      } catch {
        // ignore quota
      }
      setSavingDraft(false);
    }, 400);
    return () => clearTimeout(id);
  }, [form, imagens, pdfUrl]);

  /* ---------- Autofill do autor (editável) ---------- */
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

  /* ---------- Handlers ---------- */
  const handleDescChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, DESC_MAX);
      setForm((prev) => ({ ...prev, descricao: value }));
    },
    [],
  );

  const handleAutorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      // Normaliza apenas o WhatsApp; os demais mantidos como digitados
      const next =
        name === "autorWhatsapp" ? sanitizeWhatsapp(value) : value;
      setForm((prev) => ({ ...prev, [name]: next }));
    },
    [],
  );

  /* ---------- Preview (mínimo) ---------- */
  const preview = useMemo(() => {
    const resumo =
      form.descricao?.trim().length > 0
        ? form.descricao.trim().slice(0, 140) +
          (form.descricao.trim().length > 140 ? "…" : "")
        : "—";
    return {
      descricaoResumo: resumo,
      anexos: imagens.length + (pdfUrl ? 1 : 0),
      autor:
        [form.autorNome, form.autorEmail, form.autorWhatsapp]
          .filter(Boolean)
          .join(" • ") || "—",
    };
  }, [
    form.descricao,
    form.autorNome,
    form.autorEmail,
    form.autorWhatsapp,
    imagens.length,
    pdfUrl,
  ]);

  /* ---------- Submit ---------- */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return; // evita duplo clique
      setError(null);
      setSuccess(null);
      setSubmitting(true);
      firstInvalidRef.current = null;

      const user = auth.currentUser;
      if (!user) {
        setError("Você precisa estar logado para cadastrar uma demanda.");
        setSubmitting(false);
        return;
      }

      // Regras mínimas
      if (!form.descricao || form.descricao.trim().length < DESC_MIN) {
        setError(`Descreva com pelo menos ${DESC_MIN} caracteres o que você precisa.`);
        setSubmitting(false);
        // tenta focar a descrição
        setTimeout(() => {
          const el = document.querySelector<HTMLTextAreaElement>("textarea[name='descricao']");
          el?.focus();
        }, 0);
        return;
      }

      try {
        // Keywords para busca (curadoria posterior mantém esses dados)
        const searchKeywords = extractKeywords(form.descricao);

        // Limita imagens por segurança
        const safeImages = Array.isArray(imagens)
          ? imagens.slice(0, IMAGES_MAX)
          : [];

        const payload = {
          // Conteúdo essencial
          descricao: form.descricao.trim(),

          // Anexos opcionais
          imagens: safeImages,
          pdfUrl: pdfUrl || null,
          imagesCount: safeImages.length,

          // Publicação/curadoria
          status: "pending", // <— NÃO aparece no feed
          curated: false,
          curationNotes: "",
          publishedAt: null,
          curatedBy: null,
          curatedAt: null,

          // Autor (editável pelo usuário antes do envio)
          submittedBy: user.uid,
          autorNome: form.autorNome || "",
          autorEmail: form.autorEmail || "",
          autorWhatsapp: form.autorWhatsapp || "",

          // Busca básica
          searchKeywords,

          // Metadados
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        } as const;

        await addDoc(collection(db, "demandas"), payload);

        try {
          localStorage.removeItem(RASCUNHO_KEY);
        } catch {
          /* ignore */
        }

        setSuccess("Recebemos sua demanda! Nossa equipe vai revisar e publicar.");

        // 🔁 Padrão global: depois de salvar, voltar/lista
        goAfterSave();
      } catch (err) {
        console.error(err);
        setError("Erro ao cadastrar. Tente novamente em instantes.");
      } finally {
        setSubmitting(false);
      }
    },
    [form, imagens, pdfUrl, submitting, goAfterSave],
  );

  /* ---------- UI ---------- */
  return (
    <main
      className="min-h-screen flex flex-col items-center py-8 px-2 sm:px-4"
      style={{
        background:
          "linear-gradient(135deg, #f7f9fb 0%, #ffffff 45%, #eaf2fa 100%)",
      }}
    >
      {/* Topbar */}
      <div className="w-full max-w-4xl px-2 mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
          style={{
            background: "linear-gradient(90deg,#e0e7ef,#f8fafc)",
            border: "1.5px solid #cfd8e3",
            color: "#023047",
          }}
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-orange-500" />
          Voltar
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {savingDraft ? "Salvando rascunho..." : "Rascunho salvo automaticamente"}
        </div>
      </div>

      {/* Card principal */}
      <section
        className="w-full"
        style={{
          maxWidth: 920,
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 6px 40px rgba(2,48,71,0.06)",
          padding: "40px 2vw 48px 2vw",
          border: "1px solid #eef2f7",
        }}
      >
        <AuthGateRedirect />

        {/* Header */}
        <div className="mb-6">
          <h1
            className="flex items-center gap-3"
            style={{
              fontSize: "2.35rem",
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-0.5px",
            }}
          >
            <Sparkles className="w-9 h-9 text-orange-500" />
            Cadastrar Demanda
          </h1>
          <p className="mt-2 text-slate-600">
            Descreva o que você precisa e, se quiser, anexe imagens e um PDF.
            Sua solicitação passa por <strong>curadoria</strong> antes de ir ao
            feed.
          </p>
        </div>

        {/* Aviso */}
        <div style={hintCardStyle} className="mb-6" role="status" aria-live="polite">
          <Info className="w-5 h-5" />
          <p style={{ margin: 0 }}>
            Apenas a <strong>descrição</strong> é obrigatória. Seus dados abaixo
            são preenchidos automaticamente e podem ser editados.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Descrição */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#e6ebf2" }}>
            <label htmlFor="descricao" style={labelStyle}>Descrição da necessidade *</label>
            <textarea
              id="descricao"
              name="descricao"
              value={form.descricao}
              onChange={handleDescChange}
              style={{ ...inputStyle, height: 180 }}
              placeholder="Ex.: Preciso de manutenção corretiva em britadeira; ruído anormal no rolamento, preferência por atendimento em até 7 dias."
              required
              maxLength={DESC_MAX}
              aria-describedby="descricaoHelp"
            />
            <div id="descricaoHelp" className="sr-only">
              Descreva o que você precisa em pelo menos {DESC_MIN} caracteres.
            </div>

            {/* Barra de progresso de caracteres */}
            <div className="mt-2 flex items-center justify-between" aria-live="polite">
              <div className="h-2 w-full rounded-full bg-slate-100 mr-3 overflow-hidden" aria-hidden>
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${descPct}%`,
                    background:
                      descLen >= DESC_MIN
                        ? "linear-gradient(90deg,#219ebc,#fb8500)"
                        : "#f59e0b",
                  }}
                />
              </div>
              <div style={smallInfoStyle}>
                {descLen}/{DESC_MAX}
              </div>
            </div>
          </div>

          {/* Dados do autor */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "#e6ebf2", background: "#fff" }}
          >
            <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-orange-500" /> Seus dados (opcional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="autorNome" style={labelStyle}>
                  <UserIcon size={15} /> Nome
                </label>
                <input
                  id="autorNome"
                  name="autorNome"
                  value={form.autorNome}
                  onChange={handleAutorChange}
                  style={inputStyle}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="autorEmail" style={labelStyle}>
                  <Mail size={15} /> E-mail
                </label>
                <input
                  id="autorEmail"
                  name="autorEmail"
                  value={form.autorEmail}
                  onChange={handleAutorChange}
                  style={inputStyle}
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
              <div>
                <label htmlFor="autorWhatsapp" style={labelStyle}>
                  <MessageCircle size={15} /> WhatsApp
                </label>
                <input
                  id="autorWhatsapp"
                  name="autorWhatsapp"
                  value={form.autorWhatsapp}
                  onChange={handleAutorChange}
                  style={inputStyle}
                  placeholder="(xx) xxxxx-xxxx"
                  inputMode="tel"
                  autoComplete="tel"
                />
                {!!form.autorWhatsapp && form.autorWhatsapp.length < 10 && (
                  <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Verifique se o número está completo.
                  </div>
                )}
              </div>
            </div>
          </div>

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
              <Upload className="w-5 h-5 text-orange-500" /> Anexos (opcional)
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
                  <strong className="text-[#0f172a]">Imagens</strong>
                </div>
                <div className="px-4 pb-4">
                  <ImageUploader
                    imagens={imagens}
                    setImagens={(arr) => setImagens((arr || []).slice(0, IMAGES_MAX))}
                    max={IMAGES_MAX}
                    labels={{
                      title: "Imagens",
                      helper:
                        "Arraste as fotos aqui ou clique em “Selecionar imagens”.",
                      button: "Selecionar imagens",
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-2" aria-live="polite">
                    Máximo de {IMAGES_MAX} imagens (8MB cada). Atual: {imagens.length}
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
                  <strong className="text-[#0f172a]">Arquivo PDF</strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <PDFUploader
                    onUploaded={setPdfUrl}
                    maxSizeMB={16}
                    labels={{
                      title: "Arquivo PDF",
                      helper: "",
                      button: "Selecionar PDF",
                    }}
                  />

                  {pdfUrl ? (
                    <div
                      className="rounded-lg border overflow-hidden"
                      style={{ height: 300 }}
                    >
                      <DrivePDFViewer
                        fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(
                          pdfUrl || "",
                        )}`}
                        height={300}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Envie orçamento/memorial/ficha técnica (opcional).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div style={previewCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span style={{ fontWeight: 800, color: "#023047" }}>
                Antes da publicação:
              </span>
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}
            >
              <div>
                <span style={muted}>Resumo:</span> {preview.descricaoResumo}
              </div>
              <div>
                <span style={muted}>Anexos:</span> {preview.anexos}
              </div>
              <div>
                <span style={muted}>Autor:</span> {preview.autor}
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }} aria-live="polite">
              {savingDraft
                ? "Salvando rascunho..."
                : "Rascunho salvo automaticamente"}
            </div>
          </div>

          {/* Alertas */}
          {error && <div style={errorStyle} role="alert">{error}</div>}
          {success && <div style={successStyle} role="status" aria-live="polite">{success}</div>}

          {/* Botão principal */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting
                ? "linear-gradient(90deg,#94a3b8,#94a3b8)"
                : "linear-gradient(90deg,#fb8500,#219ebc)",
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
              transition: "transform .08s ease",
            }}
            aria-busy={submitting}
            aria-label="Enviar para Curadoria"
          >
            {submitting ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {submitting ? "Enviando..." : "Enviar para Curadoria"}
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
const smallInfoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};
const muted: React.CSSProperties = { color: "#6b7280" };

"use client";

import AuthGateRedirect from "@/components/AuthGateRedirect";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import nextDynamic from "next/dynamic";
import {
  ArrowLeft,
  CheckCircle2,
  CircleCheck,
  CircleDot,
  Clock,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Save,
  Sparkles,
  XCircle,
  Ban,
  ShieldCheck,
} from "lucide-react";
import { useAfterSaveRedirect } from "@/hooks/useAfterSaveRedirect";

/** ======= SSR ======= */
export const dynamic = "force-dynamic";
const DrivePDFViewer = nextDynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

/** ======= Tipos ======= */
type StatusT = "pending" | "approved" | "in_progress" | "rejected" | "closed";
type DemandMeta = {
  status?: StatusT;
  curated?: boolean;
  curationNotes?: string;
  curatedAt?: Timestamp | null;
  curatedBy?: string | null;
  publishedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};
type ViewData = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  outraCategoriaTexto?: string;
  prazo?: string;
  estado?: string;
  cidade?: string;
  autorNome?: string;
  autorEmail?: string;
  autorWhatsapp?: string;
  imagens?: string[];
  pdfUrl?: string | null;
};

const DESC_MAX = 4000;
const DESC_MIN = 10;

/** ======= Utils ======= */
function toDate(ts?: Timestamp | null) {
  try {
    return ts ? ts.toDate() : null;
  } catch {
    return null;
  }
}
function fmt(d: Date | null) {
  return d ? d.toLocaleString("pt-BR") : "—";
}
function statusInfo(status?: StatusT) {
  switch (status) {
    case "approved":
      return {
        label: "Aprovada",
        color: "#065f46",
        bg: "#ecfdf5",
        icon: CircleCheck,
        desc: "Sua demanda foi aprovada e pode ser exibida no feed.",
      };
    case "in_progress":
      return {
        label: "Em andamento",
        color: "#1d4ed8",
        bg: "#eff6ff",
        icon: Clock,
        desc: "Sua demanda está em andamento pela nossa equipe.",
      };
    case "rejected":
      return {
        label: "Rejeitada",
        color: "#991b1b",
        bg: "#fef2f2",
        icon: XCircle,
        desc: "Sua demanda foi rejeitada na curadoria.",
      };
    case "closed":
      return {
        label: "Encerrada",
        color: "#334155",
        bg: "#f1f5f9",
        icon: Ban,
        desc: "Demanda concluída/encerrada.",
      };
    case "pending":
    default:
      return {
        label: "Em curadoria",
        color: "#92400e",
        bg: "#fffbeb",
        icon: CircleDot,
        desc: "Aguardando revisão do administrador antes de ir ao feed.",
      };
  }
}
function StatusHeader({
  meta,
  sInfo,
}: {
  meta: {
    status?: string;
    curationNotes?: string;
    createdAt?: any;
    curatedAt?: any;
    publishedAt?: any;
    updatedAt?: any;
  };
  sInfo: ReturnType<typeof statusInfo>;
}) {
  const StatusIcon = sInfo.icon as any;

  return (
    <div
      className="w-full max-w-3xl"
      style={{
        borderRadius: 16,
        border: "1.5px solid #e7edf5",
        background:
          "linear-gradient(180deg,#f7fbff 0%, #ffffff 42%, #f3f7fb 100%)",
        boxShadow: "0 6px 28px rgba(2,48,71,0.06)",
        padding: 14,
      }}
    >
      {/* linha 1: status pill + descrição */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              fontWeight: 900,
              letterSpacing: "-0.2px",
              border: `1.5px solid ${sInfo.bg}`,
              background: sInfo.bg,
              color: sInfo.color,
            }}
            title={sInfo.label}
          >
            <StatusIcon size={16} />
            {sInfo.label}
          </span>

          {/* label fixa da página */}
          <div
            style={{
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-0.2px",
            }}
          >
            Status da demanda
          </div>
        </div>

        {/* atualizado em */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#64748b",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            padding: "6px 10px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          <Clock size={14} />
          Atualizado: {fmt(toDate(meta.updatedAt))}
        </div>
      </div>

      {/* linha 2: descrição/nota curadoria */}
      <div style={{ marginTop: 8 }}>
        <div style={{ color: "#0f172a", fontSize: 14 }}>{sInfo.desc}</div>
        {meta.status === "rejected" && !!meta.curationNotes && (
          <div
            style={{
              marginTop: 8,
              borderRadius: 10,
              border: "1.5px dashed #fecaca",
              background: "#fff",
              color: "#7f1d1d",
              padding: "10px 12px",
              fontSize: 14,
            }}
          >
            <strong>Motivo da rejeição:</strong> {meta.curationNotes}
          </div>
        )}
      </div>

      {/* linha 3: metas (chips) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0,1fr))",
          gap: 10,
          marginTop: 12,
        }}
      >
        <MetaStat
          icon={<Sparkles size={16} />}
          label="Criada"
          value={fmt(toDate(meta.createdAt))}
        />
        <MetaStat
          icon={<CheckCircle2 size={16} />}
          label="Publicada/Curada"
          value={fmt(toDate(meta.publishedAt) || toDate(meta.curatedAt))}
        />
        <MetaStat
          icon={<Clock size={16} />}
          label="Última atualização"
          value={fmt(toDate(meta.updatedAt))}
        />
      </div>
    </div>
  );
}

function MetaStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1.5px solid #e7edf5",
        background: "#ffffff",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 800,
          color: "#023047",
          marginBottom: 4,
          fontSize: 13,
        }}
      >
        {icon} {label}
      </div>
      <div style={{ color: "#475569", fontSize: 13 }}>{value}</div>
    </div>
  );
}

/** ======= Página interna ======= */
function EditDemandaContent() {
  const router = useRouter();
  const { id = "" } = (useParams() as { id?: string });

  // 🔁 redirect padrão após salvar
  const goAfterSave = useAfterSaveRedirect("/minhas-demandas");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [meta, setMeta] = useState<DemandMeta>({ status: "pending" });
  const [view, setView] = useState<ViewData>({});
  const [descricao, setDescricao] = useState("");

  // carrega em tempo real
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const ref = doc(db, "demandas", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setError("Demanda não encontrada.");
          setLoading(false);
          return;
        }
        const d = snap.data() as DocumentData;

        setView({
          titulo: d.titulo ?? "",
          descricao: d.descricao ?? "",
          categoria: d.categoria ?? "",
          subcategoria: d.subcategoria ?? "",
          outraCategoriaTexto: d.outraCategoriaTexto ?? "",
          prazo: d.prazo ?? "",
          estado: d.estado ?? "",
          cidade: d.cidade ?? "",
          autorNome: d.autorNome ?? "",
          autorEmail: d.autorEmail ?? "",
          autorWhatsapp: d.autorWhatsapp ?? "",
          imagens: Array.isArray(d.imagens) ? d.imagens : [],
          pdfUrl: typeof d.pdfUrl === "string" ? d.pdfUrl : null,
        });

        setDescricao(d.descricao ?? ""); // espelha a descrição vinda do servidor

        setMeta({
          status: (d.status as StatusT) ?? "pending",
          curated: !!d.curated,
          curationNotes: d.curationNotes ?? "",
          curatedAt: d.curatedAt ?? null,
          curatedBy: d.curatedBy ?? null,
          publishedAt: d.publishedAt ?? null,
          createdAt: d.createdAt ?? null,
          updatedAt: d.updatedAt ?? null,
        });

        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Erro ao carregar a demanda.");
        setLoading(false);
      },
    );
    return () => unsub();
  }, [id]);

  const sInfo = statusInfo(meta.status);
  const descLen = descricao?.length ?? 0;
  const descPct = Math.min(100, Math.round((descLen / DESC_MAX) * 100));
  const canEdit = meta.status === "pending"; // regra: só edita enquanto em curadoria
  const changed = descricao !== (view.descricao ?? "");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      const user = auth.currentUser;
      if (!user) {
        setError("Você precisa estar logado para editar a demanda.");
        return;
      }

      if (!canEdit) {
        setError("Edição bloqueada. A demanda não está mais em curadoria.");
        return;
      }
      if (!descricao || descricao.trim().length < DESC_MIN) {
        setError(`Descreva com pelo menos ${DESC_MIN} caracteres o que você precisa.`);
        return;
      }
      if (!changed) {
        setSuccess("Nada para salvar.");
        return;
      }

      try {
        setSaving(true);

        // gera keywords simples como no create
        const searchBase = descricao
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        await updateDoc(doc(db, "demandas", id), {
          descricao: descricao.trim(),
          searchKeywords: searchBase ? searchBase.split(" ").slice(0, 80) : [],
          updatedAt: serverTimestamp(),
        });

        setSuccess("Descrição atualizada com sucesso!");

        // 🔁 depois de salvar, volta para a listagem/minhas demandas
        goAfterSave();
      } catch (err) {
        console.error(err);
        setError("Erro ao salvar. Tente novamente.");
      } finally {
        setSaving(false);
      }
    },
    [id, canEdit, descricao, changed, goAfterSave],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-3" />
          <div className="font-bold text-slate-700">Carregando demanda…</div>
        </div>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center py-8 px-2 sm:px-4"
      style={{ background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)" }}
    >
      {/* Topbar */}
      <div className="w-full max-w-3xl px-2 mb-3 flex justify-between items-center">
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

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Atualiza em tempo real
        </div>
      </div>

      {/* STATUS HEADER */}
      <StatusHeader meta={meta} sInfo={sInfo} />

      {/* Card principal */}
      <section
        style={{
          maxWidth: 820,
          width: "100%",
          background: "#fff",
          borderRadius: 22,
          boxShadow: "0 4px 32px #0001",
          padding: "32px 2vw 40px 2vw",
          border: "1px solid #eef2f7",
        }}
      >
        <AuthGateRedirect />

        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 900,
            color: "#023047",
            letterSpacing: "-0.7px",
            margin: "0 0 18px 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Sparkles className="w-8 h-8 text-orange-500" />
          Editar descrição da demanda
        </h1>

        {/* aviso de bloqueio */}
        {!canEdit && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff7ed",
              color: "#9a3412",
              border: "1.6px solid #fed7aa",
              padding: "10px 12px",
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            <Info className="w-5 h-5" />
            <div>
              Edição desabilitada porque a demanda não está mais em curadoria.
              Caso precise corrigir algo, fale com o suporte.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Descrição (único campo editável) */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#e6ebf2" }}>
            <label style={labelStyle}>Descrição da necessidade *</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value.slice(0, DESC_MAX))}
              style={{ ...inputStyle, height: 160 }}
              placeholder="Ex.: Detalhe aqui a necessidade com o máximo de contexto possível."
              required
              maxLength={DESC_MAX}
              disabled={!canEdit}
            />
            {/* barra de contagem */}
            <div className="mt-2 flex items-center justify-between">
              <div className="h-2 w-full rounded-full bg-slate-100 mr-3 overflow-hidden">
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

          {/* Ficha (somente leitura) */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}
          >
            <div
              className="font-black tracking-tight mb-2"
              style={{ color: "#023047" }}
            >
              Ficha da demanda (visualização)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 8,
                color: "#334155",
              }}
            >
              <div>
                <strong>Título:</strong> {view.titulo || "—"}
              </div>
              <div>
                <strong>Categoria:</strong> {view.categoria || "—"} •{" "}
                <strong>Subcategoria/Texto:</strong>{" "}
                {view.categoria === "Outros"
                  ? view.outraCategoriaTexto || "—"
                  : view.subcategoria || "—"}
              </div>
              <div>
                <strong>Prazo:</strong> {view.prazo || "—"}
              </div>
              <div>
                <strong>Local:</strong>{" "}
                {view.cidade
                  ? `${view.cidade}${view.estado ? `, ${view.estado}` : ""}`
                  : view.estado || "—"}
              </div>
              <div>
                <strong>Autor:</strong>{" "}
                {[view.autorNome, view.autorEmail, view.autorWhatsapp]
                  .filter(Boolean)
                  .join(" • ") || "—"}
              </div>
            </div>

            {/* anexos somente leitura */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* imagens */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "#e6ebf2", background: "#fff" }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap: 2">
                  <ImageIcon className="w-4 h-4 text-sky-700" />
                  <strong className="text-[#0f172a]">Imagens</strong>
                </div>
                <div className="px-4 pb-4">
                  {view.imagens && view.imagens.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 8,
                      }}
                    >
                      {view.imagens.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md overflow-hidden border"
                          style={{ borderColor: "#e5e7eb" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`Imagem ${i + 1}`}
                            style={{
                              width: "100%",
                              height: 90,
                              objectFit: "cover",
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Nenhuma imagem anexada.
                    </p>
                  )}
                </div>
              </div>

              {/* pdf */}
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "#e6ebf2", background: "#fff" }}
              >
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-600" />
                  <strong className="text-[#0f172a]">Arquivo PDF</strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  {view.pdfUrl ? (
                    <div
                      className="rounded-lg border overflow-hidden"
                      style={{ height: 260 }}
                    >
                      <DrivePDFViewer
                        fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(
                          view.pdfUrl,
                        )}`}
                        height={260}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Nenhum PDF anexado.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* alertas */}
          {error && (
            <div style={errorStyle} role="alert">
              {error}
            </div>
          )}
          {success && (
            <div style={successStyle} role="status" aria-live="polite">
              {success}
            </div>
          )}

          {/* ações */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={!canEdit || saving || !changed}
              style={{
                background:
                  !canEdit || saving || !changed
                    ? "linear-gradient(90deg,#94a3b8,#94a3b8)"
                    : "linear-gradient(90deg,#fb8500,#219ebc)",
                color: "#fff",
                border: "none",
                borderRadius: 13,
                padding: "14px 18px",
                fontWeight: 800,
                fontSize: 18,
                boxShadow: "0 8px 40px rgba(251,133,0,0.25)",
                cursor:
                  !canEdit || saving || !changed ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {saving ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "Salvando..." : "Salvar descrição"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/minhas-demandas")}
              className="inline-flex items-center gap-2"
              style={{
                background: "#f1f5f9",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                borderRadius: 13,
                padding: "14px 18px",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Minhas Demandas
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/** ======= Wrapper Suspense ======= */
export default function EditDemandaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Carregando…
        </div>
      }
    >
      <EditDemandaContent />
    </Suspense>
  );
}

/** ======= estilos ======= */
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
  border: "1.6px solid #e5e7eb",   // ✅ aqui
  fontSize: 16,
  color: "#0f172a",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 6,
  outline: "none",
  marginTop: 2,
  minHeight: 46,
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
  border: "1.5px solid #c3f3d5",   // ✅ e aqui
  padding: "12px 0",
  borderRadius: 11,
  textAlign: "center",
  fontWeight: 700,
};

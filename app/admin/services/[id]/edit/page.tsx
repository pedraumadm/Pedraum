// app/admin/services/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Loader as LoaderIcon,
  ArrowLeft,
  Save,
  Tag,
  DollarSign,
  MapPin,
  Globe,
  CalendarClock,
  Info,
  User2,
  IdCard,
  Calendar as CalendarIcon,
} from "lucide-react";

/* ===================== Curadoria: tipos ===================== */
type ServiceStatus =
  | "em_curadoria"
  | "aprovado"
  | "recusado"
  | "ajustes_solicitados"
  | "pausado"
  | "ativo"
  | "inativo"
  | "expirado";

/* ===================== Curadoria: ações ===================== */
async function approveAndPublishService(serviceId: string) {
  const ref = doc(db, "services", serviceId);
  await updateDoc(ref, {
    status: "aprovado",
    visivel: true,
    curadoriaStatus: "aprovado",
    curadoriaBy: "admin",
    curadoriaAt: serverTimestamp(),
    approvedBy: "admin",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function rejectService(serviceId: string) {
  const ref = doc(db, "services", serviceId);
  await updateDoc(ref, {
    status: "recusado",
    visivel: false,
    curadoriaStatus: "recusado",
    curadoriaBy: "admin",
    curadoriaAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function backToPendingService(serviceId: string) {
  const ref = doc(db, "services", serviceId);
  await updateDoc(ref, {
    status: "em_curadoria",
    visivel: false,
    curadoriaStatus: "pendente",
    curadoriaBy: "admin",
    curadoriaAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* ===================== Tipos ===================== */
type ServiceDoc = {
  // principais
  titulo?: string;
  descricao?: string;
  categoria?: string;
  preco?: number | string;
  estado?: string;
  abrangencia?: string;
  abrangenciaLabel?: string;
  disponibilidade?: string;

  // mídia
  imagens?: string[];
  imagesCount?: number;

  // autor
  vendedorId?: string;
  prestadorNome?: string;
  prestadorEmail?: string;
  prestadorWhatsapp?: string;

  // meta/busca
  searchKeywords?: string[];
  status?: ServiceStatus;
  statusHistory?: Array<{ status: string; at: any }>;
  tipo?: string;
  visivel?: boolean;

  // curadoria
  curadoriaStatus?: string;
  curadoriaBy?: string | null;
  curadoriaAt?: any;

  // datas
  createdAt?: any;
  updatedAt?: any;
  expiraEm?: Timestamp;
};

/* ===================== Constantes ===================== */
const categorias = [
  "Mecânico de Máquinas Pesadas",
  "Elétrica Industrial",
  "Transporte de Equipamentos",
  "Soldador",
  "Montagem/Desmontagem",
  "Lubrificação e Manutenção",
  "Assistência Técnica",
  "Operação de Máquinas",
  "Treinamento de Operadores",
  "Manutenção Preventiva",
  "Calibração",
  "Consultoria Técnica",
  "Topografia",
  "Transporte de Cargas",
  "Segurança do Trabalho",
  "Locação de Equipamentos",
  "Outros",
];

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
];

const disponibilidades = [
  "Manhã",
  "Tarde",
  "Noite",
  "Integral",
  "24 horas",
  "Sob consulta",
];

const statusOpts: ServiceStatus[] = [
  "em_curadoria",
  "aprovado",
  "recusado",
  "ajustes_solicitados",
  "pausado",
  "ativo",
  "inativo",
  "expirado",
];

/* ===================== Página ===================== */
export default function EditServiceAdminPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId =
    typeof params?.id === "string" ? params.id : (params?.id as string[])[0];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [curating, setCurating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // mídia
  const [imagens, setImagens] = useState<string[]>([]);

  // principais
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    preco: "", // string; ao salvar vira number ou "Sob consulta"
    estado: "",
    abrangencia: "",
    disponibilidade: "",
  });

  // autor
  const [vendedorId, setVendedorId] = useState<string>("");
  const [prestadorNome, setPrestadorNome] = useState<string>("");
  const [prestadorEmail, setPrestadorEmail] = useState<string>("");
  const [prestadorWhatsapp, setPrestadorWhatsapp] = useState<string>("");

  // meta / curadoria
  const [status, setStatus] = useState<ServiceStatus>("em_curadoria");
  const [tipo, setTipo] = useState<string>("serviço");
  const [visivel, setVisivel] = useState<boolean>(false);
  const [curadoriaStatus, setCuradoriaStatus] = useState<string>("pendente");
  const [curadoriaBy, setCuradoriaBy] = useState<string | null>(null);

  // datas
 const [createdAtStr, setCreatedAtStr] = useState<string>("");
const [expiraEmInput, setExpiraEmInput] = useState<string>(""); // yyyy-MM-dd

  /* ===================== carregar serviço ===================== */
  useEffect(() => {
    (async () => {
      try {
        if (!serviceId) return;
        setLoading(true);
        const ref = doc(db, "services", serviceId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("Serviço não encontrado.");
          router.push("/admin/services");
          return;
        }
        const s = snap.data() as ServiceDoc;

        // principais
        setForm({
          titulo: s.titulo || "",
          descricao: s.descricao || "",
          categoria: s.categoria || "",
          preco:
            typeof s.preco === "number"
              ? String(s.preco)
              : s.preco === "Sob consulta" || !s.preco
              ? ""
              : String(s.preco),
          estado: s.estado || "",
          abrangencia: s.abrangenciaLabel || s.abrangencia || "",
          disponibilidade: s.disponibilidade || "",
        });

        // mídia
        setImagens(Array.isArray(s.imagens) ? s.imagens : []);

        // autor
        setVendedorId(s.vendedorId || "");
        setPrestadorNome(s.prestadorNome || "");
        setPrestadorEmail(s.prestadorEmail || "");
        setPrestadorWhatsapp(s.prestadorWhatsapp || "");

        // meta / curadoria
        setStatus((s.status as ServiceStatus) ?? "em_curadoria");
        setTipo(s.tipo || "serviço");
        setVisivel(!!s.visivel);
        setCuradoriaStatus(s.curadoriaStatus || "pendente");
        setCuradoriaBy(s.curadoriaBy ?? null);

        // datas
        setCreatedAtStr(
          s.createdAt?.seconds
            ? new Date(s.createdAt.seconds * 1000).toLocaleString("pt-BR")
            : ""
        );
        if (s.expiraEm?.seconds) {
  const d = new Date(s.expiraEm.seconds * 1000);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  setExpiraEmInput(`${y}-${m}-${day}`);
} else {
  setExpiraEmInput("");
}

      } catch (e) {
        console.error(e);
        setError("Erro ao carregar serviço.");
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId, router]);

  /* ===================== helpers ===================== */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  function removeImg(i: number) {
    setImagens((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveImg(i: number, dir: number) {
    setImagens((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  function normalizeSearchBase(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeDateToMiddayUTC(d: Date) {
  // evita voltar 1 dia por causa de timezone
  d.setHours(12, 0, 0, 0);
}


  /* ===================== persistência ===================== */
  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);

  if (
    !form.titulo ||
    !form.descricao ||
    !form.categoria ||
    !form.estado ||
    !form.abrangencia ||
    !form.disponibilidade
  ) {
    setError("Preencha todos os campos obrigatórios (*).");
    return;
  }
  if (imagens.length === 0) {
    setError("Adicione pelo menos uma imagem do serviço.");
    return;
  }
  if (!prestadorNome || !prestadorEmail) {
    setError("Preencha nome e e-mail do prestador.");
    return;
  }

  // preço
  let preco: number | string = "Sob consulta";
  if (form.preco.trim() !== "") {
    const n = Number(form.preco);
    if (!Number.isNaN(n) && n >= 0) preco = Number(n.toFixed(2));
  }

  // expiração
  let expiraEmTS: Timestamp | undefined;
  if (expiraEmInput) {
    const d = new Date(expiraEmInput + "T00:00:00");
    if (!Number.isNaN(d.getTime())) {
      normalizeDateToMiddayUTC(d);
      expiraEmTS = Timestamp.fromDate(d);
    }
  }

  const currentAdminId = auth.currentUser?.uid || curadoriaBy || null;

  const searchBaseRaw = [
    form.titulo,
    form.descricao,
    form.categoria,
    String(preco),
    form.estado,
    form.abrangencia,
    form.disponibilidade,
    prestadorNome,
  ]
    .filter(Boolean)
    .join(" ");

  const searchBase = normalizeSearchBase(searchBaseRaw);

  try {
    setSaving(true);

    const payload: Partial<ServiceDoc> = {
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      preco,
      estado: form.estado,
      abrangencia: form.abrangencia,
      abrangenciaLabel: form.abrangencia,
      disponibilidade: form.disponibilidade,

      imagens,
      imagesCount: imagens.length,

      vendedorId,
      prestadorNome,
      prestadorEmail,
      prestadorWhatsapp,

      status: status ?? "em_curadoria",
      tipo: tipo || "serviço",
      visivel,
      searchKeywords: searchBase.split(/\s+/).slice(0, 60),

      curadoriaStatus,
      curadoriaBy: currentAdminId,
      curadoriaAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
      ...(expiraEmTS ? { expiraEm: expiraEmTS } : {}),
    };

    await updateDoc(doc(db, "services", serviceId), payload);
    alert("Serviço atualizado com sucesso!");
    router.push("/admin/services");
  } catch (e) {
    console.error(e);
    setError("Erro ao salvar. Tente novamente.");
  } finally {
    setSaving(false);
  }
}

  /* ===================== Ações de curadoria (3 botões) ===================== */
  const wrapCuradoria = (fn: () => Promise<void>) => async () => {
    try {
      setCurating(true);
      await fn();

      // Atualiza UI local
      const snap = await getDoc(doc(db, "services", serviceId));
      if (snap.exists()) {
        const s = snap.data() as ServiceDoc;
        setStatus((s.status as ServiceStatus) ?? "em_curadoria");
        setVisivel(!!s.visivel);
        setCuradoriaStatus(s.curadoriaStatus || "pendente");
        setCuradoriaBy(s.curadoriaBy ?? null);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao executar ação de curadoria.");
    } finally {
      setCurating(false);
    }
  };

  const doApprove = wrapCuradoria(async () => {
    await approveAndPublishService(serviceId);
  });

  const doReject = wrapCuradoria(async () => {
    await rejectService(serviceId);
  });

  const doBack = wrapCuradoria(async () => {
    await backToPendingService(serviceId);
  });

  /* ===================== render ===================== */
  if (loading) {
    return (
      <div style={centerBox}>
        <LoaderIcon className="animate-spin" size={24} />
        &nbsp; Carregando serviço...
      </div>
    );
  }

  return (
    <section
      style={{ maxWidth: 1240, margin: "0 auto", padding: "42px 2vw 60px 2vw" }}
    >
      <Link href="/admin/services" style={backLink}>
        <ArrowLeft size={19} /> Voltar
      </Link>

      <div style={card}>
        {/* Header + meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h2 style={cardTitle}>Editar Serviço (Admin)</h2>
          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
              color: "#64748b",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 800,
              }}
            >
              <User2 size={16} />
              <span>{prestadorNome || "—"}</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "monospace",
              }}
            >
              <IdCard size={16} />
              <span>{vendedorId || "—"}</span>
            </div>
          </div>
        </div>

        <div style={metaLine}>
          <div>
            <b>ID:</b> {serviceId}
          </div>
          {createdAtStr && (
            <div>
              <b>Criado:</b> {createdAtStr}
            </div>
          )}
        </div>

        {/* ===== Status + Ações (3 botões - igual produtos) ===== */}
        <div style={{ margin: "8px 0 18px", display: "grid", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                fontWeight: 900,
                fontSize: 12,
                ...(status === "aprovado"
                  ? { background: "#ecfdf5", color: "#065f46" }
                  : status === "recusado"
                  ? { background: "#fff1f2", color: "#9f1239" }
                  : status === "pausado"
                  ? { background: "#f1f5f9", color: "#111827" }
                  : { background: "#f1f5f9", color: "#111827" }),
              }}
            >
              Status: {status} • Visível: <b>{visivel ? "Sim" : "Não"}</b>
            </span>
            <div style={{ flex: 1 }} />

            {status !== "aprovado" && (
              <button
                type="button"
                onClick={doApprove}
                disabled={curating}
                style={primaryBtn}
              >
                {curating ? "Processando…" : "Aprovar"}
              </button>
            )}

            {status !== "recusado" && (
              <button
                type="button"
                onClick={doReject}
                disabled={curating}
                style={dangerBtn}
              >
                {curating ? "Processando…" : "Rejeitar"}
              </button>
            )}

            <button
              type="button"
              onClick={doBack}
              disabled={curating}
              style={ghostBtn}
            >
              {curating ? "Processando…" : "Voltar p/ curadoria"}
            </button>
          </div>
        </div>

        {/* Dica */}
        <div style={infoBox}>
          <Info size={16} />{" "}
          <span>
            Preço vazio vira <b>Sob consulta</b>. Aqui você também controla a{" "}
            <b>curadoria</b> e se o serviço aparece ou não na vitrine pública.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Imagens */}
          <label style={label}>Imagens do Serviço *</label>

          <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
          <div style={hintText}>
            Adicione 1 ou mais imagens reais ou de referência do serviço.
          </div>

          {/* Miniaturas compactas */}
          <div style={thumbWrap}>
            {imagens.map((url, idx) => (
              <div key={url + idx} style={thumbItem}>
                <img src={url} alt={`imagem ${idx + 1}`} style={thumbImg} />
                <div style={thumbActions}>
                  <button
                    type="button"
                    onClick={() => moveImg(idx, -1)}
                    style={miniBtn}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImg(idx, +1)}
                    style={miniBtn}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImg(idx)}
                    style={{ ...miniBtn, background: "#e11d48" }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Título */}
          <label style={label}>
            <Tag size={16} /> Título *
          </label>
          <input
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            required
            placeholder="Ex: Manutenção corretiva em britador"
            style={input}
            maxLength={80}
          />

          {/* Grid */}
          <div style={twoCols}>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <DollarSign size={16} /> Valor (R$)
              </label>
              <input
                name="preco"
                value={form.preco}
                onChange={handleChange}
                type="number"
                min={0}
                step={0.01}
                placeholder="Ex: 1200 (opcional)"
                style={input}
              />
              <div style={hintText}>Pré-visualização: {precoPreview}</div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={label}>
                Categoria *
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                required
                style={input}
              >
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={twoCols}>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <MapPin size={16} /> Estado (UF) *
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                required
                style={input}
              >
                <option value="">Selecione</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={label}>
                <Globe size={16} /> Abrangência *
              </label>
              <input
                name="abrangencia"
                value={form.abrangencia}
                onChange={handleChange}
                placeholder="Ex: Minas Gerais, Sudeste, Brasil inteiro..."
                maxLength={60}
                required
                style={input}
              />
            </div>
          </div>

          <div style={{ maxWidth: 520 }}>
            <label style={label}>
              <CalendarClock size={16} /> Disponibilidade *
            </label>
            <select
              name="disponibilidade"
              value={form.disponibilidade}
              onChange={handleChange}
              required
              style={input}
            >
              <option value="">Selecione</option>
              {disponibilidades.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <label style={label}>
            <Tag size={16} /> Descrição detalhada *
          </label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            required
            placeholder="Descreva o serviço, experiência, materiais, área de atendimento, diferenciais, etc."
            style={{ ...input, minHeight: 110, resize: "vertical" }}
            maxLength={400}
          />

          {/* Autor */}
          <div style={sectionCard}>
            <div style={sectionTitle}>
              <User2 size={16} /> Dados do prestador
            </div>
            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={miniLabel}>Nome *</label>
                <input
                  value={prestadorNome}
                  onChange={(e) => setPrestadorNome(e.target.value)}
                  style={input}
                  required
                  placeholder="Nome"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={miniLabel}>E-mail *</label>
                <input
                  type="email"
                  value={prestadorEmail}
                  onChange={(e) => setPrestadorEmail(e.target.value)}
                  style={input}
                  required
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div style={{ maxWidth: 420 }}>
              <label style={miniLabel}>WhatsApp (opcional)</label>
              <input
                value={prestadorWhatsapp}
                onChange={(e) => setPrestadorWhatsapp(e.target.value)}
                style={input}
                placeholder="(xx) xxxxx-xxxx"
                inputMode="tel"
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 6,
                color: "#64748b",
                fontFamily: "monospace",
              }}
            >
              <IdCard size={14} /> {vendedorId || "—"}
            </div>
          </div>

          {/* Status + Expiração */}
                    <div style={sectionCard}>
                      <div style={sectionTitle}>
                        <Info size={16} /> Status & Expiração
                      </div>
                      <div style={twoCols}>
                        <div style={{ flex: 1 }}>
                          <label style={miniLabel}>Status</label>
                          <select
                            value={status || "ativo"}
                            onChange={(e) => setStatus(e.target.value as any)}
                            style={input}
                          >
                            {statusOpts.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={miniLabel}>
                            <CalendarIcon size={14} /> Expira em
                          </label>
                         <input
  type="date"
  value={expiraEmInput}
  onChange={(e) => setExpiraEmInput(e.target.value)}
  style={input}
/>

                          <div style={hintText}>
                            Deixe em branco para manter a data atual.
                          </div>
                        </div>
                      </div>
                    </div>

          {/* Erro */}
          {error && <div style={errorBox}>{error}</div>}

          {/* Ações */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 14,
              justifyContent: "space-between",
            }}
          >
            <div />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" disabled={saving} style={primaryBtn}>
                <Save size={18} />{" "}
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

/* ===================== Estilos ===================== */
const backLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 18,
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 16,
  textDecoration: "none",
};
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 2px 16px #0001",
  padding: "26px 22px",
};
const cardTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.55rem",
  color: "#023047",
  marginBottom: 10,
};
const metaLine: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 12,
  color: "#94a3b8",
  fontSize: 13,
};
const twoCols: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  marginTop: 6,
};
const label: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
  color: "#2563eb",
  marginBottom: 7,
  marginTop: 14,
  display: "block",
};
const miniLabel: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 12,
  color: "#64748b",
  marginBottom: 6,
  display: "block",
};
const input: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "12px 13px",
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  fontSize: 16,
  color: "#023047",
  background: "#f8fafc",
  fontWeight: 600,
  outline: "none",
};
const hintText: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 6,
};
const infoBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #e8eaf0",
  background: "#f3f6fa",
  color: "#64748b",
  fontWeight: 700,
  padding: "10px 12px",
  borderRadius: 12,
  margin: "6px 0 14px 0",
};
const sectionCard: React.CSSProperties = {
  background: "#f8fafc",
  border: "1.5px solid #eaeef4",
  borderRadius: 14,
  padding: "14px 12px",
  marginTop: 12,
};
const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  color: "#023047",
  marginBottom: 8,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
const errorBox: React.CSSProperties = {
  background: "#fff7f7",
  color: "#d90429",
  border: "1.5px solid #ffe5e5",
  padding: "12px 0",
  borderRadius: 11,
  textAlign: "center",
  marginTop: 10,
  fontWeight: 700,
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  fontWeight: 900,
  fontSize: "0.95rem",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  boxShadow: "0 2px 14px #0001",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "#f8fafc",
  color: "#0f172a",
  border: "1.5px solid #e5e7eb",
  fontWeight: 800,
  fontSize: "0.95rem",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};
const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "#e11d48",
};
const thumbWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 10,
  marginTop: 10,
};
const thumbItem: React.CSSProperties = {
  border: "1.5px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  background: "#fff",
};
const thumbImg: React.CSSProperties = {
  width: "100%",
  height: 160,
  objectFit: "cover",
  display: "block",
};
const thumbActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "space-between",
  padding: "8px 10px",
  borderTop: "1px solid #eef2f7",
  background: "#f8fafc",
};
const miniBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  padding: "6px 8px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 1px 6px #2563eb22",
};
const centerBox: React.CSSProperties = {
  minHeight: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#2563eb",
};

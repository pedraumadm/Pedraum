"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
  orderBy,
  limit,
  onSnapshot,
  arrayRemove,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import {
  Loader as LoaderIcon,
  ArrowLeft,
  Save,
  Trash2,
  Upload,
  Tag,
  Send,
  Users,
  Filter,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  LockOpen,
  CreditCard,
  Undo2,
  XCircle,
  Ban,
  Layers,
  FileText,
  Image as ImageIcon,
  Search,
  ExternalLink,
  Copy,
  MessageCircle,
  Info,
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import nextDynamic from "next/dynamic";
import { useTaxonomia } from "@/hooks/useTaxonomia";

// Lazy (iguais ao create)
const PDFUploader = nextDynamic(() => import("@/components/PDFUploader"), { ssr: false }) as any;
const DrivePDFViewer = nextDynamic(() => import("@/components/DrivePDFViewer"), { ssr: false }) as any;

/* ================== Tipos ================== */
type DemandaStatus = "pending" | "approved" | "rejected";

type Usuario = {
  id: string;
  nome?: string;
  email?: string;
  whatsapp?: string;       // legado — pode estar em qualquer formato
  whatsappE164?: string;   // dígitos "55..."
  telefone?: string;       // legado/livre
  estado?: string;
  ufs?: string[];
  ufsAtendidas?: string[];
  atendeBrasil?: boolean;
  cidade?: string;
  categorias?: string[];
  categoriasAtuacaoPairs?: { categoria: string; subcategoria?: string }[];
  atuacaoBasica?: { categoria: string; subcategoria?: string }[];
  categoriesAll?: string[];
  photoURL?: string;
  bio?: string;
  descricaoPublica?: string;
  sobre?: string;
  observacoesPublicas?: string;
  patrocinador?: boolean;
  rating?: number;
  jobsConcluidos?: number;
  createdAt?: any;
  ultimaAtividade?: any;
  
};

type PaymentStatus = "pending" | "paid";
type AssignmentStatus = "sent" | "viewed" | "unlocked" | "canceled";

type Assignment = {
  id: string;
  demandId: string;
  supplierId: string;
  status: AssignmentStatus;
  pricing?: {
    amount?: number;
    currency?: string;
    exclusive?: boolean;
    cap?: number | null;
    soldCount?: number;
  };
  paymentStatus?: PaymentStatus;
  createdAt?: any;
  updatedAt?: any;
  unlockedByAdmin?: boolean;
  unlockedAt?: any;
  notes?: string;
};

type Demanda = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  // ❌ itemFinal removido do fluxo
  estado?: string;
  cidade?: string;
  prazo?: string;
  orcamento?: number | string | null;
  whatsapp?: string; // legado
  observacoes?: string;
  imagens?: string[];
  pdfUrl?: string | null;
  tags?: string[];
  pricingDefault?: { amount?: number; currency?: string };
  createdAt?: any;
  updatedAt?: any;
  status?: DemandaStatus | string;
  userId?: string;
  unlockCap?: number | null;
  liberadoPara?: string[];
  autorNome?: string;
  autorEmail?: string;
  autorWhatsapp?: string;

  // novos campos de contato
  contatoNome?: string;
  contatoEmail?: string;
  contatoWhatsappE164?: string;   // dígitos “55…”
  contatoWhatsappMasked?: string; // exibição “+55 (DD) …”
};

/* ================== Constantes e Helpers ================== */
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
const UF_MAP: Record<string, string> = {
  "acre":"AC","alagoas":"AL","amapa":"AP","amazonas":"AM","bahia":"BA","ceara":"CE",
  "distrito federal":"DF","espirito santo":"ES","goias":"GO","maranhao":"MA","mato grosso":"MT",
  "mato grosso do sul":"MS","minas gerais":"MG","para":"PA","paraiba":"PB","parana":"PR",
  "pernambuco":"PE","piaui":"PI","rio de janeiro":"RJ","rio grande do norte":"RN","rio grande do sul":"RS",
  "rondonia":"RO","roraima":"RR","santa catarina":"SC","sao paulo":"SP","sergipe":"SE","tocantins":"TO",
  "brasil":"BRASIL","nacional":"BRASIL"
};
const noAcento = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const toUF = (val?: string): string => {
  if (!val) return "";
  const upp = val.toUpperCase().trim();
  if ((UFS as readonly string[]).includes(upp)) return upp;
  return UF_MAP[noAcento(val)] || "";
};
// Chaves possíveis de "texto livre" que o vendedor preenche no /perfil
const BIO_KEYS = [
  "bio",
  "descricaoPublica",
  "sobre",
  "observacoesPublicas",
  "descricao",
  "about",
  "obsPublicas",
];

function firstNonEmptyString(obj: any, keys: string[]): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Constrói chips/linhas de atuação a partir de usuarios.{atuacaoBasica} */
function buildAtuacaoBullets(u: any): string[] {
  const out: string[] = [];
  const arr = Array.isArray(u?.atuacaoBasica) ? u.atuacaoBasica : [];
  for (const a of arr) {
    if (!a?.categoria) continue;
    const parts: string[] = [];
    if (a?.vendaProdutos?.ativo && a?.vendaProdutos?.obs) {
      parts.push(`Produtos: ${a.vendaProdutos.obs}`);
    }
    if (a?.vendaPecas?.ativo && a?.vendaPecas?.obs) {
      parts.push(`Peças: ${a.vendaPecas.obs}`);
    }
    if (a?.servicos?.ativo && a?.servicos?.obs) {
      parts.push(`Serviços: ${a.servicos.obs}`);
    }
    if (parts.length) out.push(`${a.categoria}: ${parts.join(" | ")}`);
  }
  return out;
}

const extractUFsFromFreeText = (val?: string): string[] => {
  if (!val) return [];
  const parts = val.replace(/[|/\\\-–—,;:\(\)\[\]]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (const p of parts) {
    const uf = toUF(p);
    if (uf) out.add(uf);
  }
  return Array.from(out);
};
const getUFSetFromUser = (u: any): Set<string> => {
  const out = new Set<string>();
  const addMaybe = (x?: string) => { const uf = toUF(x || ""); if (uf) out.add(uf); };

  (u.ufs || []).forEach(addMaybe);
  (u.ufsAtendidas || []).forEach(addMaybe);
  [u.estado, u.state, u.uf, u.endereco?.uf, u.endereco?.estado].forEach(addMaybe);
  [u.cidade, u.localizacao, u.regioes, u.regioesAtendidas, u.endereco?.cidade]
    .forEach((x: string) => extractUFsFromFreeText(x).forEach((uf) => out.add(uf)));
  if (u.atendeBrasil) out.add("BRASIL");
  return out;
};
const toReais = (cents?: number) => `R$ ${(Number(cents || 0) / 100).toFixed(2).replace(".", ",")}`;
const reaisToCents = (val: string) => {
  const n = Number(String(val || "0").replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
};
const norm = (s?: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

// ——— WhatsApp BR: normalização para dígitos E.164 BR **sem “+”** (ex.: "5531998765432")
function normalizeBRWhatsappDigits(raw?: string): string {
  let d = onlyDigits(raw || "");
  if (!d) return "";
  d = d.replace(/^0+/, "");
  while (d.startsWith("555")) d = "55" + d.slice(3);
  if (d.startsWith("55")) {
    let rest = d.slice(2);
    if (rest.length > 11) rest = rest.slice(0, 11);
    if (rest.length !== 10 && rest.length !== 11) return "";
    return "55" + rest;
  }
  if (d.length === 10 || d.length === 11) return "55" + d;
  if (d.length > 11) {
    const tail11 = d.slice(-11);
    const tail10 = d.slice(-10);
    if (/^\d{11}$/.test(tail11)) return "55" + tail11;
    if (/^\d{10}$/.test(tail10)) return "55" + tail10;
  }
  return "";
}
function maskFrom55Digits(d55?: string): string {
  if (!d55 || !d55.startsWith("55")) return "";
  const ddd = d55.slice(2, 4);
  const core = d55.slice(4);
  if (core.length === 8) return `+55 (${ddd}) ${core.slice(0, 4)}-${core.slice(4)}`;
  if (core.length === 9) return `+55 (${ddd}) ${core.slice(0, 5)}-${core.slice(5)}`;
  return `+55 (${ddd}) ${core}`;
}
function ensurePlus55Prefix(masked: string) {
  const t = (masked || "").trim();
  return t.startsWith("+55") ? t : `+55 ${t.replace(/^\+?/, "")}`;
}
function isValidBRWhatsappDigits(d55: string) {
  if (!/^55\d{10,11}$/.test(d55)) return false;
  const ddd = d55.slice(2, 4);
  return /^\d{2}$/.test(ddd);
}
// Formata input live: mantém máscara +55 (DD) ...
function formatWhatsappBRIntl(inp: string): string {
  const d = normalizeBRWhatsappDigits(inp);
  return d ? maskFrom55Digits(d) : ensurePlus55Prefix(inp);
}

function extractDigits55FromMasked(masked: string): string {
  return normalizeBRWhatsappDigits(masked);
}

/* ================== Página ================== */
export default function EditDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const demandaId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : "";

  // Taxonomia – agora só Categoria e Subcategoria
  const { categorias, loading: taxLoading } = useTaxonomia() as {
    categorias: { nome: string; slug?: string; subcategorias?: { nome: string; slug?: string }[] }[];
    loading: boolean;
  };

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [demandaStatus, setDemandaStatus] = useState<DemandaStatus>("pending");

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<{
    titulo: string;
    descricao: string;
    categoria: string;
    subcategoria: string;
    estado: string;
    cidade: string;
    prazo: string;
    orcamento: string;
    whatsapp: string; // legado (não exibimos)
    observacoes: string;
    contatoNome: string;
    contatoEmail: string;
    contatoWhatsappMasked: string; // UI
  }>({
    titulo: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    estado: "",
    cidade: "",
    prazo: "",
    orcamento: "",
    whatsapp: "",
    observacoes: "",
    contatoNome: "",
    contatoEmail: "",
    contatoWhatsappMasked: "",
  });

  const [createdAt, setCreatedAt] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [precoPadraoReais, setPrecoPadraoReais] = useState<string>("19,90");
  const [precoEnvioReais, setPrecoEnvioReais] = useState<string>("");
  const [unlockCap, setUnlockCap] = useState<number | null>(null);

  // Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  // Envios (stream)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const jaEnviados = useMemo(() => new Set(assignments.map((a) => a.supplierId)), [assignments]);

  // Filtros
  const [fCat, setFCat] = useState("");
  const [fUF, setFUF] = useState("");
  const [qUser, setQUser] = useState("");

  const subsForm = useMemo(
    () => categorias.find((c) => c.nome === form.categoria)?.subcategorias ?? [],
    [categorias, form.categoria]
  );

  /* ================== Carregar Demanda ================== */
  useEffect(() => {
    async function fetchDemanda() {
      if (!demandaId) return;
      setLoading(true);
      const snap = await getDoc(doc(db, "demandas", demandaId));
      if (!snap.exists()) {
        alert("Demanda não encontrada.");
        router.push("/admin/demandas");
        return;
      }
      const d = snap.data() as Demanda;

      // status
      setDemandaStatus((d.status as DemandaStatus) || "pending");

      // contato/telefone
      const rawWpp = d.contatoWhatsappE164 || d.autorWhatsapp || d.whatsapp || "";
      const d55 = normalizeBRWhatsappDigits(rawWpp);

      setForm({
        titulo: d.titulo || "",
        descricao: d.descricao || "",
        categoria: d.categoria || "",
        subcategoria: d.subcategoria || "",
        estado: d.estado || "",
        cidade: d.cidade || "",
        prazo: d.prazo || "",
        orcamento: d.orcamento != null ? String(d.orcamento) : "",
        whatsapp: d.whatsapp || "",
        observacoes: d.observacoes || "",
        contatoNome: d.contatoNome || d.autorNome || "",
        contatoEmail: (d.contatoEmail || d.autorEmail || "").toLowerCase(),
        contatoWhatsappMasked: d55 ? maskFrom55Digits(d55) : "",
      });

      setTags(d.tags || []);
      setImagens(d.imagens || []);
      setPdfUrl(d.pdfUrl ?? null);
      setUserId(d.userId || "");

      setCreatedAt(
        d.createdAt?.seconds
          ? new Date(d.createdAt.seconds * 1000).toLocaleString("pt-BR")
          : ""
      );

      const cents = d?.pricingDefault?.amount ?? 1990;
      setPrecoPadraoReais((cents / 100).toFixed(2).replace(".", ","));
      setPrecoEnvioReais((cents / 100).toFixed(2).replace(".", ","));
      setUnlockCap(typeof d.unlockCap === "number" ? d.unlockCap : null);

      // Pré-filtro sugerido
      setFCat(d.categoria || "");
      setFUF(d.estado || "");
      setLoading(false);
    }
    fetchDemanda();
  }, [demandaId, router]);

  /* ================== Stream assignments ================== */
  useEffect(() => {
    if (!demandaId) return;
    const qAssign = query(collection(db, "demandAssignments"), where("demandId", "==", demandaId), limit(2000));
    const unsub = onSnapshot(qAssign, (snap) => {
      const arr: Assignment[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAssignments(arr);
    });
    return () => unsub();
  }, [demandaId]);

  /* ================== Normaliza doc de usuário ================== */
  function docToUsuario(d: any): Usuario {
    const raw = d.data ? (d.data() as any) : (d as any);

    const out: Usuario = {
      id: d.id ?? raw.id,
      ...raw,
       bio: firstNonEmptyString(raw, BIO_KEYS),
      categorias: Array.isArray(raw.categorias) ? raw.categorias : [],
      categoriasAtuacaoPairs: Array.isArray(raw.categoriasAtuacaoPairs) ? raw.categoriasAtuacaoPairs : [],
      atuacaoBasica: Array.isArray(raw.atuacaoBasica) ? raw.atuacaoBasica : [],
      categoriesAll: Array.isArray(raw.categoriesAll) ? raw.categoriesAll : [],
      ufs: Array.isArray(raw.ufs) ? raw.ufs : Array.isArray(raw.ufsAtendidas) ? raw.ufsAtendidas : [],
      atendeBrasil: !!raw.atendeBrasil,
    };
    return out;
  }

  /* ================== Busca de usuários (multicoleção + dedupe) ================== */
  const userCacheRef = useRef<Map<string, Usuario>>(new Map());

  async function smartFetchUsuarios() {
    setLoadingUsuarios(true);
    try {
      const collectionsToRead = ["usuarios", "users", "user"];
      const mapById = new Map<string, Usuario>();
      const mapByEmail = new Map<string, string>(); // email -> id

      for (const colName of collectionsToRead) {
        try {
          const snap = await getDocs(query(collection(db, colName), orderBy("nome"), limit(1200)));
          snap.forEach((d) => {
            const u = docToUsuario(d);
            if (!u.id) return;
            if (!mapById.has(u.id)) {
              mapById.set(u.id, u);
              userCacheRef.current.set(u.id, u);
            }
            const mail = (u.email || "").trim().toLowerCase();
            if (mail && !mapByEmail.has(mail)) mapByEmail.set(mail, u.id);
          });
        } catch {
          // coleção pode não existir/sem índice — ignorar
        }
      }

      let all = Array.from(mapById.values());

      // filtros Categoria/UF
      const ufFilter = (fUF || "").trim();
      const catFilter = norm(fCat);

      if (catFilter) {
        all = all.filter((u) => {
          const cats: string[] = [];
          if (Array.isArray(u.categorias)) cats.push(...u.categorias);
          if (Array.isArray(u.categoriesAll)) cats.push(...u.categoriesAll);
          if (Array.isArray(u.categoriasAtuacaoPairs)) cats.push(...u.categoriasAtuacaoPairs.map((p) => p?.categoria));
          if (Array.isArray(u.atuacaoBasica)) cats.push(...u.atuacaoBasica.map((a) => a?.categoria));
          return cats.some((c) => c && norm(c).includes(catFilter));
        });
      }

      if (ufFilter) {
        const wantedUF = toUF(ufFilter) || ufFilter.toUpperCase();
        all = all.filter((u) => {
          if (wantedUF === "BRASIL" || u.atendeBrasil) return true;
          const setUF = getUFSetFromUser(u);
          return setUF.has(wantedUF) || setUF.has("BRASIL");
        });
      }

      // ordena por nome
      all.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

      setUsuarios(all);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  // load inicial + quando filtros mudam
  useEffect(() => { smartFetchUsuarios(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { smartFetchUsuarios(); /* eslint-disable-next-line */ }, [fCat, fUF]);

  // Busca local
  const usuariosVisiveis = useMemo(() => {
    const t = norm(qUser);
    if (!t) return usuarios;
    return usuarios.filter((u) => {
      const nome = norm(u.nome || "");
      const email = norm(u.email || "");
      const whatsapp = norm(u.whatsappE164 || u.whatsapp || u.telefone || "");
      const cidade = norm(u.cidade || "");
      const id = (u.id || "").toLowerCase();
      return nome.includes(t) || email.includes(t) || whatsapp.includes(t) || cidade.includes(t) || id.includes(t);
    });
  }, [usuarios, qUser]);

  /* ================== Handlers básicos ================== */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name === "categoria") {
      setForm((f) => ({ ...f, categoria: value, subcategoria: "" }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim() && tags.length < 3) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput("");
      e.preventDefault();
    }
  }
  function removeTag(idx: number) {
    setTags((prev) => prev.filter((_, i) => i !== idx));
  }

  // curadoria
  async function approveAndPublish() {
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        status: "approved",
        curated: true,
        curatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        curationNotes: (form.observacoes || "").trim(),
      });
      setDemandaStatus("approved");
      alert("Demanda aprovada e publicada no feed.");
    } catch (e) {
      alert("Falha ao aprovar/publicar.");
    }
  }
  async function rejectDemand() {
    if (!window.confirm("Tem certeza que deseja REJEITAR esta demanda?")) return;
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        status: "rejected",
        curated: true,
        curatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        curationNotes: (form.observacoes || "").trim(),
        publishedAt: null,
      });
      setDemandaStatus("rejected");
      alert("Demanda rejeitada.");
    } catch {
      alert("Falha ao rejeitar.");
    }
  }
  async function backToPending() {
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        status: "pending",
        curated: false,
        curatedAt: null,
        updatedAt: serverTimestamp(),
        publishedAt: null,
      });
      setDemandaStatus("pending");
      alert("Demanda voltou para pendente (não aparece no feed).");
    } catch {
      alert("Falha ao voltar para pendente.");
    }
  }

  /* ================== Persistência da demanda ================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const cents = reaisToCents(precoPadraoReais);

      const e164Digits = extractDigits55FromMasked(form.contatoWhatsappMasked || "");
      const contatoOk = !form.contatoWhatsappMasked || isValidBRWhatsappDigits(e164Digits);
      if (!contatoOk) {
        alert("WhatsApp inválido. Use o formato +55 (DDD) número.");
        setSalvando(false);
        return;
      }

      await updateDoc(doc(db, "demandas", demandaId), {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        subcategoria: form.subcategoria,
        // ❌ itemFinal removido do fluxo
        estado: form.estado,
        cidade: form.cidade,
        prazo: form.prazo,
        orcamento: form.orcamento ? Number(form.orcamento) : null,
        observacoes: form.observacoes || "",
        tags,
        imagens,
        pdfUrl: pdfUrl || null,
        pricingDefault: { amount: cents, currency: "BRL" },
        unlockCap: unlockCap ?? null,

        // contato — persistência padronizada
        contatoNome: form.contatoNome.trim(),
        contatoEmail: form.contatoEmail.trim().toLowerCase(),
        contatoWhatsappMasked: form.contatoWhatsappMasked || "",
        contatoWhatsappE164: e164Digits || "",

        // compat
        autorNome: form.contatoNome.trim(),
        autorEmail: form.contatoEmail.trim().toLowerCase(),
        autorWhatsapp: e164Digits || "",
        whatsapp: e164Digits || form.whatsapp || "",

        updatedAt: serverTimestamp(),
      });

      alert("Demanda atualizada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar demanda!");
    }
    setSalvando(false);
  }

  async function handleDelete() {
    if (!window.confirm("Deseja mesmo excluir esta demanda? Esta ação é irreversível!")) return;
    setRemovendo(true);
    try {
      await deleteDoc(doc(db, "demandas", demandaId));
      alert("Demanda excluída.");
      router.push("/admin/demandas");
    } catch {
      alert("Erro ao excluir demanda.");
    }
    setRemovendo(false);
  }

  /* ================== Envio p/ usuários ================== */
  function toggleUsuario(id: string, checked: boolean) {
    setSelUsuarios((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }
  function selecionarTodosVisiveis() {
    setSelUsuarios((prev) =>
      Array.from(new Set([...prev, ...usuariosVisiveis.filter((c) => !jaEnviados.has(c.id)).map((c) => c.id)]))
    );
  }
  function limparSelecao() {
    setSelUsuarios([]);
  }

  async function enviarParaSelecionados() {
    if (!selUsuarios.length) {
      alert("Selecione pelo menos um usuário.");
      return;
    }
    const cents = reaisToCents(precoEnvioReais || precoPadraoReais);
    if (!cents || cents < 100) {
      alert("Defina um preço válido em reais. Ex.: 19,90");
      return;
    }

    setEnvLoading(true);
    try {
      const batch = writeBatch(db);
      selUsuarios.forEach((uid) => {
        if (jaEnviados.has(uid)) return;
        const aRef = doc(db, "demandAssignments", `${demandaId}_${uid}`);
        batch.set(
          aRef,
          {
            demandId: demandaId,
            supplierId: uid,
            status: "sent" as AssignmentStatus,
            pricing: {
              amount: cents,
              currency: "BRL",
              exclusive: false,
              cap: unlockCap ?? null,
              soldCount: 0,
            },
            paymentStatus: "pending" as PaymentStatus,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      batch.update(doc(db, "demandas", demandaId), { lastSentAt: serverTimestamp() });
      await batch.commit();
      alert(`Enviado para ${selUsuarios.length} usuário(s).`);
      setSelUsuarios([]);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Falha ao enviar a demanda.");
    } finally {
      setEnvLoading(false);
    }
  }

  /* ================== Ações por assignment ================== */
  async function setPaymentStatus(supplierId: string, status: PaymentStatus) {
    try {
      const ref = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(ref, { paymentStatus: status, updatedAt: serverTimestamp() });
    } catch {
      alert("Erro ao atualizar pagamento.");
    }
  }
  async function unlockAssignment(supplierId: string) {
    try {
      const curUnlocked = assignments.filter((a) => a.status === "unlocked").length;
      if (unlockCap != null && curUnlocked >= unlockCap) {
        alert(`Limite de desbloqueios atingido (${unlockCap}).`);
        return;
      }
      await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), {
        status: "unlocked",
        unlockedByAdmin: true,
        unlockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paymentStatus: "paid",
      });
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayUnion(supplierId),
        updatedAt: serverTimestamp(),
      });
    } catch {
      alert("Erro ao liberar contato.");
    }
  }
  async function cancelAssignment(supplierId: string) {
    if (!window.confirm("Cancelar o envio? O fornecedor não poderá pagar/desbloquear.")) return;
    try {
      await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), {
        status: "canceled",
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayRemove(supplierId),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => {});
    } catch {
      alert("Erro ao cancelar envio.");
    }
  }
  async function reactivateAssignment(supplierId: string) {
    try {
      await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), {
        status: "sent",
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });
    } catch {
      alert("Erro ao reativar envio.");
    }
  }
  async function deleteAssignment(supplierId: string) {
    if (!window.confirm("Excluir completamente o envio?")) return;
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayRemove(supplierId),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => {});
      await deleteDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`));
    } catch {
      alert("Erro ao excluir envio.");
    }
  }

  /* ================== Modal de Perfil (on-demand) ================== */
  const [openProfileUserId, setOpenProfileUserId] = useState<string | null>(null);
  const [profileLocalPrice, setProfileLocalPrice] = useState<string>("");
  const [profileNote, setProfileNote] = useState<string>("");

  const [profileCache, setProfileCache] = useState<Record<string, Usuario>>({});
  const [profileLoading, setProfileLoading] = useState(false);

  async function openProfile(uid: string) {
    setOpenProfileUserId(uid);
    setProfileLocalPrice(precoPadraoReais);
    setProfileNote("");
    if (profileCache[uid]) return;
    setProfileLoading(true);
    try {
      // tenta “usuarios”, depois “users”, depois “user”
      let s = await getDoc(doc(db, "usuarios", uid));
      if (!s.exists()) s = await getDoc(doc(db, "users", uid));
      if (!s.exists()) s = await getDoc(doc(db, "user", uid));

      if (s.exists()) {
        const u = docToUsuario(s);
        setProfileCache((prev) => ({ ...prev, [uid]: u }));
      }
    } finally {
      setProfileLoading(false);
    }
  }

  async function sendFromProfile(uid: string) {
    const cents = reaisToCents(profileLocalPrice || precoPadraoReais);
    if (!cents || cents < 100) {
      alert("Defina um preço válido (Ex.: 19,90).");
      return;
    }
    try {
      const ref = doc(db, "demandAssignments", `${demandaId}_${uid}`);
      await setDoc(ref, {
        demandId: demandaId,
        supplierId: uid,
        status: "sent" as AssignmentStatus,
        pricing: { amount: cents, currency: "BRL", exclusive: false, cap: unlockCap ?? null, soldCount: 0 },
        paymentStatus: "pending" as PaymentStatus,
        notes: (profileNote || "").trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      alert("Demanda enviada ao usuário.");
      setOpenProfileUserId(null);
    } catch (e: any) {
      alert(e.message || "Falha ao enviar a demanda.");
    }
  }

  /* ================== Contagens úteis ================== */
  const unlockedCount = useMemo(() => assignments.filter((a) => a.status === "unlocked").length, [assignments]);
  const capInfo = unlockCap != null ? `${unlockedCount}/${unlockCap}` : String(unlockedCount);

  /* ================== CSS responsivo pequeno ================== */
  useEffect(() => {
    const styleId = "pedraum-edit-demand-responsive-v4";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.innerHTML = `
      @media (max-width: 860px) {
        input, select, textarea { max-width: 100% !important; }
        .sticky-top { position: sticky; top: 0; background: #fff; z-index: 2; }
      }
    `;
    return () => { try { el && el.remove(); } catch {} };
  }, []);

  /* ================== Render ================== */
  if (loading) {
    return (
      <div style={centerBox}>
        <LoaderIcon className="animate-spin" size={28} />&nbsp; Carregando demanda...
      </div>
    );
  }

  return (
    <section style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 2vw 60px" }}>
      <Link href="/admin/demandas" style={backLink}><ArrowLeft size={19} /> Voltar</Link>

      <div style={gridWrap}>
        {/* ================= Editar Demanda ================= */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={cardTitle}>Editar Necessidade</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Limite de desbloqueios</div>
              <input
                type="number"
                min={0}
                value={unlockCap ?? ""}
                onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                style={{ ...input, width: 110 }}
                placeholder="Ex.: 5"
              />
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Liberados: <b>{capInfo}</b>
              </div>
            </div>
          </div>

          <div style={metaLine}>
            <div><b>ID:</b> {demandaId}</div>
            {createdAt && <div><b>Criada:</b> {createdAt}</div>}
            {userId && <div><b>UserID:</b> {userId}</div>}
          </div>

        {/* Status (somente pill no topo) */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    margin: "8px 0 14px",
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
      ...(demandaStatus === "approved"
        ? { background: "#ecfdf5", color: "#065f46" }
        : demandaStatus === "rejected"
        ? { background: "#fff1f2", color: "#9f1239" }
        : { background: "#f1f5f9", color: "#111827" }),
    }}
  >
    Status: {demandaStatus}
  </span>
</div>


          <form onSubmit={handleSubmit}>
            <label style={label}>Título da Demanda</label>
            <input name="titulo" value={form.titulo} onChange={handleChange} required placeholder="Ex: Preciso de peça X / serviço Y" style={input} />

            <label style={label}>Descrição</label>
            <textarea name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Detalhe sua necessidade..." style={{ ...input, minHeight: 110, resize: "vertical" }} />

            {/* ===== Taxonomia — apenas Categoria e Subcategoria ===== */}
            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Layers size={16} /> Categoria</span></label>
                <select name="categoria" value={form.categoria} onChange={handleChange} required style={input} disabled={taxLoading}>
                  <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
                  {categorias.map((c) => (
                    <option key={c.slug || c.nome} value={c.nome}>{c.nome}</option>
                  ))}
                </select>

                <select name="subcategoria" value={form.subcategoria} onChange={handleChange} required style={input} disabled={!form.categoria}>
                  <option value="">{form.categoria ? "Selecione a subcategoria" : "Selecione a categoria"}</option>
                  {subsForm.map((s) => (
                    <option key={s.slug || s.nome} value={s.nome}>{s.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Estado (UF)</label>
                <select name="estado" value={form.estado} onChange={handleChange} required style={input}>
                  <option value="">Selecione</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Cidade</label>
                <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Ex.: Belo Horizonte" style={input} />
              </div>
            </div>

            {/* Anexos */}
            <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Upload size={16} color="#2563eb" /> Anexos</span></label>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", border: "1px solid #eaeef4", borderRadius: 12, padding: 12 }}>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff" }}>
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-700" />
                  <strong className="text-[#0f172a]">Imagens (opcional)</strong>
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-dashed p-3">
                    <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Adicione até 5 imagens.</p>
                </div>
              </div>

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
                      <DrivePDFViewer fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`} height={300} />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <a href={pdfUrl} target="_blank" rel="noreferrer" style={ghostBtn}>Abrir em nova aba</a>
                        <button type="button" onClick={() => setPdfUrl(null)} style={dangerBtn}>Remover PDF</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Envie orçamento, memorial ou ficha técnica (até ~8MB).</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contato do solicitante */}
            <div style={{ marginTop: 14, padding: 12, border: "1px dashed #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
              <div style={{ fontWeight: 900, color: "#023047", marginBottom: 8 }}>Contato do solicitante</div>
              <div style={twoCols}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Nome</label>
                  <input
                    name="contatoNome"
                    value={form.contatoNome}
                    onChange={(e) => setForm((f) => ({ ...f, contatoNome: e.target.value }))}
                    placeholder="Ex.: João da Silva"
                    style={input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>E-mail</label>
                  <input
                    name="contatoEmail"
                    value={form.contatoEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contatoEmail: e.target.value }))}
                    placeholder="exemplo@empresa.com"
                    style={input}
                    type="email"
                  />
                </div>
              </div>

              <div style={twoCols}>
                <div style={{ flex: 1 }}>
                  <label style={label}>WhatsApp (formato obrigatório +55)</label>
                  <input
                    name="contatoWhatsappMasked"
                    value={form.contatoWhatsappMasked}
                    onChange={(e) => setForm((f) => ({ ...f, contatoWhatsappMasked: formatWhatsappBRIntl(e.target.value) }))}
                    onFocus={() => setForm((f) => ({ ...f, contatoWhatsappMasked: ensurePlus55Prefix(f.contatoWhatsappMasked) }))}
                    onBlur={() => setForm((f) => ({ ...f, contatoWhatsappMasked: formatWhatsappBRIntl(f.contatoWhatsappMasked) }))}
                    placeholder="+55 (DD) número"
                    style={input}
                    maxLength={20}
                    inputMode="tel"
                  />
                  {(() => {
                    const d55 = extractDigits55FromMasked(form.contatoWhatsappMasked);
                    const ok = !form.contatoWhatsappMasked || isValidBRWhatsappDigits(d55);
                    return ok ? null : (
                      <div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>
                        Informe no padrão +55 (DDD) 8–9 dígitos.
                      </div>
                    );
                  })()}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={label}>Orçamento estimado (opcional)</label>
                  <input
                    name="orcamento"
                    value={form.orcamento}
                    onChange={(e) => setForm((f) => ({ ...f, orcamento: e.target.value }))}
                    type="number"
                    min={0}
                    placeholder="R$"
                    style={input}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DollarSign size={16} /> Preço padrão do desbloqueio (R$)</span></label>
              <input value={precoPadraoReais} onChange={(e) => setPrecoPadraoReais(e.target.value)} placeholder="Ex.: 19,90" style={input} />
              <div style={hintText}>Sugerido ao enviar para usuários. Pode ser sobrescrito no envio.</div>
            </div>

            <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Tag size={16} color="#fb8500" /> Referências <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>(até 3)</span></span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (
                <span key={idx} style={chipTag}>
                  {tg}
                  <button type="button" onClick={() => removeTag(idx)} style={chipClose}>×</button>
                </span>
              ))}
              {tags.length < 3 && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Nova tag"
                  maxLength={16}
                  style={{ ...input, width: 140 }}
                />
              )}
            </div>

                        <label style={label}>Observações (opcional)</label>
            <textarea
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
              placeholder="Alguma observação extra?"
              style={{ ...input, minHeight: 70 }}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 14,
                justifyContent: "space-between",
              }}
            >
              {/* Botões de curadoria (lado esquerdo) */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {demandaStatus !== "approved" && (
                  <button
                    type="button"
                    onClick={approveAndPublish}
                    style={{ ...primaryBtn, background: "#16a34a", border: "1px solid #16a34a" }}
                  >
                    <CheckCircle2 size={18} /> Aprovar &amp; Publicar
                  </button>
                )}

                {demandaStatus !== "rejected" && (
                  <button type="button" onClick={rejectDemand} style={dangerBtn}>
                    <XCircle size={18} /> Rejeitar
                  </button>
                )}

                {demandaStatus !== "pending" && (
                  <button type="button" onClick={backToPending} style={ghostBtn}>
                    Voltar a pendente
                  </button>
                )}
              </div>

              {/* Salvar / Excluir (lado direito) */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" disabled={salvando} style={primaryBtn}>
                  <Save size={20} /> {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
                <button
                  type="button"
                  disabled={removendo}
                  onClick={handleDelete}
                  style={dangerBtn}
                >
                  <Trash2 size={20} /> {removendo ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </form>
        </div>

        


        {/* ================= Enviar demanda ================= */}
        <div style={card}>
          <h2 style={cardTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Send size={20} color="#2563eb" /> Enviar esta demanda para usuários</span></h2>

          <div style={twoCols}>
            <div style={{ flex: 1 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DollarSign size={16} /> Preço do envio (R$)</span></label>
              <input value={precoEnvioReais} onChange={(e) => setPrecoEnvioReais(e.target.value)} placeholder={`Sugerido: ${precoPadraoReais}`} style={input} />
              <div style={hintText}>Digite em reais, ex.: 25,00.</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldCheck size={16} /> Limite de desbloqueios (cap)</span></label>
              <input type="number" min={0} value={unlockCap ?? ""} onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} style={input} placeholder="Ex.: 5" />
              <div style={hintText}>A demanda respeita este limite total de desbloqueios.</div>
            </div>
          </div>

          {/* Filtros + Busca local */}
          <div className="sticky-top" style={{ ...twoCols, alignItems: "flex-end", paddingTop: 10, borderBottom: "1px solid #eef2f7", paddingBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div>
                <label style={miniLabel}><Filter size={13} /> Categoria</label>
                <select value={fCat} onChange={(e) => setFCat(e.target.value)} style={{ ...input, width: 260 }} disabled={taxLoading}>
                  <option value="">{taxLoading ? "Carregando..." : "Todas"}</option>
                  {categorias.map((c) => <option key={c.slug || c.nome} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={miniLabel}><Filter size={13} /> UF</label>
                <select value={fUF} onChange={(e) => setFUF(e.target.value)} style={{ ...input, width: 140 }}>
                  <option value="">Todas</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>

              <div>
                <label style={miniLabel}><Search size={13} /> Buscar</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={qUser} onChange={(e) => setQUser(e.target.value)} placeholder="nome, e-mail, whatsapp, cidade ou id" style={{ ...input, width: 280 }} />
                  {qUser && <button type="button" onClick={() => setQUser("")} style={ghostBtn}>Limpar</button>}
                </div>
              </div>

              <button type="button" onClick={() => smartFetchUsuarios()} style={ghostBtn}><RefreshCw size={16} /> Atualizar</button>
            </div>
          </div>

          {/* Lista de usuários */}
          <div style={listBox}>
            <div style={listHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 800, fontSize: 13 }}>
                <Users size={16} /> Usuários
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Selecionados: <b>{selUsuarios.length}</b></div>
            </div>

            <div style={{ maxHeight: "56vh", overflow: "auto" }}>
              {usuariosVisiveis.map((u) => {
  const nome = u.nome || u.email || `Usuário ${u.id}`;
  const contato = u.whatsappE164 || u.whatsapp || u.telefone || "—";
  const regioes = u.atendeBrasil ? "BRASIL" : u.ufs?.length ? u.ufs.join(", ") : u.estado || "—";
  const cats = u.categorias?.length ? u.categorias.join(", ") : "—";
  const already = jaEnviados.has(u.id);
  const selected = selUsuarios.includes(u.id);

  return (
    <div key={u.id} style={rowItem(already ? "#f1fff6" : selected ? "#f1f5ff" : "#fff")}>
      <input
        type="checkbox"
        checked={selected || already}
        disabled={already}
        onChange={(e) => toggleUsuario(u.id, e.target.checked)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
          {already && <span style={chip("#eef2ff", "#3730a3")}><CheckCircle2 size={12} /> enviado</span>}
          {u.patrocinador && <span style={chip("#fff7ed", "#9a3412")}>Patrocinador</span>}
        </div>
        <div style={subLine}>{u.email || "—"} • {contato} • {u.cidade || "—"}/{regioes}</div>
        <div style={subMicro}>Categorias: {cats}</div> {/* <- só isso */}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => openProfile(u.id)} style={ghostBtn}>
          Ver perfil
        </button>
        <a href={`/admin/usuarios/${u.id}/edit`} target="_blank" rel="noreferrer" style={ghostBtn} title="Abrir no admin">
          <ExternalLink size={14} />
        </a>
      </div>

      <span style={{ fontSize: 11, color: "#94a3b8" }}>#{u.id}</span>
    </div>
  );
})}


              {!loadingUsuarios && usuariosVisiveis.length === 0 && (
                <div style={{ padding: "24px 12px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
                  Nenhum usuário encontrado. Ajuste os filtros/busca.
                </div>
              )}

              {loadingUsuarios && (
                <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14 }}>
                  <LoaderIcon className="animate-spin" size={16} /> Carregando...
                </div>
              )}
            </div>
          </div>

          {/* Ações de envio */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={selecionarTodosVisiveis} style={ghostBtn}>Selecionar visíveis</button>
            <button type="button" onClick={limparSelecao} style={ghostBtn}>Limpar seleção</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={enviarParaSelecionados} disabled={envLoading || selUsuarios.length === 0} style={primaryBtn}>
              <Send size={18} /> {envLoading ? "Enviando..." : `Enviar (${selUsuarios.length})`}
            </button>
          </div>
        </div>

        {/* ================= Envios realizados ================= */}
        <div style={card}>
          <h2 style={cardTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Users size={20} color="#2563eb" /> Envios realizados</span></h2>

          {assignments.length === 0 ? (
            <div style={emptyBox}>Nenhum envio ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={tableHeader}>
                <div style={{ flex: 1.7 }}>Fornecedor</div>
                <div style={{ flex: 1 }}>Status</div>
                <div style={{ flex: 0.8 }}>Pagamento</div>
                <div style={{ flex: 0.6, textAlign: "right" }}>Preço</div>
                <div style={{ flex: 0.6, textAlign: "right" }}>Cap</div>
                <div style={{ flex: 1.6, textAlign: "right" }}>Ações</div>
              </div>

              {assignments
                .slice()
                .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
                .map((a) => (
                  <AssignmentRow
                    key={a.id}
                    a={a}
                    onPago={() => setPaymentStatus(a.supplierId, "paid")}
                    onPendente={() => setPaymentStatus(a.supplierId, "pending")}
                    onLiberar={() => unlockAssignment(a.supplierId)}
                    onCancelar={() => cancelAssignment(a.supplierId)}
                    onExcluir={() => deleteAssignment(a.supplierId)}
                    onReativar={() => reactivateAssignment(a.supplierId)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Modal de Perfil ===== */}
      {openProfileUserId && (
        <ProfileModal
          userId={openProfileUserId}
          loading={profileLoading}
          cached={profileCache[openProfileUserId] || null}
          onClose={() => setOpenProfileUserId(null)}
          defaultPrice={precoPadraoReais}
          price={profileLocalPrice}
          onPrice={(v) => setProfileLocalPrice(v)}
          note={profileNote}
          onNote={(v) => setProfileNote(v)}
          onSend={() => sendFromProfile(openProfileUserId)}
        />
      )}
    </section>
  );
}

/* ================= Assignment Row ================= */
function AssignmentRow({
  a,
  onPago,
  onPendente,
  onLiberar,
  onCancelar,
  onExcluir,
  onReativar,
}: {
  a: Assignment;
  onPago: () => void;
  onPendente: () => void;
  onLiberar: () => void;
  onCancelar: () => void;
  onExcluir: () => void;
  onReativar: () => void;
}) {
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let s = await getDoc(doc(db, "usuarios", a.supplierId));
        if (!s.exists()) s = await getDoc(doc(db, "users", a.supplierId));
        if (!s.exists()) s = await getDoc(doc(db, "user", a.supplierId));
        if (s.exists()) setUser({ id: s.id, ...(s.data() as any) });
      } catch {}
    })();
  }, [a.supplierId]);

  const nome = user?.nome || user?.email || `Usuário ${a.supplierId}`;
  const contato = user?.whatsappE164 || user?.whatsapp || user?.telefone || "—";
  const cidadeUf = `${user?.cidade || "—"}/${user?.estado || "—"}`;
  const pago = a.paymentStatus === "paid";

  const stChip =
    a.status === "unlocked" ? chip("#ecfdf5", "#065f46")
      : a.status === "canceled" ? chip("#fff1f2", "#9f1239")
      : a.status === "viewed" ? chip("#eef2ff", "#3730a3")
      : chip("#f1f5f9", "#111827");

  const payChip = pago ? chip("#ecfdf5", "#065f46") : chip("#fff7ed", "#9a3412");

  return (
    <div style={tableRow}>
      <div style={{ flex: 1.7, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt={nome} style={{ width: 28, height: 28, borderRadius: "50%" }} />
          ) : (
            <div style={avatarBox}>{(nome || "?").charAt(0).toUpperCase()}</div>
          )}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
        </div>
        <div style={subLine}>{user?.email || "—"} • {contato} • {cidadeUf}</div>
      </div>

      <div style={{ flex: 1 }}>
        <span style={stChip}>
          {a.status === "unlocked" ? <LockOpen size={12} /> :
           a.status === "canceled" ? <Ban size={12} /> :
           a.status === "viewed" ? <CheckCircle2 size={12} /> : <CheckCircle2 size={12} />}
          {a.status}
        </span>
      </div>

      <div style={{ flex: 0.8 }}>
        <span style={payChip}><CreditCard size={12} /> {pago ? "pago" : "pendente"}</span>
      </div>

      <div style={{ flex: 0.6, textAlign: "right", fontWeight: 900, color: "#0f172a" }}>
        {toReais(a.pricing?.amount)}
      </div>
      <div style={{ flex: 0.6, textAlign: "right", color: "#64748b", fontWeight: 800 }}>
        {a.pricing?.cap != null ? a.pricing.cap : "—"}
      </div>

      <div style={{ flex: 1.6, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {!pago ? (
          <button onClick={onPago} style={miniBtnGreen}><CreditCard size={14} /> Marcar pago</button>
        ) : (
          <button onClick={onPendente} style={miniBtnYellow}><Undo2 size={14} /> Pendente</button>
        )}
        {a.status !== "unlocked" && a.status !== "canceled" && (
          <button onClick={onLiberar} style={miniBtnBlue}><LockOpen size={14} /> Liberar contato</button>
        )}
        {a.status !== "canceled" && a.status !== "unlocked" && (
          <button onClick={onCancelar} style={miniBtnOrange}><Ban size={14} /> Cancelar envio</button>
        )}
        {a.status === "canceled" && (
          <button onClick={onReativar} style={miniBtnGray}><RefreshCw size={14} /> Reativar envio</button>
        )}
        <button onClick={onExcluir} style={miniBtnRed}><XCircle size={14} /> Excluir envio</button>
      </div>
    </div>
  );
}

/* ================= Modal de Perfil ================= */
function ProfileModal({
  userId,
  loading,
  cached,
  onClose,
  defaultPrice,
  price,
  onPrice,
  note,
  onNote,
  onSend,
}: {
  userId: string;
  loading: boolean;
  cached: Usuario | null;
  onClose: () => void;
  defaultPrice: string;
  price: string;
  onPrice: (v: string) => void;
  note: string;
  onNote: (v: string) => void;
  onSend: () => void;
}) {
  const u = cached;

  // composição de dados tolerante
  const nome = u?.nome || u?.email || `Usuário ${userId}`;
  const email = u?.email || "";
  // categorias (deduplicadas)
const catSet = new Set<string>();

(u?.categorias || []).forEach((c) => {
  if (c) catSet.add(String(c));
});

(u?.categoriesAll || []).forEach((c) => {
  if (c) catSet.add(String(c));
});

(u?.categoriasAtuacaoPairs || []).forEach((p) => {
  if (p?.categoria) catSet.add(String(p.categoria));
});

(u?.atuacaoBasica || []).forEach((a) => {
  if (a?.categoria) catSet.add(String(a.categoria));
});

const cats = Array.from(catSet);

// subcategorias (podem repetir menos, mas já filtramos falsy)
const subcats = [
  ...(u?.categoriasAtuacaoPairs || []).map((p) => p?.subcategoria).filter(Boolean) as string[],
  ...(u?.atuacaoBasica || []).map((a) => a?.subcategoria).filter(Boolean) as string[],
].filter(Boolean);


  

  const ufSet = u ? getUFSetFromUser(u) : new Set<string>();
  const ufsTxt = ufSet.size ? Array.from(ufSet).join(", ") : "—";

  const contatoDigits = normalizeBRWhatsappDigits(u?.whatsappE164 || u?.whatsapp || u?.telefone || "");
  const contatoMasked = contatoDigits ? maskFrom55Digits(contatoDigits) : "";
  const waLink = contatoDigits ? `https://wa.me/${contatoDigits}` : "";
// antes do JSX do modal:
const bioText = u?.bio || firstNonEmptyString(u, BIO_KEYS);
const atBullets = buildAtuacaoBullets(u);


  return (
    <div style={modalBackdrop}>
      <div style={modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Perfil do fornecedor</h3>
          <button onClick={onClose} style={ghostBtn}>Fechar</button>
        </div>

        {loading && !u && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b" }}>
            <LoaderIcon className="animate-spin" size={16} /> Carregando perfil...
          </div>
        )}

        {!!u && (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {u.photoURL ? (
                <img src={u.photoURL} alt={nome} style={{ width: 52, height: 52, borderRadius: 12 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0f172a" }}>
                  {nome.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{nome}</div>
                  {u.patrocinador && <span style={chip("#fff7ed", "#9a3412")}>Patrocinador</span>}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{email || "—"}</div>
              </div>
              <a href={`/admin/usuarios/${u.id}/edit`}
 target="_blank" rel="noreferrer" style={ghostBtn} title="Abrir no admin">
                <ExternalLink size={14} /> Admin
              </a>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={infoRow}><b>Categorias:</b> {cats.length ? cats.join(", ") : "—"}</div>
              {!!subcats.length && <div style={infoRow}><b>Atuação:</b> {subcats.join(", ")}</div>}
              <div style={infoRow}><b>UFs/Regiões:</b> {ufsTxt}</div>
              <div style={infoRow}><b>Cidade/UF:</b> {(u.cidade || "—")}/{u.estado || "—"}</div>
              {/* Bio / descrição livre */}
<div style={infoRow}>
  <b>Bio/Descrição:</b>&nbsp;
  {bioText ? (
    <span style={{ whiteSpace: "pre-wrap" }}>{bioText}</span>
  ) : (
    "—"
  )}
</div>

{/* Atuação detalhada */}
{atBullets.length > 0 && (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>
      Atuação detalhada
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {atBullets.map((line, i) => (
        <span key={i} style={chip("#eef2ff", "#3730a3")}>
          {line}
        </span>
      ))}
    </div>
  </div>
)}


              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noreferrer" style={primaryBtn}>
                    <MessageCircle size={16} /> WhatsApp ({contatoMasked})
                  </a>
                ) : (
                  <span style={{ ...chip("#fff1f2", "#9f1239"), borderStyle: "dashed" }}>
                    Contato WhatsApp indisponível
                  </span>
                )}
                {email && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(email)}
                    style={ghostBtn}
                    title="Copiar e-mail"
                  >
                    <Copy size={16} /> Copiar e-mail
                  </button>
                )}
              </div>
            </div>

            {/* Enviar direto do modal */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eef2f7" }}>
              <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Enviar esta demanda</div>
              <div style={twoCols}>
                <div style={{ flex: 1 }}>
                  <label style={miniLabel}>Preço (R$)</label>
                  <input value={price} onChange={(e) => onPrice(e.target.value)} placeholder={`Sugerido: ${defaultPrice}`} style={input} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={miniLabel}>Nota interna (opcional)</label>
                  <input value={note} onChange={(e) => onNote(e.target.value)} placeholder="Motivo da escolha, observações..." style={input} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="button" onClick={onSend} style={primaryBtn}><Send size={16} /> Enviar</button>
                </div>
              </div>
              <div style={{ ...hintText, marginTop: 6 }}>
                O envio aqui cria/atualiza <code>demandAssignments/{`{demandaId}_{userId}`}</code> com <b>pricing</b> custom e <b>notes</b>.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= Estilos ================= */
const backLink: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18, color: "#2563eb", fontWeight: 800, fontSize: 16, textDecoration: "none" };
const gridWrap: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr", gap: 18 };
const card: React.CSSProperties = { background: "#fff", borderRadius: 18, boxShadow: "0 2px 16px #0001", padding: "26px 22px" };
const cardTitle: React.CSSProperties = { fontWeight: 900, fontSize: "1.55rem", color: "#023047", marginBottom: 10 };
const metaLine: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, color: "#94a3b8", fontSize: 13 };
const twoCols: React.CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap" };
const label: React.CSSProperties = { fontWeight: 800, fontSize: 15, color: "#2563eb", marginBottom: 7, marginTop: 14, display: "block" };
const miniLabel: React.CSSProperties = { fontWeight: 800, fontSize: 12, color: "#64748b", marginBottom: 6, display: "block" };
const input: React.CSSProperties = { width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 16, color: "#023047", background: "#f8fafc", fontWeight: 600, outline: "none" };
const chipTag: React.CSSProperties = { background: "#fff7ea", color: "#fb8500", fontWeight: 800, padding: "6px 10px", borderRadius: 12, border: "1px solid #ffe4c4", display: "inline-flex", alignItems: "center", gap: 8 };
const chipClose: React.CSSProperties = { border: "none", background: "transparent", color: "#fb8500", fontWeight: 900, cursor: "pointer" };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#2563eb", color: "#fff", border: "none", fontWeight: 900, fontSize: "1rem", padding: "12px 16px", borderRadius: 12, cursor: "pointer", boxShadow: "0 2px 14px #0001" };
const dangerBtn: React.CSSProperties = { ...primaryBtn, background: "#e11d48" };
const ghostBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e5e7eb", fontWeight: 800, fontSize: "0.95rem", padding: "10px 14px", borderRadius: 10, cursor: "pointer" };
const listBox: React.CSSProperties = { border: "1.5px solid #eaeef4", borderRadius: 14, overflow: "hidden", marginTop: 14 };
const listHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f7" };
const rowItem = (bg: string): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: bg });
const subLine: React.CSSProperties = { fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const subMicro: React.CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const hintText: React.CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 6 };
const centerBox: React.CSSProperties = { minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" };
const emptyBox: React.CSSProperties = { background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 12, padding: 16, color: "#475569" };
const tableHeader: React.CSSProperties = { display: "flex", gap: 12, padding: "10px 12px", background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 12, fontSize: 12, color: "#475569", fontWeight: 900 };
const tableRow: React.CSSProperties = { display: "flex", gap: 12, padding: "12px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, alignItems: "center" };
const avatarBox: React.CSSProperties = { width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 };
const miniBtnGreen: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#16a34a", color: "#fff", border: "1px solid #16a34a", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #16a34a22" };
const miniBtnYellow: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#f59e0b", color: "#fff", border: "1px solid #f59e0b", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #f59e0b22" };
const miniBtnBlue: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#2563eb", color: "#fff", border: "1px solid #2563eb", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #2563eb22" };
const miniBtnOrange: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#fb923c", color: "#fff", border: "1px solid #fb923c", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #fb923c22" };
const miniBtnGray: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#475569", color: "#fff", border: "1px solid #475569", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #47556922" };
const miniBtnRed: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, background: "#e11d48", color: "#fff", border: "1px solid #e11d48", fontWeight: 800, fontSize: 12, padding: "8px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #e11d4822" };

const chip = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
  background: bg, color: fg, border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 800, lineHeight: 1.2,
});

const infoRow: React.CSSProperties = { fontSize: 14, color: "#334155" };
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#0f172a66", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
};
const modalCard: React.CSSProperties = {
  width: "min(920px, 96vw)", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: 16, boxShadow: "0 10px 30px #00000022",
};

// app/admin/demandas/[id]/edit/page.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
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
  startAfter,
  startAt,
  endAt,
  onSnapshot,
  arrayRemove,
  arrayUnion,
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
  Search, // <-- Ícone correto
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";
import nextDynamic from "next/dynamic";
import { useTaxonomia } from "@/hooks/useTaxonomia";

// ============ Lazy (mesma assinatura do create) ============
const PDFUploader = nextDynamic(() => import("@/components/PDFUploader"), {
  ssr: false,
}) as any;
const DrivePDFViewer = nextDynamic(
  () => import("@/components/DrivePDFViewer"),
  { ssr: false },
) as any;

/* ================== Tipos ================== */
// Formato igual ao create: Cat -> Subcat -> Item (mantido no FORM da demanda)
type Item = { nome: string; slug?: string };
type Subcat = { nome: string; slug?: string; itens?: Item[] };
type Cat = { nome: string; slug?: string; subcategorias?: Subcat[] };

type Usuario = {
  id: string;
  nome?: string;
  email?: string;
  whatsapp?: string; // dígitos “55…”
  whatsappE164?: string; // “+55…”
  telefone?: string; // legado/livre
  estado?: string;
  ufs?: string[];
  atendeBrasil?: boolean;
  cidade?: string;
  categorias?: string[];
  categoriasAtuacaoPairs?: { categoria: string; subcategoria: string }[]; // compat
  photoURL?: string;
};

type AssignmentStatus = "sent" | "viewed" | "unlocked" | "canceled";
type PaymentStatus = "pending" | "paid";

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
};

type Demanda = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  itemFinal?: string; // 3º nível
  estado?: string;
  cidade?: string;
  prazo?: string;
  orcamento?: number | string | null;
  whatsapp?: string; // legado
  observacoes?: string;
  imagens?: string[];
  pdfUrl?: string | null; // <— novo, compatível com create
  tags?: string[];
  pricingDefault?: { amount?: number; currency?: string };
  createdAt?: any;
  updatedAt?: any;
  status?: string;
  userId?: string;
  unlockCap?: number | null;
  liberadoPara?: string[];

  // dados originais do create-demanda (legado)
  autorNome?: string;
  autorEmail?: string;
  autorWhatsapp?: string;

  // novos campos de contato (editáveis no admin)
  contatoNome?: string;
  contatoEmail?: string;
  contatoWhatsappE164?: string; // dígitos iniciando por 55 (sem +) — compat
  contatoWhatsappMasked?: string; // exibição "+55 (31) 9xxxx-xxxx"
};

/* ================== Constantes ================== */
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
// --- Map de nome completo -> sigla (sem acento) ---
const UF_MAP: Record<string, string> = {
  "acre":"AC","alagoas":"AL","amapa":"AP","amazonas":"AM","bahia":"BA","ceara":"CE",
  "distrito federal":"DF","espirito santo":"ES","goias":"GO","maranhao":"MA","mato grosso":"MT",
  "mato grosso do sul":"MS","minas gerais":"MG","para":"PA","paraiba":"PB","parana":"PR",
  "pernambuco":"PE","piaui":"PI","rio de janeiro":"RJ","rio grande do norte":"RN","rio grande do sul":"RS",
  "rondonia":"RO","roraima":"RR","santa catarina":"SC","sao paulo":"SP","sergipe":"SE","tocantins":"TO",
  "brasil":"BRASIL","nacional":"BRASIL"
};

const noAcento = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const toUF = (val?: string): string => {
  if (!val) return "";
  const raw = noAcento(val);
  // já é sigla?
  const upp = val.toUpperCase().trim();
  if (UFS.includes(upp as any)) return upp;
  // nome completo -> sigla
  return UF_MAP[raw] || "";
};

// quebra textos livres e tenta achar UFs em cada token
const extractUFsFromFreeText = (val?: string): string[] => {
  if (!val) return [];
  const parts = val
    .replace(/[|/\\\-–—,;:\(\)\[\]]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (const p of parts) {
    const uf = toUF(p);
    if (uf) out.add(uf);
  }
  return Array.from(out);
};

// junta todas as possíveis fontes de UF do usuário
const getUFSetFromUser = (u: any): Set<string> => {
  const out = new Set<string>();

  // arrays esperadas
  if (Array.isArray(u.ufs)) u.ufs.forEach((x: string) => { const uf = toUF(x); if (uf) out.add(uf); });
  if (Array.isArray(u.ufsAtendidas)) u.ufsAtendidas.forEach((x: string) => { const uf = toUF(x); if (uf) out.add(uf); });

  // campos simples
  [u.estado, u.state, u.uf, u.endereco?.uf, u.endereco?.estado].forEach((x: string) => {
    const uf = toUF(x);
    if (uf) out.add(uf);
  });

  // textos livres que às vezes guardam “Contagem/MG”, “Brasil”, etc.
  [u.cidade, u.localizacao, u.regioes, u.regioesAtendidas, u.endereco?.cidade]
    .forEach((x: string) => extractUFsFromFreeText(x).forEach((uf) => out.add(uf)));

  // abrangência nacional
  if (u.atendeBrasil) out.add("BRASIL");

  return out;
};

/* ================== Helpers gerais ================== */
const toReais = (cents?: number) =>
  `R$ ${(Number(cents || 0) / 100 || 0).toFixed(2).replace(".", ",")}`;

const reaisToCents = (val: string) => {
  const n = Number(
    String(val || "0")
      .replace(/\./g, "")
      .replace(",", "."),
  ); // "19,90" -> 19.90
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
};

const chip = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 999,
  background: bg,
  color: fg,
  border: "1px solid #e5e7eb",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
});

const isNonEmptyString = (v: any): v is string =>
  typeof v === "string" && v.trim() !== "";

const norm = (s?: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/* ========= Helpers de telefone/WhatsApp BR (+55) ========= */
const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

function ensurePlus55Prefix(masked: string) {
  const t = (masked || "").trim();
  if (!t) return "+55 ";
  return t.startsWith("+55") ? t : `+55 ${t.replace(/^\+?/, "")}`;
}
function formatWhatsappBRIntl(v: string) {
  let t = (v || "").trim();
  if (!t.startsWith("+55")) t = `+55 ${t.replace(/^\+?/, "")}`;
  const d = onlyDigits(t).slice(0, 13); // 55 + 2 DDD + 8/9 número
  if (d.length <= 2) return "+55";
  if (d.length <= 4) return `+55 (${d.slice(2, 4)}`;
  if (d.length <= 9) return `+55 (${d.slice(2, 4)}) ${d.slice(4)}`;
  return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
}
function extractDigits55FromMasked(masked?: string) {
  const dig = onlyDigits(masked || "");
  if (!dig) return "";
  return dig.startsWith("55") ? dig : `55${dig.replace(/^55?/, "")}`;
}
function isValidBRWhatsappDigits(d55: string) {
  if (!d55 || !d55.startsWith("55")) return false;
  const total = d55.length;
  if (total !== 12 && total !== 13) return false;
  const ddd = d55.slice(2, 4);
  const num = d55.slice(4);
  return ddd.length === 2 && (num.length === 8 || num.length === 9);
}

/** ================== Página ================== */
export default function EditDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const demandaId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params!.id[0]
        : "";

  // 🔗 Taxonomia (3 níveis, igual ao create) — mantida para o FORM da demanda
  const { categorias, loading: taxLoading } = useTaxonomia() as {
    categorias: Cat[];
    loading: boolean;
  };

  /** ------- Estados principais ------- */
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null); // <— novo
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState<{
    titulo: string;
    descricao: string;
    categoria: string;
    subcategoria: string;
    itemFinal: string;
    estado: string;
    cidade: string;
    prazo: string;
    orcamento: string;
    whatsapp: string;
    observacoes: string;
    contatoNome: string;
    contatoEmail: string;
    contatoWhatsappMasked: string;
  }>({
    titulo: "",
    descricao: "",
    categoria: "",
    subcategoria: "",
    itemFinal: "",
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

  /** ------- Lista de usuários ------- */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [paging, setPaging] = useState<{ last?: any; ended?: boolean }>({
    ended: false,
  });
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  /** ------- Enviados (stream) ------- */
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const jaEnviados = useMemo(
    () => new Set(assignments.map((a) => a.supplierId)),
    [assignments],
  );

  /** ------- Filtros (Categoria, UF e Busca local) ------- */
  const [fCat, setFCat] = useState("");
  const [fUF, setFUF] = useState("");
  const [qUser, setQUser] = useState("");

  // ======= Taxonomia (3 níveis) – para o FORM (demanda) =======
  const subsForm: Subcat[] = useMemo(
    () =>
      categorias.find((c) => c.nome === form.categoria)?.subcategorias ?? [],
    [categorias, form.categoria],
  );
  const itemsForm: Item[] = useMemo(
    () => subsForm.find((s) => s.nome === form.subcategoria)?.itens ?? [],
    [subsForm, form.subcategoria],
  );

  /** ================== Carregar Demanda ================== */
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

      setForm({
        titulo: d.titulo || "",
        descricao: d.descricao || "",
        categoria: d.categoria || "",
        subcategoria: d.subcategoria || "",
        itemFinal: d.itemFinal || "",
        estado: d.estado || "",
        cidade: d.cidade || "",
        prazo: d.prazo || "",
        orcamento: d.orcamento != null ? String(d.orcamento) : "",
        whatsapp: d.whatsapp || "",
        observacoes: d.observacoes || "",

        contatoNome: d.contatoNome || d.autorNome || "",
        contatoEmail: d.contatoEmail || d.autorEmail || "",
        contatoWhatsappMasked: d.contatoWhatsappMasked
          ? d.contatoWhatsappMasked
          : d.contatoWhatsappE164
            ? formatWhatsappBRIntl("+" + d.contatoWhatsappE164)
            : d.autorWhatsapp
              ? formatWhatsappBRIntl(
                  d.autorWhatsapp.startsWith("+")
                    ? d.autorWhatsapp
                    : `+55 ${d.autorWhatsapp}`,
                )
              : "",
      });

      setTags(d.tags || []);
      setImagens(d.imagens || []);
      setPdfUrl(d.pdfUrl ?? null);
      setUserId(d.userId || "");

      setCreatedAt(
        d.createdAt?.seconds
          ? new Date(d.createdAt.seconds * 1000).toLocaleString("pt-BR")
          : "",
      );

      const cents = d?.pricingDefault?.amount ?? 1990;
      setPrecoPadraoReais((cents / 100).toFixed(2).replace(".", ","));
      setPrecoEnvioReais((cents / 100).toFixed(2).replace(".", ","));

      setUnlockCap(typeof d.unlockCap === "number" ? d.unlockCap : null);

      // Pré-filtro sugerido pela demanda
      setFCat(d.categoria || "");
      setFUF(d.estado || "");

      setLoading(false);
    }
    fetchDemanda();
  }, [demandaId, router]);

  /** ================== Stream assignments ================== */
  useEffect(() => {
    if (!demandaId) return;
    const qAssign = query(
      collection(db, "demandAssignments"),
      where("demandId", "==", demandaId),
      limit(1000),
    );
    const unsub = onSnapshot(
      qAssign,
      (snap) => {
        const arr: Assignment[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setAssignments(arr);
      },
      (e) => console.warn("Falha ao carregar envios:", e),
    );
    return () => unsub();
  }, [demandaId]);

  /** ================== Normaliza doc de usuário ================== */
  function docToUsuario(d: any): Usuario {
    const raw = d.data ? (d.data() as any) : (d as any);

    let categorias: string[] = [];
    if (Array.isArray(raw.categoriasAtuacao)) categorias = raw.categoriasAtuacao;
    else if (Array.isArray(raw.categorias)) categorias = raw.categorias;

    const ufsRaw = Array.isArray(raw.ufsAtendidas)
      ? raw.ufsAtendidas
      : Array.isArray(raw.ufs)
        ? raw.ufs
        : [];

    const ufsNorm = (ufsRaw || []).map((x: string) =>
      (x || "").toString().trim().toUpperCase(),
    );
    if (raw.atendeBrasil && !ufsNorm.includes("BRASIL")) ufsNorm.push("BRASIL");

    const pairs = Array.isArray(raw.categoriasAtuacaoPairs)
      ? raw.categoriasAtuacaoPairs
      : [];

    return {
      id: d.id ?? raw.id,
      ...raw,
      categorias,
      ufs: ufsNorm,
      categoriasAtuacaoPairs: pairs,
      atendeBrasil: !!raw.atendeBrasil,
    } as Usuario;
  }

  /** ================== Busca de usuários (robusta + coleções múltiplas) ================== */
  async function smartFetchUsuarios(reset = true) {
    setLoadingUsuarios(true);
    try {
      const PAGE = 500; // busca ampla para filtrar localmente
      const collectionsToRead = ["usuarios", "users", "user"]; // cobre variações
      const mapById = new Map<string, Usuario>();
      const mapByEmail = new Map<string, Usuario>();

      // Carrega de várias coleções (nomeações diferentes)
      for (const colName of collectionsToRead) {
        try {
          const snap = await getDocs(
            query(collection(db, colName), orderBy("nome"), limit(PAGE))
          );
          snap.forEach((d) => {
            const u = docToUsuario(d);
            // dedup por id
            if (!u.id) return;
            if (!mapById.has(u.id)) mapById.set(u.id, u);
            // dedup adicional por e-mail
            const mail = (u.email || "").trim().toLowerCase();
            if (mail && !mapByEmail.has(mail)) mapByEmail.set(mail, u);
          });
        } catch (err) {
          // Algumas coleções podem não existir/sem índice — seguimos
          // console.warn(`Coleção "${colName}" não encontrada/sem índice`, err);
        }
      }

      const all = Array.from(mapById.values());

      const ufN = (fUF || "").trim().toUpperCase();
      const catN = norm(fCat);

      const filtrados = all.filter((u) => {
        let matchCat = true;
        let matchUF = true;

        // --------- Categoria ---------
        if (catN) {
          const possibleCats: string[] = [];

          if (Array.isArray(u.categorias)) possibleCats.push(...u.categorias);
          if (Array.isArray((u as any).categoriesAll))
            possibleCats.push(...(u as any).categoriesAll);
          if (Array.isArray((u as any).categoriasAtuacaoPairs))
            possibleCats.push(
              ...(u as any).categoriasAtuacaoPairs.map((p: any) => p?.categoria)
            );
          if (Array.isArray((u as any).atuacaoBasica))
            possibleCats.push(
              ...(u as any).atuacaoBasica.map((a: any) => a?.categoria)
            );

          matchCat = possibleCats.some(
            (c) => c && norm(c).includes(catN) // aceita parcial
          );
        }

        // --------- UF (robusto) ---------
        if (ufN) {
          const ufWanted = toUF(ufN) || ufN.toUpperCase(); // aceita “MT” ou “Mato Grosso”
          if (ufWanted === "BRASIL") {
            matchUF = true;
          } else if (u.atendeBrasil === true) {
            matchUF = true;
          } else {
            const setUFs = getUFSetFromUser(u); // olha em todos os lugares possíveis
            matchUF = setUFs.has(ufWanted) || setUFs.has("BRASIL");
          }
        }

        return matchCat && matchUF;
      });

      // Ordena alfabeticamente para visualização estável
      filtrados.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

      setUsuarios(filtrados);
      setPaging({ ended: true });
    } catch (e) {
      console.error("Erro ao buscar usuários:", e);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  // Busca local dentro do resultado carregado (nome, e-mail, whatsapp, cidade, id)
  const usuariosVisiveis = useMemo(() => {
    const t = norm(qUser);
    if (!t) return usuarios;
    return usuarios.filter((u) => {
      const nome = norm(u.nome || "");
      const email = norm(u.email || "");
      const whatsapp = norm(u.whatsappE164 || u.whatsapp || u.telefone || "");
      const cidade = norm(u.cidade || "");
      const id = (u.id || "").toLowerCase();
      return (
        nome.includes(t) ||
        email.includes(t) ||
        whatsapp.includes(t) ||
        cidade.includes(t) ||
        id.includes(t)
      );
    });
  }, [usuarios, qUser]);

  // load inicial
  useEffect(() => {
    smartFetchUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarrega quando os filtros mudarem
  useEffect(() => {
    smartFetchUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fCat, fUF]);

  /** ================== Handlers básicos ================== */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;

    // resets em cascata na taxonomia (3 níveis)
    if (name === "categoria") {
      setForm((f) => ({
        ...f,
        categoria: value,
        subcategoria: "",
        itemFinal: "",
      }));
      return;
    }
    if (name === "subcategoria") {
      setForm((f) => ({ ...f, subcategoria: value, itemFinal: "" }));
      return;
    }

    setForm({ ...form, [name]: value });
  }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      (e.key === "Enter" || e.key === ",") &&
      tagInput.trim() &&
      tags.length < 3
    ) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
      e.preventDefault();
    }
  }
  function removeTag(idx: number) {
    setTags(tags.filter((_, i) => i !== idx));
  }

  /** ================== Persistência da demanda ================== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const cents = reaisToCents(precoPadraoReais);

      // normaliza e valida whatsapp
      const e164Digits = extractDigits55FromMasked(
        form.contatoWhatsappMasked || "",
      );
      const contatoOk =
        !form.contatoWhatsappMasked || isValidBRWhatsappDigits(e164Digits);
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
        itemFinal: form.itemFinal || "",
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

        // novos campos de contato
        contatoNome: form.contatoNome.trim(),
        contatoEmail: form.contatoEmail.trim().toLowerCase(),
        contatoWhatsappMasked: form.contatoWhatsappMasked || "",
        contatoWhatsappE164: e164Digits || "", // dígitos “55…”

        // compatibilidade com telas antigas
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
    if (
      !window.confirm(
        "Deseja mesmo excluir esta demanda? Esta ação é irreversível!",
      )
    )
      return;
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

  /** ================== Envio p/ usuários ================== */
  function toggleUsuario(id: string, checked: boolean) {
    setSelUsuarios((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  }
  function selecionarTodosVisiveis() {
    setSelUsuarios((prev) =>
      Array.from(
        new Set([
          ...prev,
          ...usuariosVisiveis.filter((c) => !jaEnviados.has(c.id)).map((c) => c.id),
        ]),
      ),
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
          { merge: true },
        );
      });
      batch.update(doc(db, "demandas", demandaId), {
        lastSentAt: serverTimestamp(),
      });
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

  /** ================== Ações por assignment ================== */
  async function setPaymentStatus(supplierId: string, status: PaymentStatus) {
    try {
      const ref = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(ref, {
        paymentStatus: status,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao atualizar pagamento.");
    }
  }
  async function unlockAssignment(supplierId: string) {
    try {
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      const dSnap = await getDoc(doc(db, "demandas", demandaId));
      const dData = dSnap.data() as Demanda;
      const cap = typeof dData?.unlockCap === "number" ? dData.unlockCap : null;

      const curUnlocked = assignments.filter(
        (a) => a.status === "unlocked",
      ).length;
      if (cap != null && curUnlocked >= cap) {
        alert(`Limite de desbloqueios atingido (${cap}).`);
        return;
      }

      await updateDoc(aRef, {
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
    } catch (e: any) {
      console.error(e);
      alert("Erro ao liberar contato.");
    }
  }
  async function cancelAssignment(supplierId: string) {
    if (
      !window.confirm(
        "Cancelar o envio? O fornecedor não poderá pagar/desbloquear.",
      )
    )
      return;
    try {
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(aRef, {
        status: "canceled",
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayRemove(supplierId),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      await deleteDoc(
        doc(db, "demandas", demandaId, "acessos", supplierId),
      ).catch(() => {});
    } catch (e: any) {
      console.error(e);
      alert("Erro ao cancelar envio.");
    }
  }
  async function reactivateAssignment(supplierId: string) {
    try {
      const aRef = doc(db, "demandAssignments", `${demandaId}_${supplierId}`);
      await updateDoc(aRef, {
        status: "sent",
        paymentStatus: "pending",
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      console.error(e);
      alert("Erro ao reativar envio.");
    }
  }
  async function deleteAssignment(supplierId: string) {
    if (
      !window.confirm(
        "Excluir completamente o envio? Isso remove o acesso e do painel do fornecedor.",
      )
    )
      return;
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        liberadoPara: arrayRemove(supplierId),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      await deleteDoc(
        doc(db, "demandas", demandaId, "acessos", supplierId),
      ).catch(() => {});
      await deleteDoc(
        doc(db, "demandAssignments", `${demandaId}_${supplierId}`),
      );
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir envio.");
    }
  }

  /** ================== Contagens úteis ================== */
  const unlockedCount = useMemo(
    () => assignments.filter((a) => a.status === "unlocked").length,
    [assignments],
  );
  const capInfo =
    unlockCap != null ? `${unlockedCount}/${unlockCap}` : String(unlockedCount);

  /** ================== CSS responsivo injetado com segurança ================== */
  useEffect(() => {
    const styleId = "pedraum-edit-demand-responsive-v3";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
   // substitua TODO o conteúdo de el.innerHTML por isto:
el.innerHTML = `
  /* sem quebra em 2 colunas no desktop */
  @media (max-width: 860px) {
    div[style*="display: flex"][style*="gap: 12px"][style*="align-items: center"][style*="border: 1px solid #e5e7eb"] {
      flex-direction: column !important;
      align-items: flex-start !important;
    }
    div[style*="display: flex"][style*="gap: 12px"][style*="padding: 10px 12px"][style*="border: 1px solid #eef2f7"] {
      display: none !important;
    }
    input, select, textarea { max-width: 100% !important; }
    .sticky { position: sticky; top: 0; }
  }
`;

    return () => {
      try {
        el && el.remove();
      } catch {}
    };
  }, []);

  /** ================== Render ================== */
  if (loading) {
    return (
      <div style={centerBox}>
        <LoaderIcon className="animate-spin" size={28} />
        &nbsp; Carregando demanda...
      </div>
    );
  }

  return (
    <section
      style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 2vw 60px" }}
    >
      <Link href="/admin/demandas" style={backLink}>
        <ArrowLeft size={19} /> Voltar
      </Link>

      <div style={gridWrap}>
        {/* ================= Editar Demanda ================= */}
        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h2 style={cardTitle}>Editar Necessidade</h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Limite de desbloqueios
              </div>
              <input
                type="number"
                min={0}
                value={unlockCap ?? ""}
                onChange={(e) =>
                  setUnlockCap(
                    e.target.value === ""
                      ? null
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                style={{ ...input, width: 110 }}
                placeholder="Ex.: 5"
              />
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                Liberados: <b>{capInfo}</b>
              </div>
            </div>
          </div>

          <div style={metaLine}>
            <div>
              <b>ID:</b> {demandaId}
            </div>
            {createdAt && (
              <div>
                <b>Criada:</b> {createdAt}
              </div>
            )}
            {userId && (
              <div>
                <b>UserID:</b> {userId}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <label style={label}>Título da Demanda</label>
            <input
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              required
              placeholder="Ex: Preciso de peça X / serviço Y"
              style={input}
            />

            <label style={label}>Descrição</label>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              required
              placeholder="Detalhe sua necessidade..."
              style={{ ...input, minHeight: 110, resize: "vertical" }}
            />

            {/* ===== Taxonomia 3 níveis (Cat -> Subcat -> Item) ===== */}
            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Layers size={16} /> Categoria
                  </span>
                </label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                  required
                  style={input}
                  disabled={taxLoading}
                >
                  <option value="">
                    {taxLoading ? "Carregando..." : "Selecione"}
                  </option>
                  {categorias.map((c) => (
                    <option key={c.slug || c.nome} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>

                <select
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  required
                  style={input}
                  disabled={!form.categoria}
                >
                  <option value="">
                    {form.categoria
                      ? "Selecione a subcategoria"
                      : "Selecione a categoria"}
                  </option>
                  {subsForm.map((s) => (
                    <option key={s.slug || s.nome} value={s.nome}>
                      {s.nome}
                    </option>
                  ))}
                </select>

                {/* 3º nível: itens da subcategoria */}
                {itemsForm.length > 0 && (
                  <select
                    name="itemFinal"
                    value={form.itemFinal}
                    onChange={handleChange}
                    required
                    style={input}
                    disabled={!form.subcategoria}
                  >
                    <option value="">
                      {form.subcategoria
                        ? "Selecione o item final"
                        : "Selecione a subcategoria"}
                    </option>
                    {itemsForm.map((it) => (
                      <option key={it.slug || it.nome} value={it.nome}>
                        {it.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Estado (UF)</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  required
                  style={input}
                >
                  <option value="">Selecione</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Cidade</label>
                <input
                  name="cidade"
                  value={form.cidade}
                  onChange={handleChange}
                  placeholder="Ex.: Belo Horizonte"
                  style={input}
                />
              </div>
            </div>

            {/* ===== Anexos (Imagens + PDF) ===== */}
            <label style={label}>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Upload size={16} color="#2563eb" /> Anexos
              </span>
            </label>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr",
                border: "1px solid #eaeef4",
                borderRadius: 12,
                padding: 12,
              }}
            >
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
                    <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Adicione até 5 imagens.
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
                  <strong className="text-[#0f172a]">Anexo PDF (opcional)</strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-dashed p-3">
                    {/* Mesmo contrato do create: onUploaded -> string (URL) */}
                    <PDFUploader onUploaded={setPdfUrl} />
                  </div>

                  {pdfUrl ? (
                    <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                      <DrivePDFViewer
                        fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`}
                        height={300}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <a href={pdfUrl} target="_blank" rel="noreferrer" style={ghostBtn}>
                          Abrir em nova aba
                        </a>
                        <button type="button" onClick={() => setPdfUrl(null)} style={dangerBtn}>
                          Remover PDF
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Envie orçamento, memorial ou ficha técnica (até ~8MB).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ===== Contato do solicitante (novo bloco) ===== */}
            <div
              style={{
                marginTop: 14,
                padding: "12px",
                border: "1px dashed #e2e8f0",
                borderRadius: 12,
                background: "#f8fafc",
              }}
            >
              <div style={{ fontWeight: 900, color: "#023047", marginBottom: 8 }}>
                Contato do solicitante
              </div>

              <div style={twoCols}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Nome</label>
                  <input
                    name="contatoNome"
                    value={form.contatoNome}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contatoNome: e.target.value }))
                    }
                    placeholder="Ex.: João da Silva"
                    style={input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>E-mail</label>
                  <input
                    name="contatoEmail"
                    value={form.contatoEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contatoEmail: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contatoWhatsappMasked: formatWhatsappBRIntl(e.target.value),
                      }))
                    }
                    onFocus={() =>
                      setForm((f) => ({
                        ...f,
                        contatoWhatsappMasked: ensurePlus55Prefix(
                          f.contatoWhatsappMasked,
                        ),
                      }))
                    }
                    onBlur={() =>
                      setForm((f) => ({
                        ...f,
                        contatoWhatsappMasked: formatWhatsappBRIntl(
                          f.contatoWhatsappMasked,
                        ),
                      }))
                    }
                    placeholder="+55 (DD) número"
                    style={input}
                    maxLength={20}
                    inputMode="tel"
                  />
                  {(() => {
                    const d55 = extractDigits55FromMasked(
                      form.contatoWhatsappMasked,
                    );
                    const ok =
                      !form.contatoWhatsappMasked ||
                      isValidBRWhatsappDigits(d55);
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, orcamento: e.target.value }))
                    }
                    type="number"
                    min={0}
                    placeholder="R$"
                    style={input}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={label}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <DollarSign size={16} /> Preço padrão do desbloqueio (R$)
                </span>
              </label>
              <input
                value={precoPadraoReais}
                onChange={(e) => setPrecoPadraoReais(e.target.value)}
                placeholder="Ex.: 19,90"
                style={input}
              />
              <div style={hintText}>
                Sugerido ao enviar para usuários. Pode ser sobrescrito no envio.
              </div>
            </div>

            <label style={label}>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Tag size={16} color="#fb8500" /> Referências{" "}
                <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>
                  (até 3)
                </span>
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (
                <span key={idx} style={chipTag}>
                  {tg}
                  <button
                    type="button"
                    onClick={() => removeTag(idx)}
                    style={chipClose}
                  >
                    ×
                  </button>
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
              <div />
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
          <h2 style={cardTitle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Send size={20} color="#2563eb" /> Enviar esta demanda para usuários
            </span>
          </h2>

          <div style={twoCols}>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <DollarSign size={16} /> Preço do envio (R$)
                </span>
              </label>
              <input
                value={precoEnvioReais}
                onChange={(e) => setPrecoEnvioReais(e.target.value)}
                placeholder={`Sugerido: ${precoPadraoReais}`}
                style={input}
              />
              <div style={hintText}>Digite em reais, ex.: 25,00.</div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ShieldCheck size={16} /> Limite de desbloqueios (cap)
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={unlockCap ?? ""}
                onChange={(e) =>
                  setUnlockCap(
                    e.target.value === ""
                      ? null
                      : Math.max(0, Number(e.target.value)),
                  )
                }
                style={input}
                placeholder="Ex.: 5"
              />
              <div style={hintText}>
                A demanda respeita este limite total de desbloqueios.
              </div>
            </div>
          </div>

          {/* Filtros + Busca local */}
          <div
            style={{
              ...twoCols,
              marginTop: 10,
              alignItems: "flex-end",
              position: "sticky",
              top: 0,
              background: "#fff",
              zIndex: 1,
              paddingTop: 10,
              borderBottom: "1px solid #eef2f7",
              paddingBottom: 8,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> Categoria
                </label>
                <select
                  value={fCat}
                  onChange={(e) => setFCat(e.target.value)}
                  style={{ ...input, width: 260 }}
                  disabled={taxLoading}
                >
                  <option value="">{taxLoading ? "Carregando..." : "Todas"}</option>
                  {categorias.map((c) => (
                    <option key={c.slug || c.nome} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> UF
                </label>
                <select
                  value={fUF}
                  onChange={(e) => setFUF(e.target.value)}
                  style={{ ...input, width: 140 }}
                >
                  <option value="">Todas</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              {/* NOVO: Busca local */}
              <div>
                <label style={miniLabel}>
                  <Search size={13} /> Buscar
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={qUser}
                    onChange={(e) => setQUser(e.target.value)}
                    placeholder="nome, e-mail, whatsapp, cidade ou id"
                    style={{ ...input, width: 280 }}
                  />
                  {qUser && (
                    <button type="button" onClick={() => setQUser("")} style={ghostBtn}>
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <button type="button" onClick={() => smartFetchUsuarios(true)} style={ghostBtn}>
                <RefreshCw size={16} /> Atualizar
              </button>
            </div>
          </div>

          {/* Lista de usuários */}
          <div style={listBox}>
            <div style={listHeader}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#334155",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <Users size={16} /> Usuários
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Selecionados: <b>{selUsuarios.length}</b>
              </div>
            </div>

            <div style={{ maxHeight: "56vh", overflow: "auto" }}>
              {usuariosVisiveis.map((u) => {
                const nome = u.nome || u.email || `Usuário ${u.id}`;
                const contato = u.whatsappE164 || u.whatsapp || u.telefone || "—";
                const regioes = u.atendeBrasil
                  ? "BRASIL"
                  : u.ufs?.length
                    ? u.ufs.join(", ")
                    : u.estado || "—";
                const cats = u.categorias?.length ? u.categorias.join(", ") : "—";
                const already = jaEnviados.has(u.id);
                const selected = selUsuarios.includes(u.id);
                return (
                  <label
                    key={u.id}
                    style={rowItem(already ? "#f1fff6" : selected ? "#f1f5ff" : "#fff")}
                  >
                    <input
                      type="checkbox"
                      checked={selected || already}
                      disabled={already}
                      onChange={(e) => toggleUsuario(u.id, e.target.checked)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {nome}
                        </span>
                        {already && (
                          <span style={chip("#eef2ff", "#3730a3")}>
                            <CheckCircle2 size={12} /> enviado
                          </span>
                        )}
                      </div>
                      <div style={subLine}>
                        {u.email || "—"} • {contato} • {u.cidade || "—"}/{regioes}
                      </div>
                      <div style={subMicro}>Categorias: {cats}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>#{u.id}</span>
                  </label>
                );
              })}

              {!loadingUsuarios && usuariosVisiveis.length === 0 && (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  Nenhum usuário encontrado. Ajuste os filtros/busca.
                </div>
              )}

              {loadingUsuarios && (
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  <LoaderIcon className="animate-spin" size={16} /> Carregando...
                </div>
              )}
            </div>
          </div>

          {/* Ações de envio */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={selecionarTodosVisiveis} style={ghostBtn}>
              Selecionar visíveis
            </button>
            <button type="button" onClick={limparSelecao} style={ghostBtn}>
              Limpar seleção
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={enviarParaSelecionados}
              disabled={envLoading || selUsuarios.length === 0}
              style={primaryBtn}
            >
              <Send size={18} /> {envLoading ? "Enviando..." : `Enviar (${selUsuarios.length})`}
            </button>
          </div>
        </div>

        {/* ================= Envios realizados ================= */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Users size={20} color="#2563eb" /> Envios realizados
            </span>
          </h2>

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
                .sort(
                  (a, b) =>
                    (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
                )
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
    </section>
  );
}

/** ================= Assignment Row ================= */
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
        const s = await getDoc(doc(db, "usuarios", a.supplierId));
        if (s.exists()) setUser({ id: s.id, ...(s.data() as any) });
      } catch {}
    })();
  }, [a.supplierId]);

  const nome = user?.nome || user?.email || `Usuário ${a.supplierId}`;
  const contato = user?.whatsappE164 || user?.whatsapp || user?.telefone || "—";
  const cidadeUf = `${user?.cidade || "—"}/${user?.estado || "—"}`;
  const pago = a.paymentStatus === "paid";

  const stChip =
    a.status === "unlocked"
      ? chip("#ecfdf5", "#065f46")
      : a.status === "canceled"
        ? chip("#fff1f2", "#9f1239")
        : a.status === "viewed"
          ? chip("#eef2ff", "#3730a3")
          : chip("#f1f5f9", "#111827");

  const payChip = pago ? chip("#ecfdf5", "#065f46") : chip("#fff7ed", "#9a3412");

  return (
    <div style={tableRow}>
      <div style={{ flex: 1.7, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={nome}
              style={{ width: 28, height: 28, borderRadius: "50%" }}
            />
          ) : (
            <div style={avatarBox}>{(nome || "?").charAt(0).toUpperCase()}</div>
          )}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nome}
          </span>
        </div>
        <div style={subLine}>{user?.email || "—"} • {contato} • {cidadeUf}</div>
      </div>

      <div style={{ flex: 1 }}>
        <span style={stChip}>
          {a.status === "unlocked" ? (
            <LockOpen size={12} />
          ) : a.status === "canceled" ? (
            <Ban size={12} />
          ) : a.status === "viewed" ? (
            <CheckCircle2 size={12} />
          ) : (
            <CheckCircle2 size={12} />
          )}
          {a.status}
        </span>
      </div>

      <div style={{ flex: 0.8 }}>
        <span style={payChip}>
          <CreditCard size={12} /> {pago ? "pago" : "pendente"}
        </span>
      </div>

      <div
        style={{
          flex: 0.6,
          textAlign: "right",
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        {toReais(a.pricing?.amount)}
      </div>
      <div
        style={{
          flex: 0.6,
          textAlign: "right",
          color: "#64748b",
          fontWeight: 800,
        }}
      >
        {a.pricing?.cap != null ? a.pricing.cap : "—"}
      </div>

      <div
        style={{
          flex: 1.6,
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          flexWrap: "wrap",
        }}
      >
        {!pago ? (
          <button onClick={onPago} style={miniBtnGreen}>
            <CreditCard size={14} /> Marcar pago
          </button>
        ) : (
          <button onClick={onPendente} style={miniBtnYellow}>
            <Undo2 size={14} /> Pendente
          </button>
        )}
        {a.status !== "unlocked" && a.status !== "canceled" && (
          <button onClick={onLiberar} style={miniBtnBlue}>
            <LockOpen size={14} /> Liberar contato
          </button>
        )}
        {a.status !== "canceled" && a.status !== "unlocked" && (
          <button onClick={onCancelar} style={miniBtnOrange}>
            <Ban size={14} /> Cancelar envio
          </button>
        )}
        {a.status === "canceled" && (
          <button onClick={onReativar} style={miniBtnGray}>
            <RefreshCw size={14} /> Reativar envio
          </button>
        )}
        <button onClick={onExcluir} style={miniBtnRed}>
          <XCircle size={14} /> Excluir envio
        </button>
      </div>
    </div>
  );
}

/** ================= Estilos ================= */
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
const gridWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 18,
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
const chipTag: React.CSSProperties = {
  background: "#fff7ea",
  color: "#fb8500",
  fontWeight: 800,
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid #ffe4c4",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
const chipClose: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#fb8500",
  fontWeight: 900,
  cursor: "pointer",
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
  fontSize: "1rem",
  padding: "12px 16px",
  borderRadius: 12,
  cursor: "pointer",
  boxShadow: "0 2px 14px #0001",
};
const dangerBtn: React.CSSProperties = { ...primaryBtn, background: "#e11d48" };
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
const listBox: React.CSSProperties = {
  border: "1.5px solid #eaeef4",
  borderRadius: 14,
  overflow: "hidden",
  marginTop: 14,
};
const listHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  background: "#f8fafc",
  borderBottom: "1px solid #eef2f7",
};
const rowItem = (bg: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: bg,
});
const subLine: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const subMicro: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const hintText: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 6,
};
const centerBox: React.CSSProperties = {
  minHeight: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#2563eb",
};
const emptyBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #e2e8f0",
  borderRadius: 12,
  padding: 16,
  color: "#475569",
};

const tableHeader: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "10px 12px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
  borderRadius: 12,
  fontSize: 12,
  color: "#475569",
  fontWeight: 900,
};
const tableRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  padding: "12px 12px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  alignItems: "center",
};
const avatarBox: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
};

const miniBtnGreen: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#16a34a",
  color: "#fff",
  border: "1px solid #16a34a",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #16a34a22",
};
const miniBtnYellow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#f59e0b",
  color: "#fff",
  border: "1px solid #f59e0b",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #f59e0b22",
};
const miniBtnBlue: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#2563eb",
  color: "#fff",
  border: "1px solid #2563eb",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #2563eb22",
};
const miniBtnOrange: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#fb923c",
  color: "#fff",
  border: "1px solid #fb923c",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #fb923c22",
};
const miniBtnGray: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#475569",
  color: "#fff",
  border: "1px solid #475569",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #47556922",
};
const miniBtnRed: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#e11d48",
  color: "#fff",
  border: "1px solid #e11d48",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #e11d4822",
};

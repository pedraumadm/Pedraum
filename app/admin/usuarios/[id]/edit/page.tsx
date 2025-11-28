"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import { usuarioConverter } from "@/lib/fs-converters";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { sendPasswordResetEmail, getIdToken } from "firebase/auth";
import ImageUploader from "@/components/ImageUploader";
import {
  ChevronLeft,
  Save,
  Mail,
  Key,
  CheckCircle,
  Shield,
  Tag,
  LinkIcon,
  Eye,
  Download,
  Trash2,
  FileText,
  Upload,
  Plus,
  Lock,
  Edit3,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/** ==== PDF (SSR off para evitar erro no Next) ==== */
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

/* ========= Constantes ========= */
const estados = [
  "BRASIL","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const diasSemana = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

/** ====== Tipos ====== */
type AgendaDia = { ativo: boolean; das: string; ate: string };

// Legados (compat)
type CategoriaPair = { categoria: string; subcategoria: string };
type CategoriaTriplet = { categoria: string; subcategoria: string; item: string };

/** ====== NOVO MODELO ====== */
type OfertaBasica = { ativo: boolean; obs: string };
export type AtuacaoBasicaPorCategoria = {
  categoria: string;
  vendaProdutos: OfertaBasica;
  vendaPecas: OfertaBasica;
  servicos: OfertaBasica;
};

type PerfilForm = {
  id: string;

  // Patrocínio
  isPatrocinador?: boolean;
  patrocinadorDesde?: any;
  patrocinadorAte?: any;

  nome: string;
  email: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  cpf_cnpj?: string;
  bio?: string;
  avatar?: string;
  tipo?: string;

  prestaServicos: boolean;
  vendeProdutos: boolean;
  categoryLimit?: number;

  /** ===== NOVO: fonte da verdade simplificada ===== */
  atuacaoBasica: AtuacaoBasicaPorCategoria[];

  /** ===== LEGADO: compat (não usados na nova UI) ===== */
  categoriasAtuacaoPairs: CategoriaPair[];
  categoriasAtuacaoTriplets?: CategoriaTriplet[];
  categoriasAtuacao: string[];

  // Lock opcional herdado do perfil
  categoriasLocked?: boolean;

  atendeBrasil: boolean;
  ufsAtendidas: string[];

  agenda: Record<string, AgendaDia>;

  portfolioImagens: string[];
  portfolioPDFs?: string[];
  portfolioPdfUrl?: string | null;
  portfolioVideos: string[];

  leadPreferencias: {
    categorias: string[];
    ufs: string[];
    ticketMin?: number | null;
    ticketMax?: number | null;
  };

  /** ===== NOVO: Configuração de leads / demandas ===== */
  leadConfig?: {
    mode?: "free" | "paid";       // "free" => desbloqueios gratuitos, "paid" => via checkout
    freeQuota?: number | null;    // opcional: limite de oportunidades grátis (degustação)
  };

  mpConnected?: boolean;
  mpStatus?: string;

  // Extras do Admin
  status?: "ativo" | "suspenso" | "banido";
  verificado?: boolean;
  role?: "user" | "seller" | "admin";
  financeiro?: {
    plano?: string;
    situacao?: "pago" | "pendente";
    valor?: number | null;
    proxRenovacao?: any;
  };
  limites?: {
    leadsDia?: number | null;
    prioridade?: number | null;
    bloquearUFs?: string[];
    bloquearCategorias?: string[];
  };
  observacoesInternas?: string;
  requirePasswordChange?: boolean;
};

/** =========================
 * Helpers (harmonizados com /perfil)
 * ========================= */
const norm = (s: string = "") =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
const normCat = (s: string = "") => norm(s);

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}
function maskBRFrom55(input: string) {
  const d = onlyDigits(input || "");
  const body = d.startsWith("55") ? d.slice(2) : d;
  const ddd = body.slice(0, 2);
  const num = body.slice(2);
  if (!ddd) return "+55 ";
  let masked = `+55 (${ddd}) `;
  if (num.length <= 4) return masked + num;
  if (num.length <= 8) return masked + `${num.slice(0, 4)}-${num.slice(4)}`;
  return masked + `${num.slice(0, 5)}-${num.slice(5)}`;
}
function toDigits55FromFree(input: string) {
  const d = onlyDigits(input || "");
  return d.startsWith("55") ? d : d ? `55${d}` : "";
}
const buildUfsSearch = (atendeBrasil: boolean, ufsAtendidas: string[] = []) => {
  const arr = (ufsAtendidas || []).map((u) => String(u).trim().toUpperCase());
  if (atendeBrasil && !arr.includes("BRASIL")) arr.push("BRASIL");
  return Array.from(new Set(arr));
};

/* ===== Helpers de linguagem iguais ao /perfil ===== */
type LinguaCat = {
  visivelPlural?: string;
  visivelSingular?: string;
  prepProdutos?: string;
  prepPecas?: string;
  prepServicos?: string;
};

const LINGUAGEM: Record<string, LinguaCat> = {
  Britadores: { visivelPlural: "britadores", prepProdutos: "", prepPecas: "para", prepServicos: "em" },
  Transportadores: { visivelPlural: "transportadores", prepProdutos: "", prepPecas: "para", prepServicos: "em" },
  Peneiramento: { visivelPlural: "peneiras", prepProdutos: "", prepPecas: "para", prepServicos: "em" },
  Concreto: { visivelPlural: "equipamentos de concreto", prepProdutos: "de", prepPecas: "para", prepServicos: "em" },
};

function toPluralVisivel(cat: string) {
  return (cat || "").trim().toLowerCase();
}
function prepProdutosPadrao() { return ""; }
function prepPecasPadrao() { return "para"; }
function prepServicosPadrao() { return "em"; }

function labelProdutos(cat: string) {
  if (!cat) return "Vendo produtos";
  const meta = LINGUAGEM[cat] || {};
  const alvo = (meta.visivelPlural || toPluralVisivel(cat)).trim();
  const prep = (meta.prepProdutos ?? prepProdutosPadrao()).trim();
  const partePrep = prep ? ` ${prep}` : "";
  return `Vendo${partePrep} ${alvo}`.replace("  ", " ");
}
function labelPecas(cat: string) {
  if (!cat) return "Vendo peças";
  const meta = LINGUAGEM[cat] || {};
  const alvo = (meta.visivelPlural || toPluralVisivel(cat)).trim();
  const prep = (meta.prepPecas ?? prepPecasPadrao()).trim();
  return `Vendo peças ${prep} ${alvo}`;
}
function labelServicos(cat: string) {
  if (!cat) return "Presto serviços";
  const meta = LINGUAGEM[cat] || {};
  const alvo = (meta.visivelPlural || toPluralVisivel(cat)).trim();
  const prep = (meta.prepServicos ?? prepServicosPadrao()).trim();
  return `Presto serviços ${prep} ${alvo}`;
}
function phProdutos(cat: string) {
  if (!cat) return "Descreva o que você vende (obrigatório)";
  const alvo = (LINGUAGEM[cat]?.visivelPlural || toPluralVisivel(cat)).trim();
  const prep = (LINGUAGEM[cat]?.prepProdutos ?? prepProdutosPadrao()).trim();
  const partePrep = prep ? ` ${prep}` : "";
  return `Descreva o que você vende${partePrep} ${alvo} (obrigatório)`.replace("  ", " ");
}
function phPecas(cat: string) {
  if (!cat) return "Quais peças você vende? (obrigatório)";
  const alvo = (LINGUAGEM[cat]?.visivelPlural || toPluralVisivel(cat)).trim();
  const prep = (LINGUAGEM[cat]?.prepPecas ?? prepPecasPadrao()).trim();
  return `Quais peças você vende ${prep} ${alvo}? (obrigatório)`;
}
function phServicos(cat: string) {
  if (!cat) return "Quais serviços você presta? (obrigatório)";
  const alvo = (LINGUAGEM[cat]?.visivelPlural || toPluralVisivel(cat)).trim();
  const prep = (LINGUAGEM[cat]?.prepServicos ?? prepServicosPadrao()).trim();
  return `Quais serviços você presta ${prep} ${alvo}? (obrigatório)`;
}

// ===== Inteligência de texto =====
const stopwordsPT = new Set([
  "de","da","do","das","dos","em","para","por","com","e","ou","a","o","as","os","um","uma","no","na","nos","nas","ao","à","às","aos","que","é","ser",
]);

function titleCase(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/\b([a-zá-úà-ùâ-ûãõç])(\w*)/giu, (_, a, b) => a.toUpperCase() + b);
}

function simplifyText(s: string) {
  return (s || "")
    .replace(/\s+/g, " ")
    .replace(/\b(conserto\s+e\s+manutenção|manutenção\s+e\s+conserto)\b/gi, "manutenção")
    .replace(/\b(pecas|peças)\s+(automotivas|máquinas)\b/gi, "peças")
    .trim();
}

function uniqWords(s: string) {
  const seen = new Set<string>();
  return (s || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !stopwordsPT.has(w))
    .filter((w) => (seen.has(w) ? false : (seen.add(w), true)));
}

function keywordsFromText(...fields: string[]) {
  const words = uniqWords(fields.map(simplifyText).join(" "));
  return words.filter((w) => w.length >= 3 && !/^\d+$/.test(w)).slice(0, 10);
}

function joinNatural(items: string[]) {
  if (!items?.length) return "";
  if (items.length === 1) return items[0];
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(", ")} e ${last}`;
}

function coverageLabel(atendeBrasil: boolean, cidade?: string, estado?: string, ufs: string[] = []) {
  if (atendeBrasil) return "Atendo em todo o Brasil";
  const uf = (estado || "").toUpperCase();
  if (cidade && uf) return `Atendo em ${titleCase(cidade)} (${uf})${ufs.length ? ` e ${ufs.length} UFs` : ""}`;
  if (uf) return `Atendo ${uf}${ufs.length ? ` +${ufs.length - 1} UFs` : ""}`;
  if (ufs?.length) return `Atendo ${ufs.length} UFs`;
  return "";
}

type MotorOut = {
  headline: string;
  fraseCurta: string;
  fraseLonga: string;
  bullets: string[];
  hashtags: string[];
  score: number;
  faltas: string[];
};

function scoreCategoria(
  vendaProdutosAtivo: boolean, vendaProdutosObs: string,
  vendaPecasAtivo: boolean, vendaPecasObs: string,
  servicosAtivo: boolean, servicosObs: string,
) {
  let score = 0;
  const faltas: string[] = [];

  const blocks: Array<[boolean,string]> = [
    [vendaProdutosAtivo, vendaProdutosObs],
    [vendaPecasAtivo, vendaPecasObs],
    [servicosAtivo, servicosObs],
  ];

  blocks.forEach(([on, obs]) => {
    if (on) {
      score += 20;
      if ((obs || "").trim().length >= 8) score += 10;
      else faltas.push("Detalhar melhor uma das descrições");
      if (/\b(abb|siemens|weg|schneider|festo|bosch|fanuc|kuka|mitsubishi)\b/i.test(obs)) score += 8;
      if (/\b(sla|prazo|24h|48h|emerg|garantia)\b/i.test(obs)) score += 6;
      if (/\b(brasil|ufs?|regi(ão|oes)|sudeste|sul|norte|nordeste|centro-oeste)\b/i.test(obs)) score += 6;
      if (/\b(industrial|linha de produção|automação|cnc|rob[oô]tica)\b/i.test(obs)) score += 6;
    }
  });

  score = Math.max(0, Math.min(100, score));
  if (score < 40) faltas.push("Especificar marcas/linhas atendidas, prazos/SLA e regiões");
  return { score, faltas: Array.from(new Set(faltas)) };
}

function gerarInteligenciaCategoria(
  categoria: string,
  vendaProdutosAtivo: boolean, vendaProdutosObs: string,
  vendaPecasAtivo: boolean, vendaPecasObs: string,
  servicosAtivo: boolean, servicosObs: string,
  ctx: { cidade?: string; estado?: string; atendeBrasil: boolean; ufsAtendidas: string[] }
): MotorOut {
  const cat = titleCase(categoria || "");
  const pObs = simplifyText(vendaProdutosObs || "");
  const pecObs = simplifyText(vendaPecasObs || "");
  const sObs = simplifyText(servicosObs || "");

  const { score, faltas } = scoreCategoria(
    vendaProdutosAtivo, pObs,
    vendaPecasAtivo, pecObs,
    servicosAtivo, sObs,
  );

  const cobertura = coverageLabel(!!ctx.atendeBrasil, ctx.cidade, ctx.estado, ctx.ufsAtendidas);

  const partes: string[] = [];
  if (vendaProdutosAtivo) partes.push(pObs ? `vendo ${pObs}` : `vendo produtos de ${cat}`);
  if (vendaPecasAtivo) partes.push(pecObs ? `vendo peças: ${pecObs}` : `vendo peças para ${cat}`);
  if (servicosAtivo) partes.push(sObs ? `presto serviços: ${sObs}` : `presto serviços em ${cat}`);

  const fraseCurta = [titleCase(cat), "—", titleCase(partes[0] || "Atuação na categoria")].join(" ").trim();

  const longBits = [titleCase(joinNatural(partes.map(titleCase)))];
  if (cobertura) longBits.push(`• ${cobertura}`);
  const fraseLonga = longBits.filter(Boolean).join("  ");

  const brandHints = [pObs, pecObs, sObs].join(" ");
  const kws = keywordsFromText(cat, brandHints);
  const hashtags = kws.slice(0, 8).map((k) => (k.includes(" ") ? `#${k.replace(/\s+/g, "")}` : `#${k}`));

  const bullets = [
    vendaProdutosAtivo ? "Produtos com nota e garantia" : null,
    vendaPecasAtivo ? "Peças originais e paralelas" : null,
    servicosAtivo ? "Serviços com SLA e contrato" : null,
    cobertura || null,
  ].filter(Boolean) as string[];

  const headline = [
    servicosAtivo ? "Serviços" : (vendaProdutosAtivo || vendaPecasAtivo) ? "Fornecimento" : "Atuação",
    " em ",
    cat,
    cobertura ? ` • ${cobertura}` : "",
  ].join("");

  return {
    headline: titleCase(headline),
    fraseCurta,
    fraseLonga,
    bullets: bullets.slice(0, 4),
    hashtags,
    score,
    faltas,
  };
}


/** =========================
 * Página
 * ========================= */
export default function AdminEditarUsuarioPage() {
  const params = useParams() as { id?: string | string[] };
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState<PerfilForm | null>(null);

  /** NOVO: estatísticas de demandas / oportunidades desse fornecedor */
  const [leadStats, setLeadStats] = useState({
    loading: true,
    total: 0,
    unlocked: 0,
    freeUnlocked: 0,
    paidUnlocked: 0,
  });

  // Taxonomia (apenas nível de categorias) — fallback defensivo
  const { categorias = [] as { nome: string }[], loading: taxLoading } = useTaxonomia();
  const categoriasOrdenadas = useMemo(
    () => [...(categorias || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [categorias],
  );

  // PDFs
  const [pdfExpandido, setPdfExpandido] = useState<string | null>(null);

  // modal de senha
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const senhaForca = pwd1.length >= 12 ? "Alta" : pwd1.length >= 8 ? "Média" : "Baixa";

  // NOVOS: geração de senha temporária
  const [tempPass, setTempPass] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // avatar como lista pro ImageUploader
  const avatarLista = useMemo(() => (form?.avatar ? [form.avatar] : []), [form?.avatar]);

  useEffect(() => {
    (async () => {
      try {
        if (!id) throw new Error("ID inválido");
        const ref = doc(db, "usuarios", id).withConverter(usuarioConverter);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setMsg("Usuário não encontrado.");
          setLoading(false);
          return;
        }
        const data = snap.data() as any;

        const baseAgenda = Object.fromEntries(
          diasSemana.map((d) => [d.key, { ativo: d.key !== "dom", das: "08:00", ate: "18:00" }]),
        ) as Record<string, AgendaDia>;

        // PDFs: aceita string única ou array
        const pdfs: string[] = Array.isArray(data.portfolioPDFs)
          ? data.portfolioPDFs
          : data.portfolioPdfUrl
          ? [data.portfolioPdfUrl]
          : [];

        const leadConfig = (data.leadConfig as PerfilForm["leadConfig"]) || {
          mode: "free",
          freeQuota: null,
        };

        setForm({
          id,
          nome: data.nome || "",
          isPatrocinador: !!data.isPatrocinador,
          patrocinadorDesde: data.patrocinadorDesde || null,
          patrocinadorAte: data.patrocinadorAte || null,
          email: data.email || "",
          telefone: (data as any).whatsappE164
            ? maskBRFrom55((data as any).whatsappE164)
            : (data as any).whatsapp
            ? maskBRFrom55((data as any).whatsapp)
            : data.telefone || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: (data as any).cpf_cnpj || (data as any).cpfCnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || "Usuário",

          prestaServicos: !!data.prestaServicos,
          vendeProdutos: !!data.vendeProdutos,

          atuacaoBasica: Array.isArray(data.atuacaoBasica) ? data.atuacaoBasica : [],

          // legados (typo corrigido)
          categoriasAtuacaoPairs: Array.isArray((data as any).categoriasAtuacaoPairs)
            ? (data as any).categoriasAtuacaoPairs
            : [],
          categoriasAtuacaoTriplets: Array.isArray((data as any).categoriasAtuacaoTriplets)
            ? (data as any).categoriasAtuacaoTriplets
            : [],
          categoriasAtuacao: Array.isArray((data as any).categoriasAtuacao)
            ? (data as any).categoriasAtuacao
            : [],
          categoriasLocked: !!(data as any).categoriasLocked,

          atendeBrasil: !!data.atendeBrasil,
          ufsAtendidas: Array.isArray(data.ufsAtendidas) ? data.ufsAtendidas : [],

          agenda: (data as any).agenda || baseAgenda,

          portfolioImagens: Array.isArray(data.portfolioImagens) ? data.portfolioImagens : [],
          portfolioVideos: Array.isArray(data.portfolioVideos) ? data.portfolioVideos : [],
          portfolioPDFs: pdfs,
          portfolioPdfUrl: data.portfolioPdfUrl || null,

          leadPreferencias: {
            categorias: (data.leadPreferencias?.categorias as string[]) || [],
            ufs: (data.leadPreferencias?.ufs as string[]) || [],
            ticketMin: data.leadPreferencias?.ticketMin ?? null,
            ticketMax: data.leadPreferencias?.ticketMax ?? null,
          },

          /** NOVO: config de leads / demandas */
          leadConfig,

          mpConnected: !!data.mpConnected,
          mpStatus: data.mpStatus || "desconectado",
          categoryLimit: Number((data as any)?.categoryLimit ?? 3),

          status: (data.status as any) || "ativo",
          verificado: !!data.verificado,
          role: (data.role as any) || "user",
          financeiro: {
            plano: (data.financeiro as any)?.plano || "",
            situacao: (data.financeiro as any)?.situacao || "pendente",
            valor: (data.financeiro as any)?.valor ?? null,
            proxRenovacao: (data.financeiro as any)?.proxRenovacao || "",
          },
          limites: {
            leadsDia: (data.limites as any)?.leadsDia ?? 10,
            prioridade: (data.limites as any)?.prioridade ?? 0,
            bloquearUFs: (data.limites as any)?.bloquearUFs || [],
            bloquearCategorias: (data.limites as any)?.bloquearCategorias || [],
          },
          observacoesInternas: (data as any).observacoesInternas || "",
          requirePasswordChange: !!data.requirePasswordChange,
        });
      } catch (e) {
        console.error(e);
        setMsg("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /** NOVO: carrega estatísticas de demandas desse fornecedor */
  useEffect(() => {
    if (!form?.id) return;

    (async () => {
      try {
        setLeadStats((prev) => ({ ...prev, loading: true }));

        // Todas as oportunidades enviadas para este fornecedor
        const baseQ = query(
          collection(db, "demandAssignments"),
          where("supplierId", "==", form.id)
        );
        const totalSnap = await getCountFromServer(baseQ as any);
        const total = totalSnap.data().count || 0;

        // Somente as desbloqueadas
        const unlockedQ = query(
          collection(db, "demandAssignments"),
          where("supplierId", "==", form.id),
          where("status", "==", "unlocked")
        );
        const unlockedSnap = await getCountFromServer(unlockedQ as any);
        const unlocked = unlockedSnap.data().count || 0;

        // Desbloqueadas grátis
        let freeUnlocked = 0;
        try {
          const freeQ = query(
            collection(db, "demandAssignments"),
            where("supplierId", "==", form.id),
            where("status", "==", "unlocked"),
            where("billingType", "==", "free")
          );
          const freeSnap = await getCountFromServer(freeQ as any);
          freeUnlocked = freeSnap.data().count || 0;
        } catch {
          freeUnlocked = 0;
        }

        // Desbloqueadas pagas
        let paidUnlocked = 0;
        try {
          const paidQ = query(
            collection(db, "demandAssignments"),
            where("supplierId", "==", form.id),
            where("status", "==", "unlocked"),
            where("billingType", "==", "paid")
          );
          const paidSnap = await getCountFromServer(paidQ as any);
          paidUnlocked = paidSnap.data().count || 0;
        } catch {
          paidUnlocked = 0;
        }

        setLeadStats({
          loading: false,
          total,
          unlocked,
          freeUnlocked,
          paidUnlocked,
        });
      } catch (e) {
        console.error("Erro ao carregar estatísticas de demandas:", e);
        setLeadStats((prev) => ({ ...prev, loading: false }));
      }
    })();
  }, [form?.id]);

  function setField<K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  // ====== Editor local de categoria (sem sub), iguais ao /perfil ======
  const [selCategoria, setSelCategoria] = useState("");
  const [vendaProdutosAtivo, setVendaProdutosAtivo] = useState(false);
  const [vendaProdutosObs, setVendaProdutosObs] = useState("");
  const [vendaPecasAtivo, setVendaPecasAtivo] = useState(false);
  const [vendaPecasObs, setVendaPecasObs] = useState("");
  const [servicosAtivo, setServicosAtivo] = useState(false);
  const [servicosObs, setServicosObs] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const nomesCategoriasTodos = useMemo(() => (categorias || []).map((c) => c.nome), [categorias]);

  const atingiuLimite = useMemo(() => {
    const lim = Number(form?.categoryLimit ?? 3);
    return (form?.atuacaoBasica?.length || 0) >= lim;
  }, [form?.atuacaoBasica?.length, form?.categoryLimit]);

  const selecionadaJaExiste = useMemo(() => {
    const k = normCat(selCategoria);
    return !!form?.atuacaoBasica?.find((a) => normCat(a.categoria) === k);
  }, [form?.atuacaoBasica, selCategoria]);

  const intelPreview = useMemo(() => {
    if (!selCategoria) return null;
    return gerarInteligenciaCategoria(
      selCategoria,
      vendaProdutosAtivo, vendaProdutosObs,
      vendaPecasAtivo,  vendaPecasObs,
      servicosAtivo,    servicosObs,
      {
        cidade: form?.cidade,
        estado: form?.estado,
        atendeBrasil: !!form?.atendeBrasil,
        ufsAtendidas: form?.ufsAtendidas || []
      }
    );
  }, [
    selCategoria,
    vendaProdutosAtivo, vendaProdutosObs,
    vendaPecasAtivo, vendaPecasObs,
    servicosAtivo, servicosObs,
    form?.cidade, form?.estado, form?.atendeBrasil, form?.ufsAtendidas
  ]);

  function resetEditorCategoria() {
    setSelCategoria("");
    setVendaProdutosAtivo(false);
    setVendaProdutosObs("");
    setVendaPecasAtivo(false);
    setVendaPecasObs("");
    setServicosAtivo(false);
    setServicosObs("");
  }

  function carregarEditorDeUmaCategoria(cat: AtuacaoBasicaPorCategoria) {
    setSelCategoria(cat.categoria);
    setVendaProdutosAtivo(!!cat.vendaProdutos?.ativo);
    setVendaProdutosObs(cat.vendaProdutos?.obs || "");
    setVendaPecasAtivo(!!cat.vendaPecas?.ativo);
    setVendaPecasObs(cat.vendaPecas?.obs || "");
    setServicosAtivo(!!cat.servicos?.ativo);
    setServicosObs(cat.servicos?.obs || "");
    setEditorOpen(true);
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function addOuAtualizaCategoriaBasica() {
    if (!form) return;
    const categoria = selCategoria.trim();
    if (!categoria) { setMsg("Selecione uma categoria."); return; }

    if (vendaProdutosAtivo && !vendaProdutosObs.trim()) { setMsg("Descreva o que vende em 'Vendo produtos'."); return; }
    if (vendaPecasAtivo && !vendaPecasObs.trim()) { setMsg("Descreva quais peças você vende."); return; }
    if (servicosAtivo && !servicosObs.trim()) { setMsg("Descreva quais serviços você presta."); return; }

    const novo: AtuacaoBasicaPorCategoria = {
      categoria,
      vendaProdutos: { ativo: vendaProdutosAtivo, obs: vendaProdutosObs.trim() },
      vendaPecas: { ativo: vendaPecasAtivo, obs: vendaPecasObs.trim() },
      servicos: { ativo: servicosAtivo, obs: servicosObs.trim() },
    };

    const atual = form.atuacaoBasica || [];
    const existe = atual.find((a) => a.categoria === categoria);
    const limite = Number(form.categoryLimit ?? 3);
    const jaNoLimite = atual.length >= limite;

    if (!existe && jaNoLimite) {
      setMsg(`Você atingiu o limite de ${limite} categoria(s).`);
      return;
    }

    const atuacaoBasica = existe
      ? atual.map((a) => (a.categoria === categoria ? novo : a))
      : [...atual, novo];

    setForm({ ...form, atuacaoBasica });
    setMsg(existe ? "Categoria atualizada." : "Categoria adicionada.");
    setTimeout(() => setMsg(""), 2500);
    resetEditorCategoria();
    setEditorOpen(false);
  }


  function removerCategoriaBasica(categoria: string) {
    if (!form) return;
    const key = normCat(categoria);
    const atuacaoBasica = (form.atuacaoBasica || []).filter((a) => normCat(a.categoria) !== key);
    setForm({ ...form, atuacaoBasica });
    if (normCat(selCategoria) === key) resetEditorCategoria();
  }

  // ======= PDFs =======
  function addPDF(url: string) {
    if (!form) return;
    const v = (url || "").trim();
    if (!v) return;
    setForm({
      ...form,
      portfolioPDFs: Array.from(new Set([...(form.portfolioPDFs || []), v])),
    });
  }
  function removePDF(url: string) {
    if (!form) return;
    setForm({
      ...form,
      portfolioPDFs: (form.portfolioPDFs || []).filter((u) => u !== url),
    });
    if (pdfExpandido === url) setPdfExpandido(null);
  }

  // ======= Imagens: remover =======
  function removeImagem(url: string) {
    if (!form) return;
    setForm({
      ...form,
      portfolioImagens: (form.portfolioImagens || []).filter((u) => u !== url),
    });
  }

  // === salvar (sincronizado com /perfil — novo modelo) ===
  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    setMsg("");

    try {
      // validações do novo modelo
      for (const a of form.atuacaoBasica || []) {
        if (a.vendaProdutos.ativo && !a.vendaProdutos.obs?.trim()) {
          setMsg(`Descreva o que vende em "Vendo produtos" para ${a.categoria}.`);
          setSaving(false);
          return;
        }
        if (a.vendaPecas.ativo && !a.vendaPecas.obs?.trim()) {
          setMsg(`Descreva "Quais peças" para ${a.categoria}.`);
          setSaving(false);
          return;
        }
        if (a.servicos.ativo && !a.servicos.obs?.trim()) {
          setMsg(`Descreva "Que serviços" para ${a.categoria}.`);
          setSaving(false);
          return;
        }
      }

      // categorias distintas para busca/compat
      const categoriasDistintas = Array.from(
        new Set((form.atuacaoBasica || []).map((a) => a.categoria).filter(Boolean)),
      );

      // UFs
      const atendeBrasil = !!form.atendeBrasil;
      const ufsAtendidas = atendeBrasil
        ? ["BRASIL"]
        : Array.from(new Set((form.ufsAtendidas || []).map((u) => String(u).trim().toUpperCase())));
      const ufsSearch = buildUfsSearch(atendeBrasil, ufsAtendidas);

      // Materialização simples (igual /perfil)
      const categoriesAll = categoriasDistintas;

      // PDFs (compat c/ página de perfil)
      const pdfList = form.portfolioPDFs || [];
      const firstPdf = pdfList[0] || null;

      // WhatsApp: normaliza como no /perfil
      const wDigits55 = form.telefone ? toDigits55FromFree(form.telefone) : "";
      const wE164 = wDigits55 ? `+${wDigits55}` : "";

 const bc = new BroadcastChannel("admin-users");
bc.postMessage({
  type: "user-updated",
  id: form.id, // usamos o id do próprio formulário
  patch: {
    isPatrocinador: form.isPatrocinador,
    patrocinadorDesde: form.patrocinadorDesde,
    patrocinadorAte: form.patrocinadorAte,
    role: form.isPatrocinador ? "patrocinador" : "usuario",
    tipo: form.isPatrocinador ? "patrocinador" : "usuario",
  },
});
bc.close();


      await updateDoc(doc(db, "usuarios", form.id), {
        // Identidade
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || "",
        whatsapp: wDigits55 || "",
        whatsappE164: wE164 || "",
        cidade: form.atendeBrasil ? "" : form.cidade || "",
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",
        tipo: form.tipo || "Usuário",

        // Atuação
        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,

        /** ===== NOVO ===== */
        atuacaoBasica: form.atuacaoBasica || [],

        /** ===== Compat mínima ===== */
        categoriasAtuacao: categoriasDistintas,
        categorias: categoriasDistintas,

        /** ===== Materialização p/ busca ===== */
        categoriesAll,
        ufsSearch,

        // Cobertura
        atendeBrasil,
        ufsAtendidas,

        // Portfólio (imagens + PDFs)
        portfolioImagens: form.portfolioImagens || [],
        portfolioVideos: form.portfolioVideos || [],
        portfolioPDFs: pdfList, // lista completa
        portfolioPdfUrl: firstPdf, // compat

        // Preferências de lead
        leadPreferencias: {
          categorias: form.leadPreferencias?.categorias || [],
          ufs: form.leadPreferencias?.ufs || [],
          ticketMin: form.leadPreferencias?.ticketMin ?? null,
          ticketMax: form.leadPreferencias?.ticketMax ?? null,
        },

        /** ===== NOVO: Config de leads / demandas ===== */
        leadConfig: {
          mode: form.leadConfig?.mode || "free",
          freeQuota:
            form.leadConfig?.freeQuota === undefined || form.leadConfig?.freeQuota === null
              ? null
              : Number(form.leadConfig.freeQuota),
        },

        // MP
        mpConnected: !!form.mpConnected,
        mpStatus: form.mpStatus || "desconectado",

        // Extras admin
        status: form.status || "ativo",
        verificado: !!form.verificado,
        role: form.role || "user",
        financeiro: {
          plano: form.financeiro?.plano || "",
          situacao: form.financeiro?.situacao || "pendente",
          valor: form.financeiro?.valor ?? null,
          proxRenovacao: form.financeiro?.proxRenovacao || "",
        },
        limites: {
          leadsDia: form.limites?.leadsDia ?? 10,
          prioridade: form.limites?.prioridade ?? 0,
          bloquearUFs: form.limites?.bloquearUFs || [],
          bloquearCategorias: form.limites?.bloquearCategorias || [],
        },
        observacoesInternas: form.observacoesInternas || "",
        requirePasswordChange: !!form.requirePasswordChange,
        categoryLimit: Number(form.categoryLimit ?? 3),
        atualizadoEm: serverTimestamp(),
      });

      setMsg("Alterações salvas com sucesso.");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  // ====== Ações de senha/sessão ======
  async function enviarResetSenha() {
    if (!form?.email) {
      setMsg("Usuário sem e-mail.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, form.email);
      setMsg("E-mail de redefinição enviado.");
    } catch (e) {
      console.error(e);
      setMsg("Falha ao enviar e-mail de redefinição.");
    } finally {
      setTimeout(() => setMsg(""), 4000);
    }
  }

  async function salvarNovaSenha() {
    if (!form) return;
    if (pwd1.length < 8) {
      setMsg("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (pwd1 !== pwd2) {
      setMsg("As senhas não coincidem.");
      return;
    }
    setPwdSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Admin não autenticado.");
      const token = await getIdToken(user, true);

      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: form.id, newPassword: pwd1 }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) throw new Error("Sessão inválida/expirada (401). Faça login novamente.");
        if (res.status === 403) throw new Error("Seu usuário não está autorizado. Verifique ADMIN_EMAILS/ADMIN_ALLOWED_EMAILS.");
        throw new Error(json?.message || json?.error || "Falha ao redefinir senha.");
      }

      setMsg("Senha redefinida com sucesso. Exigir troca no próximo login está ativo.");
      setShowPwdModal(false);
      setPwd1("");
      setPwd2("");
      setField("requirePasswordChange", true);
    } catch (e) {
      console.error(e);
      setMsg("Erro ao redefinir senha.");
    } finally {
      setPwdSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  async function gerarSenhaTemporaria() {
    if (!form) return;
    setGenError(null);
    setGenLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Admin não autenticado.");
      const token = await getIdToken(user, true);

      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: form.id, generate: true }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao gerar senha temporária.");

      setTempPass(json.tempPassword || "");
      setMsg("Senha temporária gerada. Envie ao usuário e ele será obrigado a trocar no login.");
      setField("requirePasswordChange", true);
    } catch (e: any) {
      console.error(e);
      setGenError(e?.message || "Erro ao gerar senha temporária.");
    } finally {
      setGenLoading(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  async function revogarSessoes() {
    if (!form) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Admin não autenticado.");
      const token = await getIdToken(user, true);

      const res = await fetch("/api/admin/revoke-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: form.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao encerrar sessões.");

      setMsg("Sessões encerradas. O usuário precisará logar novamente.");
    } catch (e) {
      console.error(e);
      setMsg("Falha ao encerrar sessões.");
    } finally {
      setTimeout(() => setMsg(""), 4000);
    }
  }

  if (loading) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "50px 2vw 70px 2vw" }}>
        <div style={{ textAlign: "center", color: "#219EBC", fontWeight: 800 }}>Carregando usuário...</div>
      </section>
    );
  }

  if (!form) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
        {msg || "Usuário não encontrado."}
      </section>
    );
  }

  const cidadesDesabilitadas = !form.estado || form.estado === "BRASIL";

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
      <Link
        href="/admin/usuarios"
        className="hover:opacity-80"
        style={{ color: "#2563eb", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, textDecoration: "none" }}
      >
        <ChevronLeft size={18} /> Voltar
      </Link>

      <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px", marginBottom: 20 }}>
        Editar Usuário (Admin)
      </h1>

      <form onSubmit={salvar} className="grid gap-16">
        {/* Identidade */}
        <div className="card">
          <div className="card-title">Identidade e Contato</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="label">Foto do Perfil</div>
              <ImageUploader imagens={avatarLista} setImagens={(imgs: string[]) => setField("avatar", imgs[0] || "")} max={1} />
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Use imagem quadrada para melhor resultado.</div>
            </div>

            <div className="grid gap-4">
              <label className="label" htmlFor="nome">Nome</label>
              <input id="nome" className="input" value={form.nome} onChange={(e) => setField("nome", e.target.value)} required />

              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" className="input" value={form.email} onChange={(e) => setField("email", e.target.value)} />

              <label className="label" htmlFor="whatsapp">WhatsApp</label>
              <input
                id="whatsapp"
                className="input"
                value={form.telefone || ""}
                onChange={(e) => setField("telefone", maskBRFrom55(e.target.value))}
                placeholder="(xx) xxxxx-xxxx"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="uf">Estado (UF)</label>
                  <select
                    id="uf"
                    className="input"
                    value={form.estado || ""}
                    onChange={(e) => setForm((f) => ({ ...f!, estado: e.target.value, cidade: "" }))}
                  >
                    <option value="">Selecione</option>
                    {estados.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="cidade">Cidade</label>
                  <input
                    id="cidade"
                    className="input"
                    value={form.cidade || ""}
                    onChange={(e) => setField("cidade", e.target.value)}
                    placeholder={cidadesDesabilitadas ? "—" : "Digite a cidade"}
                    disabled={cidadesDesabilitadas}
                  />
                </div>
              </div>

              <label className="label" htmlFor="cpfCnpj">CPF ou CNPJ</label>
              <input id="cpfCnpj" className="input" value={form.cpf_cnpj || ""} onChange={(e) => setField("cpf_cnpj", e.target.value)} />

              <label className="label" htmlFor="bio">Bio / Sobre</label>
              <textarea id="bio" className="input" rows={3} value={form.bio || ""} onChange={(e) => setField("bio", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Atuação — layout idêntico ao /perfil */}
        <div className="card">
          <div className="card-title">Atuação por Categoria</div>

          {/* contador/limite no topo */}
          <div style={{ marginBottom: 14, fontSize: 13, color: "#334155", fontWeight: 800 }}>
            Categorias: <b>{form.atuacaoBasica.length}/{Number(form.categoryLimit ?? 3)}</b>
            {atingiuLimite && (
              <span style={{ color: "#b91c1c", marginLeft: 8 }}>
                (Limite atingido)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Editor da categoria */}
            <div>
              <div className="label">Categoria</div>
              <select
                className="input"
                value={selCategoria}
                onChange={(e) => {
                  setSelCategoria(e.target.value);
                  if (e.target.value) {
                    setEditorOpen(true);
                    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                  }
                }}
                disabled={taxLoading}
              >
                <option value="">{taxLoading ? "Carregando categorias..." : "Selecionar categoria..."}</option>
                {nomesCategoriasTodos.map((c) => (
                  <option
                    key={c}
                    value={c}
                    disabled={atingiuLimite && !form.atuacaoBasica.find(a => a.categoria === c)}
                  >
                    {c}
                  </option>
                ))}
              </select>

              {/* aviso de limite como no perfil */}
              {atingiuLimite && selCategoria && !selecionadaJaExiste && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6, fontWeight: 800 }}>
                  Você já tem {Number(form.categoryLimit ?? 3)} categoria(s). Remova alguma para adicionar outra.
                </div>
              )}

              {/* EDITOR */}
              <div ref={editorRef}>
                {!selCategoria ? (
                  <div className="rounded-xl border p-4 mt-3" style={{ borderColor: "#e6ebf2", background: "#fff" }}>
                    <div style={{ fontWeight: 800, color: "#334155" }}>
                      Selecione uma categoria para configurar as opções.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border p-0 mt-3 overflow-hidden" style={{ borderColor: "#e6ebf2", background: "#f8fafc" }}>
                    {/* header compacto com toggle */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 12px",
                        background: "#eef6ff",
                        borderBottom: "1px solid #e6ebf2",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, color: "#023047" }}>Categoria:</span>
                        <span className="pill" style={{ background: "#eaf2ff", borderColor: "#dbe7ff", color: "#0f1a2a" }}>
                          {selCategoria}
                        </span>
                        {atingiuLimite && !selecionadaJaExiste && (
                          <span className="pill" style={{ background: "#fff1f2", borderColor: "#ffe0e6", color: "#be123c" }}>
                            Limite atingido
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-sec"
                        onClick={() => setEditorOpen((v) => !v)}
                        title={editorOpen ? "Fechar editor" : "Abrir editor"}
                      >
                        {editorOpen ? "Fechar editor" : "Abrir editor"}
                      </button>
                    </div>

                    {editorOpen && (
                      <div className="p-4">
                        <div className="label" style={{ marginBottom: 8 }}>
                          O que o usuário faz nessa categoria?
                        </div>

                        {/* Vendo produtos (dinâmico) */}
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={vendaProdutosAtivo}
                            onChange={(e) => setVendaProdutosAtivo(e.target.checked)}
                          />
                          <span>{labelProdutos(selCategoria)}</span>
                        </label>
                        {vendaProdutosAtivo && (
                          <textarea
                            className="input mt-2"
                            rows={3}
                            placeholder={phProdutos(selCategoria)}
                            value={vendaProdutosObs}
                            onChange={(e) => setVendaProdutosObs(e.target.value)}
                          />
                        )}

                        <div style={{ height: 10 }} />

                        {/* Vendo peças (dinâmico) */}
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={vendaPecasAtivo}
                            onChange={(e) => setVendaPecasAtivo(e.target.checked)}
                          />
                          <span>{labelPecas(selCategoria)}</span>
                        </label>
                        {vendaPecasAtivo && (
                          <textarea
                            className="input mt-2"
                            rows={3}
                            placeholder={phPecas(selCategoria)}
                            value={vendaPecasObs}
                            onChange={(e) => setVendaPecasObs(e.target.value)}
                          />
                        )}

                        <div style={{ height: 10 }} />

                        {/* Presto serviços (dinâmico) */}
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={servicosAtivo}
                            onChange={(e) => setServicosAtivo(e.target.checked)}
                          />
                          <span>{labelServicos(selCategoria)}</span>
                        </label>
                        {servicosAtivo && (
                          <textarea
                            className="input mt-2"
                            rows={3}
                            placeholder={phServicos(selCategoria)}
                            value={servicosObs}
                            onChange={(e) => setServicosObs(e.target.value)}
                          />
                        )}

                        <div className="flex gap-8 mt-3">
                          <button
                            type="button"
                            className="btn-sec"
                            onClick={addOuAtualizaCategoriaBasica}
                            disabled={!selCategoria || ( atingiuLimite && !selecionadaJaExiste )}
                            title={
                              atingiuLimite && !selecionadaJaExiste
                                ? `Limite de ${Number(form.categoryLimit ?? 3)} atingido`
                                : "Adicionar/Atualizar"
                            }
                          >
                            <Plus size={14} /> {selecionadaJaExiste ? "Atualizar categoria" : "Adicionar categoria"}
                          </button>
                          <button
                            type="button"
                            className="btn-sec"
                            onClick={() => { resetEditorCategoria(); setEditorOpen(false); }}
                          >
                            Limpar e fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de categorias adicionadas (chips iguais ao /perfil) */}
            <div>
              <div className="label">Categorias adicionadas</div>
              {(!form.atuacaoBasica || form.atuacaoBasica.length === 0) ? (
                <div className="rounded-xl border p-4" style={{ borderColor: "#e6ebf2", background: "#fff" }}>
                  Nenhuma categoria adicionada ainda. (Opcional)
                </div>
              ) : (
                <div className="grid gap-3">
                  {form.atuacaoBasica.map((a) => (
                    <div
                      key={a.categoria}
                      className="rounded-xl border p-3"
                      style={{ borderColor: "#e6ebf2", background: "#f8fbff" }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div style={{ fontWeight: 900, color: "#023047" }}>{a.categoria}</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-sec"
                            title="Editar"
                            onClick={() => carregarEditorDeUmaCategoria(a)}
                          >
                            <Edit3 size={14} /> Editar
                          </button>
                          <button
                            type="button"
                            className="btn-sec"
                            title="Remover"
                            onClick={() => removerCategoriaBasica(a.categoria)}
                          >
                            <Trash2 size={14} /> Remover
                          </button>
                        </div>
                      </div>

                      {/* Chips com rótulos dinâmicos */}
                      <div className="chips" style={{ marginTop: 8 }}>
                        <span className="chip" style={{ opacity: a.vendaProdutos.ativo ? 1 : 0.5 }}>
                          {labelProdutos(a.categoria)}{" "}
                          {a.vendaProdutos.ativo ? "— " + a.vendaProdutos.obs : "(não aplica)"}
                        </span>
                        <span className="chip" style={{ opacity: a.vendaPecas.ativo ? 1 : 0.5 }}>
                          {labelPecas(a.categoria)}{" "}
                          {a.vendaPecas.ativo ? "— " + a.vendaPecas.obs : "(não aplica)"}
                        </span>
                        <span className="chip" style={{ opacity: a.servicos.ativo ? 1 : 0.5 }}>
                          {labelServicos(a.categoria)}{" "}
                          {a.servicos.ativo ? "— " + a.servicos.obs : "(não aplica)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {form.atuacaoBasica?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  <b>{form.atuacaoBasica.length}</b> categoria(s) selecionada(s).
                </div>
              )}
              {form.categoriasLocked && (
                <div className="lock-banner" style={{ marginTop: 10 }}>
                  <Lock size={14} /> Conjunto de <b>CATEGORIAS</b> travado. (apenas aviso visual)
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
            <b>Dica:</b> você pode adicionar várias categorias (limite atual: {Number(form.categoryLimit ?? 3)}). Se marcar uma opção,
            descreva o que faz.
          </div>
        </div>

        {/* Cobertura */}
        <div className="card">
          <div className="card-title">Cobertura / UFs Atendidas</div>
          <label className="checkbox" style={{ marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={form.atendeBrasil}
              onChange={() => {
                const atendeBrasil = !form.atendeBrasil;
                setForm({ ...form, atendeBrasil, ufsAtendidas: atendeBrasil ? ["BRASIL"] : [] });
              }}
            />
            <span>Atende o Brasil inteiro</span>
          </label>
          {!form.atendeBrasil && (
            <>
              <div className="label">Selecione UFs</div>
              <div className="grid grid-cols-8 gap-2 max-sm:grid-cols-4">
                {estados
                  .filter((e) => e !== "BRASIL")
                  .map((uf) => {
                    const checked = form.ufsAtendidas.includes(uf);
                    return (
                      <button
                        key={uf}
                        type="button"
                        onClick={() => {
                          const has = form.ufsAtendidas.includes(uf);
                          setField("ufsAtendidas", has ? form.ufsAtendidas.filter((u) => u !== uf) : [...form.ufsAtendidas, uf]);
                        }}
                        className="pill"
                        style={{
                          background: checked ? "#219EBC" : "#f3f6fa",
                          color: checked ? "#fff" : "#023047",
                          borderColor: checked ? "#1a7a93" : "#e6e9ef",
                        }}
                      >
                        {uf}
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* Portfólio (Imagens + PDFs + Vídeos) */}
        <div className="card">
          <div className="card-title">Portfólio</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Imagens */}
            <div>
              <div className="label">Imagens (até 12)</div>
              <ImageUploader imagens={form.portfolioImagens} setImagens={(arr: string[]) => setField("portfolioImagens", arr)} max={12} />

              {form.portfolioImagens?.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 12 }}>
                  {form.portfolioImagens.map((img) => (
                    <div key={img} style={{ border: "1px solid #e6edf6", borderRadius: 10, overflow: "hidden", background: "#f8fafc" }}>
                      <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#fff" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Imagem do portfólio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: 8 }}>
                        <a href={img} target="_blank" rel="noopener noreferrer" className="btn-sec" title="Abrir em nova aba" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <Eye size={14} /> Ver
                        </a>
                        <a href={img} download className="btn-sec" title="Baixar imagem" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <Download size={14} /> Baixar
                        </a>
                        <button type="button" className="btn-sec" title="Remover" onClick={() => removeImagem(img)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>Nenhuma imagem enviada.</div>
              )}
            </div>

            {/* PDFs */}
            <div>
              <div className="label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={16} /> PDFs do portfólio
              </div>

              <div className="rounded-lg border border-dashed p-3" style={{ borderColor: "#e6ebf2", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontWeight: 800, color: "#0f172a" }}>
                  <Upload size={16} /> Enviar novo PDF
                </div>
                <PDFUploader onUploaded={(url: string) => addPDF(url)} />
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
                  Dica: você também pode colar URLs (Drive/Dropbox/S3) diretamente na lista abaixo.
                </div>
              </div>

              {form.portfolioPDFs?.length ? (
                <ul style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {form.portfolioPDFs.map((pdf) => (
                    <li key={pdf} style={{ border: "1px solid #e6edf6", borderRadius: 12, padding: 10, background: "#f7fafc" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 8 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <LinkIcon size={16} />
                          <a
                            href={pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
                            title={pdf}
                          >
                            {pdf}
                          </a>
                        </div>

                        <button type="button" className="btn-sec" onClick={() => setPdfExpandido(pdfExpandido === pdf ? null : pdf)} title="Visualizar">
                          <Eye size={14} /> {pdfExpandido === pdf ? "Ocultar" : "Visualizar"}
                        </button>
                        <a href={pdf} download className="btn-sec" title="Baixar PDF">
                          <Download size={14} /> Baixar
                        </a>
                        <button type="button" className="btn-sec" onClick={() => removePDF(pdf)} title="Remover">
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>

                      {pdfExpandido === pdf && (
                        <div className="rounded-lg border overflow-hidden" style={{ height: 320, marginTop: 10, background: "#fff" }}>
                          <DrivePDFViewer fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdf)}`} height={320} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
                  Nenhum PDF. Use o botão acima ou cole uma URL aqui:
                  <div className="flex gap-2" style={{ marginTop: 8 }}>
                    <input
                      className="input"
                      placeholder="https://... .pdf"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v) {
                            addPDF(v);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-sec"
                      onClick={() => {
                        const el = document.querySelector<HTMLInputElement>('input[placeholder="https://... .pdf"]');
                        if (el?.value.trim()) {
                          addPDF(el.value.trim());
                          el.value = "";
                        }
                      }}
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vídeos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10" style={{ marginTop: 18 }}>
            <div>
              <div className="label">Vídeos (URLs YouTube/Vimeo)</div>
              <VideoList form={form} setField={setField} />
            </div>
          </div>
        </div>

        {/* ======= BLOCO EXCLUSIVO DO ADMIN ======= */}
        <div className="card admin-panel">
          <div className="admin-panel__header">
            <div className="admin-panel__title">
              Controles do Admin
              <span
                className={`badge ${
                  form.status === "ativo" ? "badge-success" : form.status === "suspenso" ? "badge-warn" : "badge-danger"
                }`}
                title="Status da conta"
              >
                {form.status === "ativo" ? "ATIVO" : form.status === "suspenso" ? "SUSPENSO" : "BANIDO"}
              </span>
              {form.verificado && (
                <span className="badge badge-info" title="Fornecedor verificado">
                  Fornecedor
                </span>
              )}
            </div>

            <div className="admin-panel__toolbar">
              <button
                type="button"
                className={`btn-chip ${form.verificado ? "chip-on" : ""}`}
                onClick={() => setField("verificado", !form.verificado)}
                title={form.verificado ? "Remover verificação" : "Marcar como Fornecedor"}
              >
                <CheckCircle size={14} />
                {form.verificado ? "Fornecedor" : "Marcar como Fornecedor"}
              </button>
            </div>
          </div>

          {/* Limites de Perfil */}
          <div className="panel-section">
            <div className="section-title">Limites do Perfil</div>

            <label className="label" htmlFor="limiteCategorias">Limite de categorias</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                id="limiteCategorias"
                type="number"
                className="input"
                min={0}
                max={50}
                value={Number(form.categoryLimit ?? 3)}
                onChange={(e) => setField("categoryLimit", e.target.value ? Number(e.target.value) : 0)}
                style={{ width: 120 }}
              />
              <button type="button" className="btn-sec" onClick={() => setField("categoryLimit", 3)} title="Voltar ao padrão">
                Resetar p/ 3
              </button>
              <button
                type="button"
                className="btn-sec"
                onClick={() => setField("categoryLimit", form.atuacaoBasica?.length ?? 0)}
                title="Define o limite igual ao total atual"
              >
                Ajustar p/ {form.atuacaoBasica?.length ?? 0}
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>
              Usuário poderá selecionar até <b>{Number(form.categoryLimit ?? 3)}</b> categoria(s).
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Coluna 1 — Conta */}
            <div className="panel-section">
              <div className="section-title">Conta</div>

              <label className="label" htmlFor="statusConta">Status da conta</label>
              <select id="statusConta" className="input" value={form.status || "ativo"} onChange={(e) => setField("status", e.target.value as any)}>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="banido">Banido</option>
              </select>

              <div className="divider" />

              <label className="label" htmlFor="obsInternas">Observações internas</label>
              <textarea
                id="obsInternas"
                className="input"
                rows={3}
                value={form.observacoesInternas || ""}
                onChange={(e) => setField("observacoesInternas", e.target.value)}
                placeholder="Notas visíveis apenas ao time interno…"
              />

              <div className="divider" />

              <div className="section-subtitle">Segurança</div>
              <div className="btn-row">
                <button type="button" className="btn-sec btn-outline" onClick={() => setShowPwdModal(true)}>
                  <Key size={16} /> Redefinir senha (definir nova)
                </button>

                <button type="button" className="btn-sec btn-outline" onClick={revogarSessoes}>
                  <Shield size={16} /> Encerrar sessões
                </button>

              </div>

              {(tempPass || genError) && (
                <div style={{ marginTop: 8, background: "#f7fafc", border: "1px solid #e6edf6", borderRadius: 12, padding: 12 }}>
                  {tempPass && (
                    <>
                      <div className="label">Senha temporária (copiar e enviar):</div>
                      <pre
                        style={{
                          userSelect: "all",
                          background: "#fff",
                          border: "1px solid #e6edf6",
                          borderRadius: 10,
                          padding: 10,
                          fontWeight: 800,
                        }}
                      >
                        {tempPass}
                      </pre>
                      <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>
                        Ao fazer login com esta senha, o usuário será forçado a definir uma nova.
                      </div>
                    </>
                  )}
                  {genError && <div style={{ color: "#be123c", fontWeight: 800 }}>{genError}</div>}
                </div>
              )}

             
            </div>
<div className="divider" />
            {/* Coluna 2 — Leads/Demandas + Financeiro + Patrocínio */}
            <div className="panel-section">
             
              {/* NOVO BLOCO: Leads / Demandas */}
              <div className="section-title">Leads / Demandas do Fornecedor</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                  gap: 8,
                  marginBottom: 10,
                  fontSize: 13,
                }}
              >
                <div className="badge" style={{ justifyContent: "space-between" }}>
                  <span>Enviadas</span>
                  <b>{leadStats.loading ? "…" : leadStats.total}</b>
                </div>
                <div className="badge" style={{ justifyContent: "space-between" }}>
                  <span>Desbloqueadas</span>
                  <b>{leadStats.loading ? "…" : leadStats.unlocked}</b>
                </div>
                <div className="badge badge-success" style={{ justifyContent: "space-between" }}>
                  <span>Grátis</span>
                  <b>{leadStats.loading ? "…" : leadStats.freeUnlocked}</b>
                </div>
                <div className="badge badge-warn" style={{ justifyContent: "space-between" }}>
                  <span>Pagas</span>
                  <b>{leadStats.loading ? "…" : leadStats.paidUnlocked}</b>
                </div>
              </div>


              <div className="divider" />

              {/* Financeiro */}
              <div className="section-title">Financeiro</div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="Plano"
                  value={form.financeiro?.plano || ""}
                  onChange={(e) => setField("financeiro", { ...(form.financeiro || {}), plano: e.target.value })}
                />
                <select
                  className="input"
                  value={form.financeiro?.situacao || "pendente"}
                  onChange={(e) => setField("financeiro", { ...(form.financeiro || {}), situacao: e.target.value as "pago" | "pendente" })}
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  className="input"
                  placeholder="Valor (R$)"
                  value={form.financeiro?.valor ?? ""}
                  onChange={(e) => setField("financeiro", { ...(form.financeiro || {}), valor: e.target.value ? Number(e.target.value) : null })}
                  min={0}
                />
                <input
                  className="input"
                  placeholder="Próx. renovação (YYYY-MM-DD)"
                  value={
                    form.financeiro?.proxRenovacao?.toDate
                      ? form.financeiro.proxRenovacao.toDate().toISOString().slice(0, 10)
                      : form.financeiro?.proxRenovacao || ""
                  }
                  onChange={(e) => setField("financeiro", { ...(form.financeiro || {}), proxRenovacao: e.target.value })}
                />
              </div>

              <div className="divider" />

              <div className="section-title inline">Patrocínio</div>
              <div className="sponsor-card">
                <span className={`badge ${form.isPatrocinador ? "badge-success" : "badge-danger"}`} title="Status de patrocínio">
                  {form.isPatrocinador ? "ATIVO" : "INATIVO"}
                </span>

                <div className="sponsor-meta">
                  <div>
                    Desde:&nbsp;
                    <b>
                      {form.patrocinadorDesde?.toDate
                        ? form.patrocinadorDesde.toDate().toLocaleDateString("pt-BR")
                        : form.patrocinadorDesde
                        ? String(form.patrocinadorDesde)
                        : "—"}
                    </b>
                  </div>
                  {form.patrocinadorAte ? (
                    <div>
                      &nbsp;|&nbsp; Até:&nbsp;
                      <b>
                        {form.patrocinadorAte?.toDate
                          ? form.patrocinadorAte.toDate().toLocaleDateString("pt-BR")
                          : String(form.patrocinadorAte)}
                      </b>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!form) return;
                    const ativar = !form.isPatrocinador;
                    const ok = window.confirm(`${ativar ? "Ativar" : "Desativar"} patrocínio para ${form.email || form.nome || form.id}?`);
                    if (!ok) return;

                    try {
                      const patch: Partial<PerfilForm> & Record<string, any> = { isPatrocinador: ativar };

                      if (ativar) {
                        patch.patrocinadorDesde = form.patrocinadorDesde || serverTimestamp();
                        patch.patrocinadorAte = null;
                      } else {
                        patch.patrocinadorAte = serverTimestamp();
                      }

                      await updateDoc(doc(db, "usuarios", form.id), patch);

                      await addDoc(collection(db, "patrocinadores"), {
                        userId: form.id,
                        status: ativar ? "ativo" : "cancelado",
                        plano: "mensal",
                        dataInicio: ativar ? serverTimestamp() : form.patrocinadorDesde || serverTimestamp(),
                        dataFim: ativar ? null : serverTimestamp(),
                        renovacao: true,
                        gateway: "manual-admin",
                        gatewayRef: "",
                        updatedAt: serverTimestamp(),
                      });

                      await addDoc(collection(db, "notificacoes"), {
                        userId: form.id,
                        tipo: "patrocinio",
                        titulo: ativar ? "Patrocínio ativado! 🎉" : "Patrocínio desativado",
                        mensagem: ativar
                          ? "Você agora é patrocinador e tem acesso aos contatos completos das demandas."
                          : "Seu status de patrocinador foi removido. Você não verá mais os contatos completos.",
                        lido: false,
                        createdAt: serverTimestamp(),
                        readAt: null,
                      });

                      setForm((f) => (f ? { ...f, ...patch } : f));
                      setMsg(ativar ? "Patrocínio ativado." : "Patrocínio desativado.");
                    } catch (e) {
                      console.error(e);
                      setMsg("Falha ao alternar patrocínio.");
                    } finally {
                      setTimeout(() => setMsg(""), 4000);
                    }
                  }}
                  className={`btn-chip ${form.isPatrocinador ? "chip-off" : "chip-on"}`}
                  title={form.isPatrocinador ? "Desativar patrocínio" : "Ativar patrocínio"}
                >
                  {form.isPatrocinador ? "Desativar patrocínio" : "Ativar patrocínio"}
                </button>
              </div>

              <div className="hint">
                * Patrocinadores enxergam contatos completos das demandas (subcoleção <code>/privado</code>).
              </div>
            </div>
          </div>
        </div>
        {/* ======= FIM DO BLOCO ADMIN ======= */}

        {/* Ações */}
        {msg && (
          <div
            style={{
              background:
                msg.toLowerCase().includes("sucesso") || msg.toLowerCase().includes("salv") ? "#f7fafc" : "#fff7f7",
              color:
                msg.toLowerCase().includes("sucesso") || msg.toLowerCase().includes("salv") ? "#16a34a" : "#b91c1c",
              border: `1.5px solid ${
                msg.toLowerCase().includes("sucesso") || msg.toLowerCase().includes("salv") ? "#c3f3d5" : "#ffdada"
              }`,
              padding: "12px",
              borderRadius: 12,
              textAlign: "center",
              fontWeight: 800,
              marginTop: -6,
            }}
          >
            {msg}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-gradient" disabled={saving}>
            <Save size={16} /> {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>

      {/* Modal de nova senha */}
      {showPwdModal && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px", width: "min(520px,92vw)", boxShadow: "0 10px 30px #0003" }}>
            <h3 style={{ fontWeight: 900, color: "#023047", fontSize: 20, marginBottom: 12 }}>Definir nova senha</h3>

            <label className="label" htmlFor="novaSenha">Nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                id="novaSenha"
                type={pwdVisible ? "text" : "password"}
                className="input"
                value={pwd1}
                minLength={8}
                onChange={(e) => setPwd1(e.target.value)}
                placeholder="mín. 8 caracteres"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setPwdVisible((v) => !v)}
                style={{ position: "absolute", right: 10, top: 8, border: "none", background: "transparent", cursor: "pointer" }}
                aria-label={pwdVisible ? "Ocultar senha" : "Mostrar senha"}
                title={pwdVisible ? "Ocultar senha" : "Mostrar senha"}
              >
                {pwdVisible ? "🙈" : "👁️"}
              </button>
            </div>

            <label className="label" htmlFor="confirmaSenha" style={{ marginTop: 12 }}>Confirmar senha</label>
            <input
              id="confirmaSenha"
              type={pwdVisible ? "text" : "password"}
              className="input"
              value={pwd2}
              minLength={8}
              onChange={(e) => setPwd2(e.target.value)}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>Força: {senhaForca}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" className="btn-sec" onClick={() => { setShowPwdModal(false); setPwd1(""); setPwd2(""); }}>
                Cancelar
              </button>
              <button type="button" className="btn-gradient" disabled={pwdSaving} onClick={salvarNovaSenha}>
                {pwdSaving ? "Salvando..." : "Salvar nova senha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS utilitário + admin-panel */}
      <style jsx>{`
        .card { background: #fff; border-radius: 20px; box-shadow: 0 4px 28px #0001; padding: 24px 22px; }
        .card-title { font-weight: 900; color: #023047; font-size: 1.2rem; margin-bottom: 14px; }
        .label { font-weight: 800; color: #023047; margin-bottom: 6px; display: block; }
        .input { width: 100%; border: 1.6px solid #e5e7eb; border-radius: 10px; background: #f8fafc; padding: 11px 12px; font-size: 16px; color: #222; outline: none; }
        .checkbox { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: #023047; }
        .chips { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { display: inline-flex; align-items: center; gap: 6px; background: #f3f7ff; color: #2563eb; border: 1px solid #e0ecff; padding: 6px 10px; border-radius: 10px; font-weight: 800; font-size: 0.95rem; }
        .chip-off { opacity: .5; }
        .pill { border: 1px solid #e6e9ef; border-radius: 999px; padding: 6px 10px; font-weight: 800; font-size: 0.95rem; }
        .btn-sec { background: #f7f9fc; color: #2563eb; border: 1px solid #e0ecff; font-weight: 800; border-radius: 10px; padding: 8px 12px; }
        .btn-gradient { background: linear-gradient(90deg, #fb8500, #fb8500); color: #fff; font-weight: 900; border: none; border-radius: 14px; padding: 14px 26px; font-size: 1.08rem; box-shadow: 0 4px 18px #fb850033; }
        .lock-banner { display: flex; align-items: center; gap: 8px; background: #fff7ed; border: 1px solid #ffedd5; color: #9a3412; padding: 8px 10px; border-radius: 10px; font-weight: 800; }

        @media (max-width: 650px) {
          .card { padding: 18px 14px; border-radius: 14px; }
        }

        /* ===== admin-panel ===== */
        .admin-panel { padding: 20px 20px 22px; }
        .admin-panel__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .admin-panel__title { display: flex; align-items: center; gap: 10px; font-weight: 900; color: #023047; font-size: 1.1rem; }
        .admin-panel__toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
        .section-title { font-weight: 900; color: #0f172a; margin-bottom: 8px; font-size: 1rem; }
        .section-title.inline { display: inline-flex; align-items: center; gap: 8px; }
        .section-subtitle { font-weight: 800; color: #334155; margin-bottom: 6px; }
        .panel-section { display: grid; gap: 10px; }
        .divider { height: 1px; background: linear-gradient(90deg, #0000, #e9eef9, #0000); margin: 6px 0 4px 0; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-weight: 900; font-size: 12px; border: 1px solid #e6edf6; background: #f3f7ff; color: #2563eb; }
        .badge-success { background: #ecfdf5; border-color: #baf3cd; color: #059669; }
        .badge-warn { background: #fff7ed; border-color: #ffedd5; color: #9a3412; }
        .badge-danger { background: #fff1f2; border-color: #ffe0e6; color: #be123c; }
        .badge-info { background: #ecfeff; border-color: #bae6fd; color: #0ea5e9; }
        .btn-chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #e6edf6; border-radius: 999px; padding: 8px 12px; background: #f7f9fc; color: #2563eb; font-weight: 800; }
        .btn-chip:hover { filter: brightness(0.98); }
        .chip-on { background: #ecfdf5; border-color: #baf3cd; color: #059669; }
        .chip-off { background: #fff0f0; border-color: #ffdada; color: #d90429; opacity: .6; }
        .btn-outline { background: #fff; border-style: dashed; border-color: #dbe7ff !important; }
        .btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .sponsor-card { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #f7f9fc; border: 1px solid #e6edf6; padding: 10px 12px; border-radius: 12px; }
        .sponsor-meta { display: flex; align-items: center; gap: 2px; color: #6b7280; font-size: 0.9rem; }
        .hint { margin-top: 6px; font-size: 12px; color: #94a3b8; }
      `}</style>
    </section>
  );
}

/** ===== Componente auxiliar para vídeos ===== */
function VideoList({
  form,
  setField,
}: {
  form: PerfilForm;
  setField: <K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) => void;
}) {
  const [novoVideo, setNovoVideo] = useState("");

  return (
    <>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="https://..."
          value={novoVideo}
          onChange={(e) => setNovoVideo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!novoVideo.trim()) return;
              setField("portfolioVideos", [...(form.portfolioVideos || []), novoVideo.trim()]);
              setNovoVideo("");
            }
          }}
        />
        <button
          type="button"
          className="btn-sec"
          onClick={() => {
            if (!novoVideo.trim()) return;
            setField("portfolioVideos", [...(form.portfolioVideos || []), novoVideo.trim()]);
            setNovoVideo("");
          }}
        >
          + Adicionar
        </button>
      </div>
      {form.portfolioVideos?.length ? (
        <ul style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {form.portfolioVideos.map((v) => (
            <li key={v} className="video-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                {v}
              </a>
              <button
                type="button"
                className="btn-sec"
                onClick={() => setField("portfolioVideos", (form.portfolioVideos || []).filter((x) => x !== v))}
                title="Remover"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

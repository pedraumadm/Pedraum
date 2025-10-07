// app/admin/usuarios/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Link from "next/link";
import { mapAntigoParaNovo } from "@/lib/mapCategorias";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import ImageUploader from "@/components/ImageUploader";
import {
  ChevronLeft,
  Save,
  Mail,
  Key,
  CheckCircle,
  Shield,
  Tag,
  CheckSquare,
  Square,
  LinkIcon,
  Eye,
  Download,
  Trash2,
  FileText,
  Upload,
  Search,
  X,
  Plus,
  Lock,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/** ==== PDF (SSR off para evitar erro no Next) ==== */
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

/* ========= Constantes ========= */
const MAX_CATEGORIAS = 5;

const estados = [
  "BRASIL","AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
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
type CategoriaPair = { categoria: string; subcategoria: string };
type CategoriaTriplet = { categoria: string; subcategoria: string; item: string };

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

  // Fonte da verdade (2 níveis)
  categoriasAtuacaoPairs: CategoriaPair[];
  // 3 níveis (NOVO)
  categoriasAtuacaoTriplets?: CategoriaTriplet[];

  // Legado
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

function onlyDigits(v: string) { return (v || "").replace(/\D/g, ""); }

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
  return d.startsWith("55") ? d : (d ? `55${d}` : "");
}

function dedupPairs(pairs: CategoriaPair[]) {
  const m = new Map<string, CategoriaPair>();
  for (const p of pairs) m.set(`${norm(p.categoria)}::${norm(p.subcategoria)}`, p);
  return Array.from(m.values());
}
function dedupTriplets(tris: CategoriaTriplet[]) {
  const m = new Map<string, CategoriaTriplet>();
  for (const t of tris) m.set(`${norm(t.categoria)}::${norm(t.subcategoria)}::${norm(t.item)}`, t);
  return Array.from(m.values());
}

const buildCategoriesAll = (
  pairs: CategoriaPair[],
  legacy: string[] = [],
  tris: CategoriaTriplet[] = []
) => {
  const set = new Set<string>((legacy || []).filter(Boolean));
  for (const p of pairs) if (p.categoria) set.add(p.categoria);
  for (const t of tris) if (t.categoria) set.add(t.categoria);
  return Array.from(set);
};
const buildPairsSearch = (pairs: CategoriaPair[] = []) =>
  pairs
    .filter((p) => p.categoria && p.subcategoria)
    .map((p) => `${norm(p.categoria)}::${norm(p.subcategoria)}`);
const buildTripletsSearch = (tris: CategoriaTriplet[] = []) =>
  tris
    .filter((t) => t.categoria && t.subcategoria && t.item)
    .map((t) => `${norm(t.categoria)}::${norm(t.subcategoria)}::${norm(t.item)}`);
const buildUfsSearch = (atendeBrasil: boolean, ufsAtendidas: string[] = []) => {
  const arr = (ufsAtendidas || []).map((u) => String(u).trim().toUpperCase());
  if (atendeBrasil && !arr.includes("BRASIL")) arr.push("BRASIL");
  return Array.from(new Set(arr));
};

// traduz estrutura do hook para nomes de subcategorias
function toSubcatNames(arr: any[] | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => (typeof s === "string" ? s : (s?.nome ?? ""))).filter(Boolean);
}
// aceita itens|items|subitens
function toItemNamesFromAnyKeys(entry: any): string[] {
  if (!entry) return [];
  const raw = entry?.itens ?? entry?.items ?? entry?.subitens ?? [];
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((i) => (typeof i === "string" ? i : (i?.nome ?? ""))).filter(Boolean);
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

  // ==== Taxonomia centralizada (harmonizada com /perfil) ====
  const { categorias, loading: taxLoading } = useTaxonomia();
  const nomesCategorias = useMemo(() => categorias.map((c) => c.nome), [categorias]);

  // ===== Busca unificada (cat/sub/item) =====
  const [busca, setBusca] = useState("");
  const termo = useMemo(() => norm(busca), [busca]);
  const categoriasFiltradas = useMemo(() => {
    if (!termo) return nomesCategorias;
    const t = termo;
    return nomesCategorias.filter((nome) => {
      const cat = categorias.find((c) => c.nome === nome);
      if (!cat) return false;
      if (norm(cat.nome).includes(t)) return true;
      const subs = toSubcatNames(cat.subcategorias);
      if (subs.some((s) => norm(s).includes(t))) return true;
      const temItem = (cat.subcategorias || []).some((s: any) =>
        toItemNamesFromAnyKeys(s).some((i) => norm(i).includes(t))
      );
      return temItem;
    });
  }, [nomesCategorias, categorias, termo]);

  // ====== UI: seleção 3 níveis (categoria + sub + itens) ======
  const [selCategoria, setSelCategoria] = useState("");
  const [selSubcat, setSelSubcat] = useState("");
  const [selItens, setSelItens] = useState<string[]>([]);
  const [novoItem, setNovoItem] = useState("");

  const subcatsDaSelecionada = useMemo(() => {
    if (!selCategoria) return [];
    const cat = categorias.find((c) => c.nome === selCategoria);
    if (!cat) return [];
    const subs = toSubcatNames(cat.subcategorias);
    if (!termo) return subs;
    const t = termo;
    return subs.filter((s) => {
      const matchSub = norm(s).includes(t);
      if (matchSub) return true;
      const subEntry = (cat.subcategorias || []).find((x: any) => (typeof x === "string" ? x : x?.nome) === s);
      return toItemNamesFromAnyKeys(subEntry).some((i) => norm(i).includes(t));
    });
  }, [selCategoria, categorias, termo]);

  const itensDaSubSelecionada = useMemo(() => {
    if (!selCategoria || !selSubcat) return [];
    const cat = categorias.find((c) => c.nome === selCategoria);
    const sub = (cat?.subcategorias || []).find((s: any) => (typeof s === "string" ? s : s?.nome) === selSubcat);
    const itens = toItemNamesFromAnyKeys(sub);
    if (!termo) return itens;
    const t = termo;
    return itens.filter((i) => norm(i).includes(t));
  }, [selCategoria, selSubcat, categorias, termo]);

  // PDFs
  const [pdfExpandido, setPdfExpandido] = useState<string | null>(null);

  // modal de senha
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const senhaForca = pwd1.length >= 12 ? "Alta" : pwd1.length >= 8 ? "Média" : "Baixa";

  // avatar como lista pro ImageUploader
  const avatarLista = useMemo(() => (form?.avatar ? [form.avatar] : []), [form?.avatar]);

  useEffect(() => {
    (async () => {
      try {
        if (!id) throw new Error("ID inválido");
        const ref = doc(db, "usuarios", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setMsg("Usuário não encontrado.");
          setLoading(false);
          return;
        }
        const data = snap.data() || {};

        const baseAgenda = Object.fromEntries(
          diasSemana.map((d) => [d.key, { ativo: d.key !== "dom", das: "08:00", ate: "18:00" }])
        ) as Record<string, AgendaDia>;

        const categoriasAtuacaoPairs: CategoriaPair[] = Array.isArray(data.categoriasAtuacaoPairs)
          ? data.categoriasAtuacaoPairs
          : [];
        const categoriasAtuacaoTriplets: CategoriaTriplet[] = Array.isArray(data.categoriasAtuacaoTriplets)
          ? data.categoriasAtuacaoTriplets
          : [];

        // Normaliza PDFs: aceita string (portfolioPdfUrl) ou array (portfolioPDFs)
        const pdfs: string[] = Array.isArray(data.portfolioPDFs)
          ? data.portfolioPDFs
          : data.portfolioPdfUrl
          ? [data.portfolioPdfUrl]
          : [];

        setForm({
          id,
          nome: data.nome || "",

          // Patrocinador
          isPatrocinador: !!data.isPatrocinador,
          patrocinadorDesde: data.patrocinadorDesde || null,
          patrocinadorAte: data.patrocinadorAte || null,

          email: data.email || "",
          telefone: data.whatsappE164 ? maskBRFrom55(data.whatsappE164)
                   : (data.whatsapp ? maskBRFrom55(data.whatsapp) : (data.telefone || "")),
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: data.cpf_cnpj || data.cpfCnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || "Usuário",

          prestaServicos: !!data.prestaServicos,
          vendeProdutos: !!data.vendeProdutos,

          categoriasAtuacaoPairs,
          categoriasAtuacaoTriplets,
          categoriasAtuacao: Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [],
          categoriasLocked: !!data.categoriasLocked,

          atendeBrasil: !!data.atendeBrasil,
          ufsAtendidas: data.ufsAtendidas || [],

          agenda: data.agenda || baseAgenda,

          portfolioImagens: data.portfolioImagens || [],
          portfolioVideos: data.portfolioVideos || [],
          portfolioPDFs: pdfs,
          portfolioPdfUrl: data.portfolioPdfUrl || null,

          leadPreferencias: {
            categorias: data.leadPreferencias?.categorias || [],
            ufs: data.leadPreferencias?.ufs || [],
            ticketMin: data.leadPreferencias?.ticketMin ?? null,
            ticketMax: data.leadPreferencias?.ticketMax ?? null,
          },

          mpConnected: !!data.mpConnected,
          mpStatus: data.mpStatus || "desconectado",

          // extras admin
          status: (data.status as any) || "ativo",
          verificado: !!data.verificado,
          role: (data.role as any) || "user",
          financeiro: {
            plano: data.financeiro?.plano || "",
            situacao: data.financeiro?.situacao || "pendente",
            valor: data.financeiro?.valor ?? null,
            proxRenovacao: data.financeiro?.proxRenovacao || "",
          },
          limites: {
            leadsDia: data.limites?.leadsDia ?? 10,
            prioridade: data.limites?.prioridade ?? 0,
            bloquearUFs: data.limites?.bloquearUFs || [],
            bloquearCategorias: data.limites?.bloquearCategorias || [],
          },
          observacoesInternas: data.observacoesInternas || "",
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

  function setField<K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  /** ======= MIGRAÇÃO LEGADO → NOVO (mapeia pares) ======= */
  function migrarEsteUsuarioLocalmente() {
    if (!form) return;

    const legacyStrings: string[] = [
      ...(Array.isArray((form as any).categorias) ? (form as any).categorias : []),
      ...(Array.isArray(form.categoriasAtuacao) ? form.categoriasAtuacao : []),
      ...((form.categoriasAtuacaoPairs || []).map((p) => [p?.categoria, p?.subcategoria].filter(Boolean).join(" "))),
    ].filter(Boolean);

    if (legacyStrings.length === 0) {
      setMsg("Nenhuma categoria legada encontrada neste usuário.");
      setTimeout(() => setMsg(""), 4000);
      return;
    }

    const mapped = legacyStrings.map((txt) => mapAntigoParaNovo(String(txt)));

    const key = (c: string, s: string) => `${norm(c)}::${norm(s)}`;
    const map = new Map<string, { categoria: string; subcategoria: string }>();
    for (const p of mapped) map.set(key(p.categoria, p.subcategoria), p);
    const dedup = Array.from(map.values());

    const distinctCats = Array.from(new Set(dedup.map((p) => p.categoria)));
    let finais = dedup;
    let catsUsadas = distinctCats;

    if (distinctCats.length > MAX_CATEGORIAS) {
      const freq = new Map<string, number>();
      for (const p of dedup) freq.set(p.categoria, (freq.get(p.categoria) || 0) + 1);
      const topCats = distinctCats.sort((a, b) => (freq.get(b)! - freq.get(a)!)).slice(0, MAX_CATEGORIAS);
      finais = dedup.filter((p) => topCats.includes(p.categoria));
      catsUsadas = topCats;
    }

    setForm({
      ...form,
      categoriasAtuacaoPairs: finais,
      categoriasAtuacao: catsUsadas,
    });

    setMsg("Categorias antigas mapeadas para a taxonomia nova. Revise e salve.");
    setTimeout(() => setMsg(""), 4000);
  }

  // ======= contagens e agrupamentos =======
  const selectedCategoriasSet = useMemo(() => {
    const set = new Set<string>((form?.categoriasAtuacaoPairs || []).map((p) => p.categoria));
    (form?.categoriasAtuacaoTriplets || []).forEach(t => set.add(t.categoria));
    return set;
  }, [form?.categoriasAtuacaoPairs, form?.categoriasAtuacaoTriplets]);
  const selectedCategorias = useMemo(() => Array.from(selectedCategoriasSet), [selectedCategoriasSet]);

  const subcatsCountByCategoria = useMemo(() => {
    const m = new Map<string, number>();
    (form?.categoriasAtuacaoPairs || []).forEach((p) => {
      if (!p.categoria || !p.subcategoria) return;
      m.set(p.categoria, (m.get(p.categoria) || 0) + 1);
    });
    return m;
  }, [form?.categoriasAtuacaoPairs]);

  const itensCountByCategoria = useMemo(() => {
    const m = new Map<string, number>();
    (form?.categoriasAtuacaoTriplets || []).forEach((t) => {
      if (!t.categoria || !t.item) return;
      m.set(t.categoria, (m.get(t.categoria) || 0) + 1);
    });
    return m;
  }, [form?.categoriasAtuacaoTriplets]);

  // ======= ações UI 3º nível =======
  function addTripletsSelecionados() {
    if (!form) return;
    if (!selCategoria) { setMsg("Selecione uma categoria."); return; }
    if (!selSubcat) { setMsg("Selecione uma subcategoria."); return; }
    if (!selItens.length) { setMsg("Marque um ou mais itens."); return; }

    const novos: CategoriaTriplet[] = selItens.map((item) => ({ categoria: selCategoria, subcategoria: selSubcat, item }));
    const tripFuturos = dedupTriplets([...(form.categoriasAtuacaoTriplets || []), ...novos]);

    // manter par legado para filtros antigos
    const par = { categoria: selCategoria, subcategoria: selSubcat };
    const paresFuturos = dedupPairs([...(form.categoriasAtuacaoPairs || []), par]);

    // limite de 5 categorias (considerando triplets também)
    const categoriasDistintas = Array.from(new Set([
      ...paresFuturos.map(p => p.categoria),
      ...tripFuturos.map(t => t.categoria),
    ]));
    if (categoriasDistintas.length > MAX_CATEGORIAS) {
      setMsg(`Máximo de ${MAX_CATEGORIAS} categorias distintas.`);
      return;
    }

    setForm({
      ...form,
      categoriasAtuacaoTriplets: tripFuturos,
      categoriasAtuacaoPairs: paresFuturos,
      categoriasAtuacao: categoriasDistintas,
    });

    setSelItens([]);
    setSelSubcat("");
    setSelCategoria("");
    setNovoItem("");
  }

  function addItemManual() {
    if (!form) return;
    const v = (novoItem || "").trim();
    if (!selCategoria) { setMsg("Selecione uma categoria."); return; }
    if (!selSubcat) { setMsg("Selecione uma subcategoria."); return; }
    if (!v) { setMsg("Digite o nome do item."); return; }
    setSelItens((curr) => Array.from(new Set([...curr, v])));
    setNovoItem("");
  }
  function usarSubcategoriaComoItem() {
    if (!selCategoria || !selSubcat) return;
    setSelItens((curr) => Array.from(new Set([...curr, selSubcat])));
  }

  // ======= 2 níveis helpers =======
  function removeParCategoria(par: CategoriaPair) {
    if (!form) return;
    const futuros = (form.categoriasAtuacaoPairs || []).filter(
      (p) => !(p.categoria === par.categoria && p.subcategoria === par.subcategoria)
    );
    const categoriasDistintas = Array.from(new Set([
      ...futuros.map((p) => p.categoria),
      ...(form.categoriasAtuacaoTriplets || []).map(t => t.categoria),
    ]));
    setForm({ ...form, categoriasAtuacaoPairs: futuros, categoriasAtuacao: categoriasDistintas });
  }
  function removeTriplet(t: CategoriaTriplet) {
    if (!form) return;
    const futuros = (form.categoriasAtuacaoTriplets || []).filter(
      (x) => !(x.categoria === t.categoria && x.subcategoria === t.subcategoria && x.item === t.item)
    );
    const categoriasDistintas = Array.from(new Set([
      ...(form.categoriasAtuacaoPairs || []).map(p => p.categoria),
      ...futuros.map(tt => tt.categoria),
    ]));
    setForm({ ...form, categoriasAtuacaoTriplets: futuros, categoriasAtuacao: categoriasDistintas });
  }

  // ======= PDFs =======
  function addPDF(url: string) {
    if (!form) return;
    const v = (url || "").trim();
    if (!v) return;
    setForm({ ...form, portfolioPDFs: Array.from(new Set([...(form.portfolioPDFs || []), v])) });
  }
  function removePDF(url: string) {
    if (!form) return;
    setForm({ ...form, portfolioPDFs: (form.portfolioPDFs || []).filter((u) => u !== url) });
    if (pdfExpandido === url) setPdfExpandido(null);
  }

  // ======= Imagens: remover =======
  function removeImagem(url: string) {
    if (!form) return;
    setForm({ ...form, portfolioImagens: (form.portfolioImagens || []).filter((u) => u !== url) });
  }

  // === salvar SINCRONIZANDO como /perfil ===
  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    setMsg("");

    try {
      const paresDedup = dedupPairs(form.categoriasAtuacaoPairs || []);
      const triplets = dedupTriplets(form.categoriasAtuacaoTriplets || []);

      const categoriasDistintas = Array.from(new Set([
        ...paresDedup.map((p) => p.categoria),
        ...triplets.map((t) => t.categoria),
      ]));
      if (categoriasDistintas.length > MAX_CATEGORIAS) {
        setMsg(`Máximo de ${MAX_CATEGORIAS} categorias distintas.`);
        setSaving(false);
        return;
      }
      const algumSemSub = paresDedup.some((p) => !p.subcategoria?.trim());
      if (algumSemSub) {
        setMsg("Todos os pares precisam ter subcategoria selecionada.");
        setSaving(false);
        return;
      }

      // UFs
      const atendeBrasil = !!form.atendeBrasil;
      const ufsAtendidas = atendeBrasil
        ? ["BRASIL"]
        : Array.from(new Set((form.ufsAtendidas || []).map((u) => String(u).trim().toUpperCase())));
      const ufsSearch = buildUfsSearch(atendeBrasil, ufsAtendidas);

      // Materializações
      const categoriesAll = buildCategoriesAll(paresDedup, form.categoriasAtuacao, triplets);
      const pairsSearch = buildPairsSearch(paresDedup);
      const tripletsSearch = buildTripletsSearch(triplets);

      // PDFs (compat c/ página de perfil)
      const pdfList = form.portfolioPDFs || [];
      const firstPdf = pdfList[0] || null;

      // WhatsApp: normaliza como no /perfil
      const wDigits55 = form.telefone ? toDigits55FromFree(form.telefone) : "";
      const wE164 = wDigits55 ? `+${wDigits55}` : "";

      await updateDoc(doc(db, "usuarios", form.id), {
        // Identidade
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || "",

        whatsapp: wDigits55 || "",
        whatsappE164: wE164 || "",

        cidade: form.estado === "BRASIL" ? "" : form.cidade || "",
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",
        tipo: form.tipo || "Usuário",

        // Atuação
        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,

        // ===== Fonte da verdade =====
        categoriasAtuacaoPairs: paresDedup,
        categoriasAtuacaoTriplets: triplets,

        // ===== Compat =====
        categoriasAtuacao: categoriasDistintas,
        categorias: categoriasDistintas,

        // ===== Materializações =====
        categoriesAll,
        pairsSearch,
        tripletsSearch,
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
    if (pwd1.length < 6) {
      setMsg("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (pwd1 !== pwd2) {
      setMsg("As senhas não coincidem.");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/admin-reset-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: form.id, senha: pwd1 }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Senha redefinida com sucesso.");
      setShowPwdModal(false);
      setPwd1("");
      setPwd2("");
    } catch (e) {
      console.error(e);
      setMsg("Erro ao redefinir senha.");
    } finally {
      setPwdSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  async function revogarSessoes() {
    if (!form) return;
    try {
      const res = await fetch("/api/admin-revoke-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: form.id }),
      });
      if (!res.ok) throw new Error(await res.text());
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
        style={{
          color: "#2563eb",
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={18} /> Voltar
      </Link>

      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1px",
          marginBottom: 20,
        }}
      >
        Editar Usuário (Admin)
      </h1>

      <form onSubmit={salvar} className="grid gap-16">
        {/* Identidade */}
        <div className="card">
          <div className="card-title">Identidade e Contato</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="label">Foto do Perfil</div>
              <ImageUploader
                imagens={avatarLista}
                setImagens={(imgs: string[]) => setField("avatar", imgs[0] || "")}
                max={1}
              />
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                Use imagem quadrada para melhor resultado.
              </div>
            </div>

            <div className="grid gap-4">
              <label className="label" htmlFor="nome">Nome</label>
              <input
                id="nome"
                className="input"
                value={form.nome}
                onChange={(e) => setField("nome", e.target.value)}
                required
              />

              <label className="label" htmlFor="email">E-mail</label>
              <input
                id="email"
                className="input"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />

              <label className="label" htmlFor="whatsapp">WhatsApp</label>
              <input
                id="whatsapp"
                className="input"
                value={form.telefone || ""}
                onChange={(e) => setField("telefone", e.target.value)}
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
              <input
                id="cpfCnpj"
                className="input"
                value={form.cpf_cnpj || ""}
                onChange={(e) => setField("cpf_cnpj", e.target.value)}
              />

              <label className="label" htmlFor="bio">Bio / Sobre</label>
              <textarea
                id="bio"
                className="input"
                rows={3}
                value={form.bio || ""}
                onChange={(e) => setField("bio", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Atuação (categorias + SUBCATEGORIAS + ITENS) */}
        <div className="card">
          <div className="card-title">Atuação</div>

          {/* MIGRAR CATEGORIAS (LEGADO -> NOVO) */}
          <div className="flex items-center gap-3" style={{ margin: "6px 0 10px" }}>
            <button
              type="button"
              className="btn-sec"
              onClick={migrarEsteUsuarioLocalmente}
              style={{ borderWidth: 2, fontWeight: 900 }}
              title="Mapear categorias antigas para a taxonomia nova (este usuário)"
            >
              🔁 Migrar categorias antigas → novas (este usuário)
            </button>
            <small style={{ color: "#475569" }}>
              Usa equivalências e respeita limite de {MAX_CATEGORIAS} categorias.
            </small>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="grid gap-2">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.prestaServicos}
                  onChange={(e) => setField("prestaServicos", e.target.checked)}
                />
                <span>Presta serviços</span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.vendeProdutos}
                  onChange={(e) => setField("vendeProdutos", e.target.checked)}
                />
                <span>Vende produtos</span>
              </label>
              <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                Categorias selecionadas:{" "}
                <b>{selectedCategoriasSet.size}/{MAX_CATEGORIAS}</b>
              </div>
              {form.categoriasLocked && (
                <div className="lock-banner">
                  <Lock size={14}/> Conjunto de <b>CATEGORIAS</b> travado. (subcategorias/itens liberados)
                </div>
              )}
            </div>

            <div>
              <div className="label">Categorias (até {MAX_CATEGORIAS})</div>

              {/* BUSCA acima das categorias */}
              <div className="searchbox">
                <Search size={16} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por categoria, subcategoria ou item…"
                />
                {!!busca && (
                  <button type="button" aria-label="Limpar busca" onClick={() => setBusca("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 1) Categoria */}
              <select
                className="input"
                value={selCategoria}
                onChange={(e) => {
                  setSelCategoria(e.target.value);
                  setSelSubcat("");
                  setSelItens([]);
                  setNovoItem("");
                }}
                disabled={taxLoading}
              >
                <option value="">
                  {taxLoading ? "Carregando categorias..." : "Selecionar categoria..."}
                </option>
                {categoriasFiltradas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* 2) Subcategoria */}
              <div style={{ marginTop: 8 }}>
                <div className="label" style={{ marginBottom: 8 }}>
                  Subcategoria
                </div>
                <select
                  className="input"
                  value={selSubcat}
                  onChange={(e) => {
                    setSelSubcat(e.target.value);
                    setSelItens([]);
                    setNovoItem("");
                  }}
                  disabled={!selCategoria}
                >
                  <option value="">
                    {selCategoria ? "Selecionar subcategoria..." : "Selecione a categoria"}
                  </option>
                  {subcatsDaSelecionada.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* 3) Itens (multi) + FALLBACK */}
              <div style={{ marginTop: 8 }}>
                <div className="label" style={{ marginBottom: 8 }}>
                  Itens da subcategoria selecionada
                </div>

                {/* Existe 3º nível na taxonomia */}
                {selSubcat && itensDaSubSelecionada.length > 0 && (
                  <>
                    <div className="flex items-center gap-8" style={{ marginBottom: 8 }}>
                      <button
                        type="button"
                        className="btn-sec"
                        disabled={!selSubcat || !itensDaSubSelecionada.length}
                        onClick={() => setSelItens(itensDaSubSelecionada)}
                      >
                        Marcar tudo
                      </button>
                      <button
                        type="button"
                        className="btn-sec"
                        disabled={!selSubcat}
                        onClick={() => setSelItens([])}
                      >
                        Limpar seleção
                      </button>
                      <button
                        type="button"
                        className="btn-sec"
                        disabled={!selCategoria || !selSubcat || !selItens.length}
                        onClick={addTripletsSelecionados}
                      >
                        + Adicionar selecionados
                      </button>
                    </div>

                    <div className="subcat-grid">
                      {itensDaSubSelecionada.map((i) => {
                        const checked = selItens.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            className="subcat-pill"
                            onClick={() =>
                              setSelItens((curr) =>
                                curr.includes(i) ? curr.filter((x) => x !== i) : [...curr, i]
                              )
                            }
                            aria-pressed={checked}
                            title={checked ? "Clique para desmarcar" : "Clique para marcar"}
                            style={{
                              background: checked ? "#ecfdf5" : "#f7f9fc",
                              borderColor: checked ? "#baf3cd" : "#e0ecff",
                              color: checked ? "#059669" : "#2563eb",
                            }}
                          >
                            {checked ? <CheckSquare size={16} /> : <Square size={16} />} {i}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* FALLBACK: sem 3º nível */}
                {selSubcat && itensDaSubSelecionada.length === 0 && (
                  <div className="rounded-lg border p-3" style={{ borderColor: "#e6ebf2", background: "#f9fbff" }}>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
                      Esta subcategoria não possui itens cadastrados. Você pode:
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          className="input"
                          placeholder="Criar item manual (ex.: Modelo X 110x750)"
                          value={novoItem}
                          onChange={(e) => setNovoItem(e.target.value)}
                        />
                        <button type="button" className="btn-sec" onClick={addItemManual}>
                          <Plus size={14}/> Adicionar item
                        </button>
                      </div>

                      <button type="button" className="btn-sec" onClick={usarSubcategoriaComoItem}>
                        <Plus size={14}/> Usar a própria subcategoria como item
                      </button>

                      {selItens.length > 0 && (
                        <div className="flex items-center justify-between mt-2">
                          <div style={{ fontSize: 13, color: "#334155" }}>
                            Selecionados: <b>{selItens.join(", ")}</b>
                          </div>
                          <button type="button" className="btn-sec" onClick={addTripletsSelecionados}>
                            + Adicionar selecionados
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agrupamento por categoria com chips das subcategorias e itens já salvos */}
          {selectedCategorias.length > 0 && (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {selectedCategorias.map((cat) => {
                const paresDaCat = (form.categoriasAtuacaoPairs || []).filter((p) => p.categoria === cat);
                const itensDaCat = (form.categoriasAtuacaoTriplets || []).filter((t) => t.categoria === cat);
                return (
                  <div
                    key={cat}
                    style={{ border: "1px solid #e6edf6", borderRadius: 12, padding: 10, background: "#f8fbff" }}
                  >
                    <div style={{ fontWeight: 900, color: "#023047", marginBottom: 6, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                      {cat}
                      <span style={{ color: "#2563eb", fontWeight: 800, fontSize: 12 }}>
                        subcats: {subcatsCountByCategoria.get(cat) || 0}
                      </span>
                      <span style={{ color: "#059669", fontWeight: 800, fontSize: 12 }}>
                        itens: {itensCountByCategoria.get(cat) || 0}
                      </span>
                    </div>

                    {/* Chips de subcategorias */}
                    {paresDaCat.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, color: "#334155", margin: "4px 0 6px" }}>Subcategorias</div>
                        <div className="chips">
                          {paresDaCat.map((p, idx) => (
                            p.subcategoria ? (
                              <span key={`${p.categoria}__${p.subcategoria}__${idx}`} className="chip">
                                <Tag size={14} /> {p.subcategoria}
                                <button type="button" onClick={() => removeParCategoria(p)} title="Remover">×</button>
                              </span>
                            ) : null
                          ))}
                        </div>
                      </>
                    )}

                    {/* Itens agrupados por subcategoria */}
                    {(itensDaCat.length > 0) && (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        {(() => {
                          const mapSub = new Map<string, string[]>();
                          itensDaCat.forEach(t => {
                            if (!mapSub.has(t.subcategoria)) mapSub.set(t.subcategoria, []);
                            mapSub.get(t.subcategoria)!.push(t.item);
                          });
                          return Array.from(mapSub.entries()).map(([sub, itens]) => (
                            <div key={`sub-${cat}-${sub}`} style={{ paddingLeft: 2 }}>
                              <div style={{ fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
                                {sub} <span style={{ color: "#2563eb" }}>({itens.length})</span>
                              </div>
                              <div className="chips">
                                {itens.map((item, iidx) => (
                                  <span key={`${cat}__${sub}__${item}__${iidx}`} className="chip">
                                    <Tag size={14} /> {item}
                                    <button type="button" onClick={() => removeTriplet({ categoria: cat, subcategoria: sub, item })} title="Remover">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                          setField(
                            "ufsAtendidas",
                            has ? form.ufsAtendidas.filter((u) => u !== uf) : [...form.ufsAtendidas, uf]
                          );
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
              <ImageUploader
                imagens={form.portfolioImagens}
                setImagens={(arr: string[]) => setField("portfolioImagens", arr)}
                max={12}
              />

              {form.portfolioImagens?.length ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  {form.portfolioImagens.map((img) => (
                    <div
                      key={img}
                      style={{
                        border: "1px solid #e6edf6",
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "#fff" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="Imagem do portfólio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: 8 }}>
                        <a
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sec"
                          title="Abrir em nova aba"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <Eye size={14} /> Ver
                        </a>
                        <a
                          href={img}
                          download
                          className="btn-sec"
                          title="Baixar imagem"
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
                          <Download size={14} /> Baixar
                        </a>
                        <button
                          type="button"
                          className="btn-sec"
                          title="Remover"
                          onClick={() => removeImagem(img)}
                          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        >
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
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
                    <li
                      key={pdf}
                      style={{ border: "1px solid #e6edf6", borderRadius: 12, padding: 10, background: "#f7fafc" }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto auto",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
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

                        <button
                          type="button"
                          className="btn-sec"
                          onClick={() => setPdfExpandido(pdfExpandido === pdf ? null : pdf)}
                          title="Visualizar"
                        >
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
                        <div
                          className="rounded-lg border overflow-hidden"
                          style={{ height: 320, marginTop: 10, background: "#fff" }}
                        >
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
              {form.verificado && <span className="badge badge-info" title="Fornecedor verificado">Fornecedor</span>}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Coluna 1 — Conta */}
            <div className="panel-section">
              <div className="section-title">Conta</div>

              <label className="label" htmlFor="statusConta">Status da conta</label>
              <select
                id="statusConta"
                className="input"
                value={form.status || "ativo"}
                onChange={(e) => setField("status", e.target.value as any)}
              >
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
                <button type="button" className="btn-sec btn-outline" onClick={enviarResetSenha}>
                  <Mail size={16} /> Enviar link de redefinição
                </button>
                <button type="button" className="btn-sec btn-outline" onClick={revogarSessoes}>
                  <Shield size={16} /> Encerrar sessões
                </button>
              </div>

              <label className="checkbox" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={!!form.requirePasswordChange}
                  onChange={(e) => setField("requirePasswordChange", e.target.checked)}
                />
                <span>Exigir troca de senha no próximo login</span>
              </label>
            </div>

            {/* Coluna 2 — Financeiro + Patrocínio */}
            <div className="panel-section">
              <div className="section-title">Financeiro</div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input"
                  placeholder="Plano"
                  value={form.financeiro?.plano || ""}
                  onChange={(e) =>
                    setField("financeiro", { ...(form.financeiro || {}), plano: e.target.value })
                  }
                />
                <select
                  className="input"
                  value={form.financeiro?.situacao || "pendente"}
                  onChange={(e) =>
                    setField("financeiro", {
                      ...(form.financeiro || {}),
                      situacao: e.target.value as "pago" | "pendente",
                    })
                  }
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
                  onChange={(e) =>
                    setField("financeiro", {
                      ...(form.financeiro || {}),
                      valor: e.target.value ? Number(e.target.value) : null,
                    })
                  }
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
                  onChange={(e) =>
                    setField("financeiro", { ...(form.financeiro || {}), proxRenovacao: e.target.value })
                  }
                />
              </div>

              <div className="divider" />

              <div className="section-title inline">Patrocínio</div>
              <div className="sponsor-card">
                <span
                  className={`badge ${form.isPatrocinador ? "badge-success" : "badge-danger"}`}
                  title="Status de patrocínio"
                >
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
                    const ok = window.confirm(
                      `${ativar ? "Ativar" : "Desativar"} patrocínio para ${form.email || form.nome || form.id}?`
                    );
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#0006",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px",
              width: "min(520px,92vw)",
              boxShadow: "0 10px 30px #0003",
            }}
          >
            <h3 style={{ fontWeight: 900, color: "#023047", fontSize: 20, marginBottom: 12 }}>Definir nova senha</h3>

            <label className="label" htmlFor="novaSenha">Nova senha</label>
            <div style={{ position: "relative" }}>
              <input
                id="novaSenha"
                type={pwdVisible ? "text" : "password"}
                className="input"
                value={pwd1}
                minLength={6}
                onChange={(e) => setPwd1(e.target.value)}
                placeholder="mín. 6 caracteres"
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
              minLength={6}
              onChange={(e) => setPwd2(e.target.value)}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>Força: {senhaForca}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn-sec"
                onClick={() => {
                  setShowPwdModal(false);
                  setPwd1("");
                  setPwd2("");
                }}
              >
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
        .chip button { background: none; border: none; color: #999; font-weight: 900; cursor: pointer; }
        .pill { border: 1px solid #e6e9ef; border-radius: 999px; padding: 6px 10px; font-weight: 800; font-size: 0.95rem; }
        .btn-sec { background: #f7f9fc; color: #2563eb; border: 1px solid #e0ecff; font-weight: 800; border-radius: 10px; padding: 8px 12px; }
        .btn-gradient { background: linear-gradient(90deg,#fb8500,#fb8500); color: #fff; font-weight: 900; border: none; border-radius: 14px; padding: 14px 26px; font-size: 1.08rem; box-shadow: 0 4px 18px #fb850033; }

        /* Subcategorias/itens */
        .subcat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .subcat-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid; border-radius: 10px; padding: 8px 10px; font-weight: 800; }

        /* Busca */
        .searchbox { display:flex; align-items:center; gap:8px; border:1.6px solid #e5e7eb; border-radius:10px; background:#fff; padding:8px 10px; margin-bottom:8px; }
        .searchbox input { flex:1; border:none; outline:none; font-size:14px; }
        .searchbox button { border:none; background:transparent; cursor:pointer; color:#64748b; }

        .lock-banner { display: flex; align-items: center; gap: 8px; background: #fff7ed; border: 1px solid #ffedd5; color: #9a3412; padding: 8px 10px; border-radius: 10px; font-weight: 800; }

        @media (max-width: 650px) {
          .card { padding: 18px 14px; border-radius: 14px; }
          .subcat-grid { grid-template-columns: 1fr; }
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
        .chip-off { background: #fff0f0; border-color: #ffdada; color: #d90429; }
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
            <li key={v} className="video-row">
              <a href={v} target="_blank" rel="noopener noreferrer" className="a">
                {v}
              </a>
              <button
                type="button"
                onClick={() =>
                  setField(
                    "portfolioVideos",
                    (form.portfolioVideos || []).filter((x) => x !== v)
                  )
                }
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

// app/perfil/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  ChevronLeft,
  Loader,
  Tag,
  HelpCircle,
  CheckSquare,
  Square,
  Upload,
  FileText,
  Lock,
  Search,
  X,
  Plus,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";
import TaxonomyQuickSearch, { TaxonomyPath } from "@/components/TaxonomyQuickSearch";

/** ==== PDF (SSR desativado para evitar erro no Next) ==== */
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false }) as any;
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false }) as any;

/** =========================
 *  Constantes auxiliares
 *  ========================= */
const SUPPORT_WHATSAPP = "5531990903613";
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
const UFS_SET = new Set<string>(UFS);

type AgendaDia = { ativo: boolean; das: string; ate: string };
type CategoriaPair = { categoria: string; subcategoria: string };
type CategoriaTriplet = { categoria: string; subcategoria: string; item: string };

type PerfilForm = {
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

  // Legado (2 níveis)
  categoriasAtuacaoPairs: CategoriaPair[];
  categoriasAtuacao: string[]; // legado

  // Novo (3 níveis)
  categoriasAtuacaoTriplets?: CategoriaTriplet[];

  categoriasLocked?: boolean;
  categoriasLockedAt?: any;

  atendeBrasil: boolean;
  ufsAtendidas: string[];
  agenda: Record<string, AgendaDia>;
  portfolioImagens: string[];
  /** ⇩ PDF único do portfólio */
  portfolioPdfUrl?: string | null;

  leadPreferencias: {
    categorias: string[];
    ufs: string[];
    ticketMin?: number | null;
    ticketMax?: number | null;
  };

  mpConnected?: boolean;
  mpStatus?: string;
};

const MAX_CATEGORIAS = 5;

export default function PerfilPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Taxonomia centralizada (3 níveis; Firestore > fallback local)
  const { categorias, loading: taxLoading } = useTaxonomia();

  

  const nomesCategoriasTodos = useMemo(() => categorias.map((c) => c.nome), [categorias]);

  // PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // cidades por UF
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // seleção 3 níveis
  const [selCategoria, setSelCategoria] = useState("");
  const [selSubcat, setSelSubcat] = useState("");
  const [selItens, setSelItens] = useState<string[]>([]);
  const [novoItem, setNovoItem] = useState(""); // <— NOVO: item manual quando não há 3º nível na taxonomia

  const [categoriasLocked, setCategoriasLocked] = useState<boolean>(false);
  const [pairsOriginais, setPairsOriginais] = useState<CategoriaPair[]>([]);
  const categoriasOriginaisSet = useMemo(
    () => new Set(pairsOriginais.map((p) => p.categoria)),
    [pairsOriginais]
  );

  const [form, setForm] = useState<PerfilForm>({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    cpf_cnpj: "",
    bio: "",
    avatar: "",
    tipo: "Usuário",
    prestaServicos: false,
    vendeProdutos: false,

    categoriasAtuacaoPairs: [],
    categoriasAtuacao: [],
    categoriasAtuacaoTriplets: [],

    categoriasLocked: false,
    atendeBrasil: false,
    ufsAtendidas: [],
    agenda: {
      seg: { ativo: true, das: "08:00", ate: "18:00" },
      ter: { ativo: true, das: "08:00", ate: "18:00" },
      qua: { ativo: true, das: "08:00", ate: "18:00" },
      qui: { ativo: true, das: "08:00", ate: "18:00" },
      sex: { ativo: true, das: "08:00", ate: "18:00" },
      sab: { ativo: false, das: "08:00", ate: "12:00" },
      dom: { ativo: false, das: "08:00", ate: "12:00" },
    },
    portfolioImagens: [],
    portfolioPdfUrl: null,
    leadPreferencias: { categorias: [], ufs: [], ticketMin: null, ticketMax: null },
    mpConnected: false,
    mpStatus: "desconectado",
  });

  const avatarLista = useMemo(() => (form.avatar ? [form.avatar] : []), [form.avatar]);

  /* ================= Auth + realtime ================= */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.uid);
      const ref = doc(db, "usuarios", user.uid);
      const unsubUser = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }
        const data: any = snap.data() || {};
        const locked = !!data.categoriasLocked;

        const pairs: CategoriaPair[] = Array.isArray(data.categoriasAtuacaoPairs)
          ? data.categoriasAtuacaoPairs
          : [];

        let initialPairs = pairs;
        if (!pairs?.length && Array.isArray(data.categoriasAtuacao) && data.categoriasAtuacao.length) {
          initialPairs = (data.categoriasAtuacao as string[])
            .slice(0, MAX_CATEGORIAS)
            .map((c: string) => ({ categoria: c, subcategoria: "" }));
        }

        const triplets: CategoriaTriplet[] = Array.isArray(data.categoriasAtuacaoTriplets)
          ? data.categoriasAtuacaoTriplets
          : [];

        setPairsOriginais(initialPairs);
        setCategoriasLocked(locked);

        setForm((prev) => ({
          ...prev,
          nome: data.nome || "",
          email: data.email || user.email || "",
          telefone: data.whatsappE164
            ? maskBRFrom55(data.whatsappE164)
            : (data.whatsapp ? maskBRFrom55(data.whatsapp) : (data.telefone || "")),
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: data.cpf_cnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || prev.tipo,
          prestaServicos: !!data.prestaServicos,
          vendeProdutos: !!data.vendeProdutos,

          categoriasAtuacaoPairs: initialPairs,
          categoriasAtuacao: Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [],
          categoriasAtuacaoTriplets: triplets,

          categoriasLocked: locked,
          atendeBrasil: !!data.atendeBrasil,
          ufsAtendidas: data.ufsAtendidas || [],
          agenda: data.agenda || prev.agenda,
          portfolioImagens: data.portfolioImagens || [],
          portfolioPdfUrl: data.portfolioPdfUrl || null,
          leadPreferencias: {
            categorias: data.leadPreferencias?.categorias || [],
            ufs: data.leadPreferencias?.ufs || [],
            ticketMin: data.leadPreferencias?.ticketMin ?? null,
            ticketMax: data.leadPreferencias?.ticketMax ?? null,
          },
          mpConnected: !!data.mpConnected,
          mpStatus: data.mpStatus || "desconectado",
        }));

        setPdfUrl(data.portfolioPdfUrl || null);
        setLoading(false);
      });

      return () => unsubUser();
    });

    return () => unsubAuth();
  }, []);

  /* ================= UF -> cidades (IBGE) ================= */
  useEffect(() => {
    let abort = false;

    async function fetchCidades(uf: string) {
      if (!uf || uf === "BRASIL") {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
          { cache: "no-store" }
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

    fetchCidades(form.estado || "");
    return () => { abort = true; };
  }, [form.estado]);

  /* ================= Helpers ================= */
  function setField<K extends keyof PerfilForm>(key: K, value: PerfilForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function onlyDigits(v: string) {
    return v.replace(/\D/g, "");
  }
  function maskBRFrom55(input: string) {
    const onlyDigits = (v: string) => v.replace(/\D/g, "");
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
    return d.startsWith("55") ? d : `55${d}`;
  }
function onPickTaxonomy(path: TaxonomyPath) {
  const [c1, c2, c3] = path;

  // Preenche os selects
  setSelCategoria(c1 || "");
  setSelSubcat(c2 || "");
  setSelItens([]);

  // Se vier item final, já adiciona automaticamente ao perfil
  if (c1 && c2 && c3) {
    // Respeita travas e limite de categorias
    const isCategoriaNova = !selectedCategoriasSet.has(c1);
    if (categoriasLocked && isCategoriaNova) {
      setMsg("Categorias travadas: adicione itens apenas das categorias já escolhidas.");
      return;
    }
    if (!categoriasLocked && isCategoriaNova && selectedCategoriasSet.size >= MAX_CATEGORIAS) {
      setMsg(`Você já tem ${MAX_CATEGORIAS}/${MAX_CATEGORIAS} categorias. Use uma existente.`);
      return;
    }

    const novoTriplet = { categoria: c1, subcategoria: c2, item: c3 };

    setForm((f) => ({
      ...f,
      categoriasAtuacaoPairs: dedupPairs([
        ...f.categoriasAtuacaoPairs,
        { categoria: c1, subcategoria: c2 }
      ]),
      categoriasAtuacaoTriplets: dedupTriplets([
        ...(f.categoriasAtuacaoTriplets || []),
        novoTriplet
      ]),
    }));

    setMsg(`Adicionado: ${c1} › ${c2} › ${c3}`);
  }
}

  function dedupPairs(pairs: CategoriaPair[]) {
  const m = new Map<string, CategoriaPair>();
  for (const p of pairs) m.set(`${p.categoria.trim().toLowerCase()}::${p.subcategoria.trim().toLowerCase()}`, p);
  return Array.from(m.values());
}

function dedupTriplets(tris: CategoriaTriplet[]) {
  const m = new Map<string, CategoriaTriplet>();
  for (const t of tris) m.set(`${t.categoria.trim().toLowerCase()}::${t.subcategoria.trim().toLowerCase()}::${t.item.trim().toLowerCase()}`, t);
  return Array.from(m.values());
}

  function toSubcatNames(arr: any[] | undefined): string[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((s) => (typeof s === "string" ? s : (s?.nome ?? "")))
      .filter(Boolean);
  }
  function toItemNamesFromAnyKeys(entry: any): string[] {
    // Aceita: { itens: [...] } | { items: [...] } | { subitens: [...] }
    if (!entry) return [];
    const raw =
      entry.itens ??
      entry.items ??
      entry.subitens ??
      [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((i) => (typeof i === "string" ? i : (i?.nome ?? "")))
      .filter(Boolean);
  }

  function buildCategoriesAll(pairs: CategoriaPair[], legacy: string[] = [], tris: CategoriaTriplet[] = []) {
    const set = new Set<string>((legacy || []).filter(Boolean));
    for (const p of pairs) if (p.categoria) set.add(p.categoria);
    for (const t of tris) if (t.categoria) set.add(t.categoria);
    return Array.from(set);
  }
  function buildPairsSearch(pairs: CategoriaPair[]) {
  return pairs
    .filter((p) => p.categoria && p.subcategoria)
    .map((p) => `${p.categoria.trim().toLowerCase()}::${p.subcategoria.trim().toLowerCase()}`);
}

function buildTripletsSearch(tris: CategoriaTriplet[]) {
  return tris
    .filter((t) => t.categoria && t.subcategoria && t.item)
    .map((t) => `${t.categoria.trim().toLowerCase()}::${t.subcategoria.trim().toLowerCase()}::${t.item.trim().toLowerCase()}`);
}
  function buildUfsSearch(atendeBrasil: boolean, ufsAtendidas: string[] = []) {
    const arr = (ufsAtendidas || []).map((u) => String(u).trim().toUpperCase());
    if (atendeBrasil && !arr.includes("BRASIL")) arr.push("BRASIL");
    return Array.from(new Set(arr));
  }

  // Selecionadas
  const selectedCategoriasSet = useMemo(() => {
    const set = new Set<string>(form.categoriasAtuacaoPairs.map((p) => p.categoria));
    (form.categoriasAtuacaoTriplets || []).forEach(t => set.add(t.categoria));
    return set;
  }, [form.categoriasAtuacaoPairs, form.categoriasAtuacaoTriplets]);
  const selectedCategorias = useMemo(() => Array.from(selectedCategoriasSet), [selectedCategoriasSet]);

  // Dropdown base (lock + limite)
  const categoriasDropdownBase = useMemo(() => {
    const base = nomesCategoriasTodos;
    if (categoriasLocked) return base.filter((c) => selectedCategoriasSet.has(c));
    if (selectedCategoriasSet.size >= MAX_CATEGORIAS) return base.filter((c) => selectedCategoriasSet.has(c));
    return base;
  }, [categoriasLocked, selectedCategoriasSet, nomesCategoriasTodos]);

  // Filtro da busca na categoria
  const categoriasFiltradas = useMemo(() => {
  return categoriasDropdownBase;
}, [categoriasDropdownBase]);


      // Se o termo bater em algum item, também mantém a categoria visível
     const subcatsDaSelecionada = useMemo(() => {
  if (!selCategoria) return [];
  const cat = categorias.find((c) => c.nome === selCategoria);
  return toSubcatNames(cat?.subcategorias);
}, [selCategoria, categorias]);


  // Itens do 3º nível
  const itensDaSubSelecionada = useMemo(() => {
  if (!selCategoria || !selSubcat) return [];
  const cat = categorias.find((c) => c.nome === selCategoria);
  const sub = (cat?.subcategorias || []).find((s: any) => (typeof s === "string" ? s : s?.nome) === selSubcat);
  return toItemNamesFromAnyKeys(sub);
}, [selCategoria, selSubcat, categorias]);


  /* ===== Ações 3º nível ===== */
  function addTripletsSelecionados() {
    if (!selCategoria) { setMsg("Selecione uma categoria."); return; }
    if (!selSubcat) { setMsg("Selecione uma subcategoria."); return; }
    if (!selItens.length) { setMsg("Marque um ou mais itens."); return; }

    const isCategoriaNova = !selectedCategoriasSet.has(selCategoria);
    if (categoriasLocked && isCategoriaNova) {
      setMsg("Categorias travadas: adicione itens apenas das categorias já escolhidas.");
      return;
    }
    if (!categoriasLocked && isCategoriaNova && selectedCategoriasSet.size >= MAX_CATEGORIAS) {
      setMsg(`Você já tem ${MAX_CATEGORIAS}/${MAX_CATEGORIAS} categorias. Use uma existente.`);
      return;
    }

    const novos: CategoriaTriplet[] = selItens.map((item) => ({
      categoria: selCategoria, subcategoria: selSubcat, item
    }));

    setForm((f) => ({
      ...f,
      categoriasAtuacaoPairs: dedupPairs([
        ...f.categoriasAtuacaoPairs,
        { categoria: selCategoria, subcategoria: selSubcat }
      ]),
      categoriasAtuacaoTriplets: dedupTriplets([...(f.categoriasAtuacaoTriplets || []), ...novos]),
    }));

    setSelItens([]);
    setSelSubcat("");
    setSelCategoria("");
    setNovoItem("");
    setMsg("");
  }

  // NOVO: adicionar item manual quando a subcategoria não possui 3º nível
  function addItemManual() {
    const nome = (novoItem || "").trim();
    if (!selCategoria) { setMsg("Selecione uma categoria."); return; }
    if (!selSubcat) { setMsg("Selecione uma subcategoria."); return; }
    if (!nome) { setMsg("Digite o nome do item."); return; }
    if (!selectedCategoriasSet.has(selCategoria) && categoriasLocked) {
      setMsg("Categorias travadas: adicione dentro das categorias já escolhidas.");
      return;
    }
    setSelItens((curr) => Array.from(new Set([...curr, nome])));
    setNovoItem("");
  }

  // NOVO: usar a própria subcategoria como item (para fechar 3 níveis)
  function usarSubcategoriaComoItem() {
    if (!selCategoria || !selSubcat) return;
    if (!selectedCategoriasSet.has(selCategoria) && categoriasLocked) {
      setMsg("Categorias travadas: adicione dentro das categorias já escolhidas.");
      return;
    }
    setSelItens((curr) => Array.from(new Set([...curr, selSubcat])));
  }

  /* ===== Remoções ===== */
  function removeParCategoria(par: CategoriaPair) {
    setForm((f) => {
      const futuros = f.categoriasAtuacaoPairs.filter(
        (p) => !(p.categoria === par.categoria && p.subcategoria === par.subcategoria)
      );
      if (categoriasLocked) {
        const aindaTemDaCategoria = futuros.some((p) => p.categoria === par.categoria) ||
          (f.categoriasAtuacaoTriplets || []).some(t => t.categoria === par.categoria);
        if (!aindaTemDaCategoria) {
          setMsg("Categorias travadas: não é possível remover a última subcategoria de uma categoria.");
          return f;
        }
      }
      return { ...f, categoriasAtuacaoPairs: futuros };
    });
  }

  function removeTriplet(t: CategoriaTriplet) {
    setForm((f) => {
      const futuros = (f.categoriasAtuacaoTriplets || []).filter(
        (x) => !(x.categoria === t.categoria && x.subcategoria === t.subcategoria && x.item === t.item)
      );
      return { ...f, categoriasAtuacaoTriplets: futuros };
    });
  }

  /* ===== WhatsApp & UFs ===== */
  async function pedirAlteracaoViaWhatsApp() {
    if (!userId) return;
    try {
      await addDoc(collection(db, "supportRequests"), {
        userId,
        tipo: "categoriasAtuacao",
        mensagem: "Solicito alteração nas minhas CATEGORIAS de atuação (não subcategorias/itens).",
        createdAt: serverTimestamp(),
        status: "open",
        canal: "whatsapp",
      });
    } catch {}
    const pairsTxt =
      (form.categoriasAtuacaoPairs || [])
        .map((p) => `${p.categoria} › ${p.subcategoria || "-"}`)
        .join(" | ");
    const tripTxt =
      (form.categoriasAtuacaoTriplets || [])
        .map((t) => `${t.categoria} › ${t.subcategoria} › ${t.item}`)
        .join(" | ");
    const texto = [
      "Olá, equipe de suporte! Quero alterar minhas CATEGORIAS de atuação.",
      "",
      `• UID: ${userId}`,
      `• Nome: ${form.nome || "-"}`,
      `• E-mail: ${form.email || "-"}`,
      `• Pares atuais: ${pairsTxt || "-"}`,
      `• Itens atuais: ${tripTxt || "-"}`,
      "",
      "Mensagem: Solicito liberação para alterar o conjunto de CATEGORIAS."
    ].join("\n");
    const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleUfAtendida(uf: string) {
  if (uf === "BRASIL") {
    setForm((f) => ({
      ...f,
      atendeBrasil: !f.atendeBrasil,
      ufsAtendidas: !f.atendeBrasil ? ["BRASIL"] : [],
    }));
    return;
  }

  // sanitize + whitelist
  const val = String(uf).trim().toUpperCase();
  if (!UFS_SET.has(val)) return; // ignora qualquer coisa fora da lista

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


  /* ================= Salvar ================= */
  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMsg("");

    try {
      if (form.categoriasAtuacaoPairs.length) {
        const algumSemSub = form.categoriasAtuacaoPairs.some((p) => !p.subcategoria?.trim());
        if (algumSemSub) {
          setMsg("Todos os pares precisam de subcategoria selecionada.");
          setSaving(false); return;
        }
      }

      const paresDedup = dedupPairs(form.categoriasAtuacaoPairs);
      const triplets = dedupTriplets(form.categoriasAtuacaoTriplets || []);

      const categoriasDistintas = Array.from(new Set([
        ...paresDedup.map(p => p.categoria),
        ...triplets.map(t => t.categoria),
      ])).filter(Boolean);

      if (categoriasDistintas.length > MAX_CATEGORIAS) {
        setMsg(`Você pode escolher no máximo ${MAX_CATEGORIAS} categorias distintas.`);
        setSaving(false); return;
      }

      if (categoriasLocked) {
        const mesmas =
          categoriasDistintas.length === categoriasOriginaisSet.size &&
          categoriasDistintas.every((c) => categoriasOriginaisSet.has(c));
        if (!mesmas) {
          setMsg("Categorias travadas: não é possível alterar o conjunto de CATEGORIAS.");
          setSaving(false); return;
        }
      }
      const shouldLockNow = !categoriasLocked && categoriasDistintas.length === MAX_CATEGORIAS;

      const categoriesAll = buildCategoriesAll(paresDedup, form.categoriasAtuacao, triplets);
      const pairsSearch = buildPairsSearch(paresDedup);
      const tripletsSearch = buildTripletsSearch(triplets);
      const ufsSearch = buildUfsSearch(form.atendeBrasil, form.ufsAtendidas);

      const ufsAtendidas = form.atendeBrasil ? ["BRASIL"] :
        Array.from(new Set((form.ufsAtendidas || []).map((u) => String(u).trim().toUpperCase())));

      const wDigits55 = form.telefone ? toDigits55FromFree(form.telefone) : "";
      const wE164 = wDigits55 ? `+${wDigits55}` : "";

      await updateDoc(doc(db, "usuarios", userId), {
        nome: form.nome,
        telefone: form.telefone || "",
        whatsapp: wDigits55 || "",
        whatsappE164: wE164 || "",
        cidade: form.estado === "BRASIL" ? "" : (form.cidade || ""),
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",

        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,

        categoriasAtuacaoPairs: paresDedup,
        categoriasAtuacaoTriplets: triplets,

        categoriasAtuacao: categoriasDistintas,
        categorias: categoriasDistintas,

        categoriesAll,
        pairsSearch,
        tripletsSearch,
        ufsSearch,

        atendeBrasil: form.atendeBrasil,
        ufsAtendidas,

        portfolioImagens: form.portfolioImagens,
        portfolioPdfUrl: pdfUrl || null,

        agenda: form.agenda,
        leadPreferencias: {
          categorias: form.leadPreferencias.categorias,
          ufs: form.leadPreferencias.ufs,
          ticketMin: form.leadPreferencias.ticketMin ?? null,
          ticketMax: form.leadPreferencias.ticketMax ?? null,
        },
        mpConnected: !!form.mpConnected,
        mpStatus: form.mpStatus || "desconectado",
        atualizadoEm: serverTimestamp(),
      });

      if (shouldLockNow) {
        setCategoriasLocked(true);
        setPairsOriginais(paresDedup);
      }

      setForm(f => ({
        ...f,
        categoriasAtuacaoPairs: paresDedup,
        categoriasAtuacaoTriplets: triplets,
      }));
      setMsg("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  // contadores
  const subcatsCountByCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of form.categoriasAtuacaoPairs) {
      if (!p.categoria || !p.subcategoria) continue;
      m.set(p.categoria, (m.get(p.categoria) || 0) + 1);
    }
    return m;
  }, [form.categoriasAtuacaoPairs]);

  const itensCountByCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of (form.categoriasAtuacaoTriplets || [])) {
      if (!t.categoria || !t.item) continue;
      m.set(t.categoria, (m.get(t.categoria) || 0) + 1);
    }
    return m;
  }, [form.categoriasAtuacaoTriplets]);

  if (loading) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "50px 2vw 70px 2vw" }}>
        <div style={{ textAlign: "center", color: "#219EBC", fontWeight: 800 }}>
          <Loader className="animate-spin" /> Carregando perfil...
        </div>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
      <Link
        href="/painel"
        className="hover:opacity-80"
        style={{ color: "#2563eb", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, textDecoration: "none" }}
      >
        <ChevronLeft size={18} /> Voltar ao Painel
      </Link>

      <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px", marginBottom: 10 }}>
        Meu Perfil
      </h1>

      <div style={{ marginBottom: 20, fontWeight: 800, color: selectedCategoriasSet.size >= MAX_CATEGORIAS ? "#16a34a" : "#023047" }}>
        Categorias selecionadas: {selectedCategoriasSet.size}/{MAX_CATEGORIAS}
      </div>

      {categoriasLocked && (
        <div className="lock-banner">
          <Lock size={16} />
          Suas <b>CATEGORIAS</b> estão travadas. Você ainda pode gerenciar <b>subcategorias</b> e <b>itens</b> dentro delas.
          <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
            <HelpCircle size={14} /> Pedir alteração das CATEGORIAS ao suporte
          </button>
        </div>
      )}

      <form onSubmit={salvar} className="grid gap-16">
        {/* Identidade */}
        <div className="card">
          <div className="card-title">Identidade e Contato</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="label">Foto do Perfil</div>
              <ImageUploader imagens={avatarLista} setImagens={(arr) => setField("avatar", arr[0] || "")} max={1} />
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Use uma imagem quadrada para melhor resultado.</div>
            </div>

            <div className="grid gap-4">
              <label className="label">Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setField("nome", e.target.value)} required />

              <label className="label">E-mail</label>
              <input className="input" value={form.email} disabled />

              <label className="label">WhatsApp</label>
              <input className="input" value={form.telefone || ""} onChange={(e) => setField("telefone", e.target.value)} placeholder="(xx) xxxxx-xxxx" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Estado (UF)</label>
                  <select
                    className="input"
                    value={form.estado || ""}
                    onChange={(e) => {
                      const uf = e.target.value;
                      setForm((f) => ({ ...f, estado: uf, cidade: "" }));
                    }}
                  >
                    <option value="">Selecione</option>
                    {UFS.map((uf) => (
  <option key={uf} value={uf}>
    {uf}
  </option>
))}

                  </select>
                </div>

                <div>
                  <label className="label">Cidade</label>
                  <select
                    className="input"
                    value={form.cidade || ""}
                    onChange={(e) => setField("cidade", e.target.value)}
                    disabled={!form.estado || form.estado === "BRASIL" || carregandoCidades}
                  >
                    <option value="">
                      {!form.estado ? "Selecione o estado"
                        : form.estado === "BRASIL" ? "—"
                        : (carregandoCidades ? "Carregando..." : "Selecione a cidade")}
                    </option>
                    {cidades.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="label">CPF ou CNPJ</label>
              <input className="input" value={form.cpf_cnpj || ""} onChange={(e) => setField("cpf_cnpj", e.target.value)} placeholder="Somente números" />

              <label className="label">Bio / Sobre você</label>
              <textarea className="input" rows={3} value={form.bio || ""} onChange={(e) => setField("bio", e.target.value)} placeholder="Conte um pouco sobre você, sua empresa ou serviços" />
            </div>
          </div>
        </div>

        {/* Atuação */}
        <div className="card">
          <div className="card-title">Atuação</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="grid gap-2">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.prestaServicos}
                  onChange={(e) => setField("prestaServicos", e.target.checked)}
                />
                <span>Presto serviços</span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.vendeProdutos}
                  onChange={(e) => setField("vendeProdutos", e.target.checked)}
                />
                <span>Vendo produtos</span>
              </label>
            </div>

            <div>
              <div className="label">
                Categorias (até {MAX_CATEGORIAS} <b>categorias</b>; <b>subcategorias</b> e <b>itens</b> ilimitados)
              </div>

  {/* Busca inteligente (autocomplete 3 níveis) */}
<div className="rounded-2xl border p-4" style={{ borderColor: "#e6ebf2", background: "#f8fafc", marginBottom: 10 }}>
  <TaxonomyQuickSearch
    categorias={categorias}
    disabled={taxLoading}
    onSelectPath={onPickTaxonomy}
    // placeholder opcional:
    // placeholder="Ex.: britador de mandíbulas, peneira vibratória, CLP, etc."
  />
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
                <option value="">{taxLoading ? "Carregando categorias..." : "Selecionar categoria..."}</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* 2) Subcategoria */}
              <div style={{ marginTop: 8 }}>
                <div className="label" style={{ marginBottom: 8 }}>Subcategoria</div>
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
                  <option value="">{selCategoria ? "Selecionar subcategoria..." : "Selecione a categoria"}</option>
                  {subcatsDaSelecionada.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* 3) Itens (multi) + FALLBACK quando não houver itens */}
              <div style={{ marginTop: 8 }}>
                <div className="label" style={{ marginBottom: 8 }}>Itens da subcategoria selecionada</div>

                {/* Quando existem itens na taxonomia */}
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
                            {checked ? <CheckSquare size={16}/> : <Square size={16}/>} {i}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* FALLBACK: não há 3º nível na taxonomia */}
                {selSubcat && itensDaSubSelecionada.length === 0 && (
                  <div
                    className="rounded-lg border p-3"
                    style={{ borderColor: "#e6ebf2", background: "#f9fbff" }}
                  >
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginBottom: 8 }}>
                      Esta subcategoria não possui itens cadastrados. Você pode:
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          className="input"
                          placeholder="Criar item manual (ex.: Mandíbula 110x750)"
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

                      {/* Linha de seleção atual e botão confirmar */}
                      {selItens.length > 0 && (
                        <div className="flex items-center justify-between mt-2">
                          <div style={{ fontSize: 13, color: "#334155" }}>
                            Selecionados: <b>{selItens.join(", ")}</b>
                          </div>
                          <button
                            type="button"
                            className="btn-sec"
                            onClick={addTripletsSelecionados}
                          >
                            + Adicionar selecionados
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Agrupamento por categoria → subcategoria, mostrando pares e itens */}
              {selectedCategorias.length > 0 && (
                <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                  {selectedCategorias.map((cat) => {
                    const paresDaCat = form.categoriasAtuacaoPairs.filter(p => p.categoria === cat);
                    const itensDaCat = (form.categoriasAtuacaoTriplets || []).filter(t => t.categoria === cat);

                    return (
                      <div key={cat} style={{ border: "1px solid #e6edf6", borderRadius: 12, padding: 10, background: "#f8fbff" }}>
                        <div style={{ fontWeight: 900, color: "#023047", marginBottom: 6, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                          {cat}
                          <span style={{ color: "#2563eb", fontWeight: 800, fontSize: 12 }}>
                            subcats: {subcatsCountByCategoria.get(cat) || 0}
                          </span>
                          <span style={{ color: "#059669", fontWeight: 800, fontSize: 12 }}>
                            itens: {itensCountByCategoria.get(cat) || 0}
                          </span>
                        </div>

                        {/* Chips de subcategorias (pares legado) */}
                        {paresDaCat.length > 0 && (
                          <>
                            <div style={{ fontSize: 12, color: "#334155", margin: "4px 0 6px" }}>Subcategorias</div>
                            <div className="chips">
                              {paresDaCat.map((p, idx) => (
                                p.subcategoria ? (
                                  <span key={`${p.categoria}__${p.subcategoria}__${idx}`} className="chip">
                                    <Tag size={14} /> {p.subcategoria}
                                    <button type="button" onClick={() => removeParCategoria(p)}>×</button>
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
                                        <button type="button" onClick={() => removeTriplet({ categoria: cat, subcategoria: sub, item })}>×</button>
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

              {categoriasLocked ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", color: "#9a3412" }}>
                  <span style={{ fontWeight: 800 }}>
                    <Lock size={12} style={{ display: "inline", marginRight: 6 }} />
                    Conjunto de CATEGORIAS travado (subcategorias/itens liberados)
                  </span>
                  <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
                    <HelpCircle size={14} /> Pedir alteração das CATEGORIAS
                  </button>
                </div>
              ) : selectedCategoriasSet.size >= MAX_CATEGORIAS ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  Você atingiu <b>{MAX_CATEGORIAS}/{MAX_CATEGORIAS}</b> categorias. A partir de agora, selecione apenas <b>subcategorias</b> e <b>itens</b> dessas categorias.
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  Ao salvar com <b>{MAX_CATEGORIAS} categorias</b>, o conjunto de categorias ficará travado (subcategorias/itens continuam livres).
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cobertura */}
        <div className="card">
          <div className="card-title">Cobertura / UFs Atendidas</div>
          <label className="checkbox" style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={form.atendeBrasil} onChange={() => toggleUfAtendida("BRASIL")} />
            <span>Atendo o Brasil inteiro</span>
          </label>

          {!form.atendeBrasil && (
            <>
              <div className="label">Selecione UFs</div>
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
    >
      {uf}
    </button>
  );
})}

              </div>
            </>
          )}
        </div>

        {/* Portfólio — Imagens + PDF */}
        <div className="card">
          <div className="card-title">Portfólio (Imagens + PDF)</div>

          <div
            className="rounded-2xl border"
            style={{
              background: "linear-gradient(180deg,#f8fbff, #ffffff)",
              borderColor: "#e6ebf2",
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-slate-700" />
              <h3 className="text-slate-800 font-black tracking-tight">Arquivos do portfólio</h3>
            </div>

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
                  <Tag className="w-4 h-4 text-sky-700" />
                  <strong className="text-[#0f172a]">Imagens (até 12)</strong>
                </div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-dashed p-3">
                    <ImageUploader
                      imagens={form.portfolioImagens}
                      setImagens={(arr: string[]) => setField("portfolioImagens", arr)}
                      max={12}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Envie JPG/PNG. Dica: priorize trabalhos finalizados, antes/depois, certificados etc.
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
                  <strong className="text-[#0f172a]">PDF do portfólio — opcional</strong>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-dashed p-3">
                    <PDFUploader
                      initialUrl={pdfUrl}
                      onUploaded={(url: string) => {
                        setPdfUrl(url);
                      }}
                    />
                  </div>

                  {pdfUrl ? (
                    <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                      <DrivePDFViewer
                        fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`}
                        height={300}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Anexe seu portfólio consolidado, certificações ou catálogos (até 8MB).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens + Salvar */}
        {msg && (
          <div
            style={{
              background: msg.toLowerCase().includes("sucesso") ? "#f7fafc" : "#fff7f7",
              color: msg.toLowerCase().includes("sucesso") ? "#16a34a" : "#b91c1c",
              border: `1.5px solid ${msg.toLowerCase().includes("sucesso") ? "#c3f3d5" : "#ffdada"}`,
              padding: "12px",
              borderRadius: 12,
              textAlign: "center",
              fontWeight: 800,
              marginTop: -6
            }}
          >
            {msg}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-gradient" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </form>

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
        .btn-sec { background: #f7f9fc; color: #2563eb; border: 1px solid #e0ecff; font-weight: 800; border-radius: 10px; padding: 10px 14px; }
        .btn-gradient { background: linear-gradient(90deg,#fb8500,#fb8500); color: #fff; font-weight: 900; border: none; border-radius: 14px; padding: 14px 26px; font-size: 1.08rem; box-shadow: 0 4px 18px #fb850033; }
        .lock-banner { display: flex; align-items: center; gap: 8px; background: #fff7ed; border: 1px solid #ffedd5; color: #9a3412; padding: 10px 12px; border-radius: 12px; margin-bottom: 16px; font-weight: 800; }
        .subcat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .subcat-pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid; border-radius: 10px; padding: 8px 10px; font-weight: 800; }
        .searchbox { display:flex; align-items:center; gap:8px; border:1.6px solid #e5e7eb; border-radius:10px; background:#fff; padding:8px 10px; margin-bottom:8px; }
        .searchbox input { flex:1; border:none; outline:none; font-size:14px; }
        .searchbox button { border:none; background:transparent; cursor:pointer; color:#64748b; }
        @media (max-width: 650px) {
          .card { padding: 18px 14px; border-radius: 14px; }
          .subcat-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}

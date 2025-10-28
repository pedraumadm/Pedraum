// app/perfil/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { db, auth } from "@/firebaseConfig";
import { doc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import ImageUploader from "@/components/ImageUploader";
import {
  ChevronLeft,
  Loader,
  Tag,
  HelpCircle,
  Upload,
  FileText,
  Lock,
  Plus,
  Trash2,
  Check,
  Edit3,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/** ==== PDF (SSR desativado para evitar erro no Next) ==== */
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false }) as any;
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false }) as any;

/** =========================
 *  Constantes auxiliares
 *  ========================= */
const SUPPORT_WHATSAPP = "5531990903613";
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
const UFS_SET = new Set<string>(UFS);

/** ====== Tipos novos (SEM subcategoria) ====== */
type OfertaBasica = { ativo: boolean; obs: string };
export type AtuacaoBasicaPorCategoria = {
  categoria: string;           // ex.: "Britagem"
  vendaProdutos: OfertaBasica; // "Vendo produtos para <categoria>"
  vendaPecas: OfertaBasica;    // "Vendo peças"
  servicos: OfertaBasica;      // "Presto serviços"
};

type AgendaDia = { ativo: boolean; das: string; ate: string };

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

  /** NOVO: estrutura única de atuação por categoria (sem subnível) */
  atuacaoBasica: AtuacaoBasicaPorCategoria[];

  /** Campos legados preservados para compatibilidade (não usados) */
  categoriasAtuacao?: string[];
  categoriasAtuacaoPairs?: any[];
  categoriasAtuacaoTriplets?: any[];

  categoriasLocked?: boolean; // mantido para compatibilidade visual
  categoriasLockedAt?: any;

  atendeBrasil: boolean;
  ufsAtendidas: string[];
  agenda: Record<string, AgendaDia>;
  portfolioImagens: string[];
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

/* ======================= INTELIGÊNCIA DE LINGUAGEM ======================= */
/** Dicionário opcional por categoria para afinar gramática/cópia */
type LinguaCat = {
  visivelPlural?: string;      // “britadores”
  visivelSingular?: string;    // “britador” (reservado p/ futuros usos)
  prepProdutos?: string;       // "", "de", "para"...
  prepPecas?: string;          // "para" (padrão)
  prepServicos?: string;       // "em" (padrão)
};

/** Adicione exceções aqui quando necessário */
const LINGUAGEM: Record<string, LinguaCat> = {
  Britadores: { visivelPlural: "britadores", prepProdutos: "", prepPecas: "para", prepServicos: "em" },
  Transportadores: { visivelPlural: "transportadores", prepProdutos: "", prepPecas: "para", prepServicos: "em" },
  Peneiramento: { visivelPlural: "peneiras", prepProdutos: "", prepPecas: "para", prepServicos: "em" },
  Concreto: { visivelPlural: "equipamentos de concreto", prepProdutos: "de", prepPecas: "para", prepServicos: "em" },
  // ...inclua outras categorias específicas quando quiser refinar a frase
};

/** Fallbacks (aplicados a qualquer categoria não listada no dicionário) */
function toPluralVisivel(cat: string) {
  // fallback simples: usa o nome tal como veio, em minúsculas
  return (cat || "").trim().toLowerCase();
}
function prepProdutosPadrao() { return ""; }
function prepPecasPadrao() { return "para"; }
function prepServicosPadrao() { return "em"; }

/** Geradores de rótulos e placeholders (usados no editor e nos chips) */
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
/* ================================================================ */

export default function PerfilPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // === Limite de categorias (padrão 3, override via Firestore: usuarios/{uid}.categoryLimit)
  const [categoryLimit, setCategoryLimit] = useState<number>(3);

  // Taxonomia: vamos usar apenas a lista de categorias (nível 1)
  const { categorias, loading: taxLoading } = useTaxonomia();
  const nomesCategoriasTodos = useMemo(() => categorias.map((c) => c.nome), [categorias]);

  // PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // cidades por UF
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // ====== Editor local da categoria selecionada (SEM sub) ======
  const [selCategoria, setSelCategoria] = useState("");
  const [vendaProdutosAtivo, setVendaProdutosAtivo] = useState(false);
  const [vendaProdutosObs, setVendaProdutosObs] = useState("");
  const [vendaPecasAtivo, setVendaPecasAtivo] = useState(false);
  const [vendaPecasObs, setVendaPecasObs] = useState("");
  const [servicosAtivo, setServicosAtivo] = useState(false);
  const [servicosObs, setServicosObs] = useState("");

  // Progressive disclosure
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // lock de categorias (mantido só para UI; sem travas funcionais)
  const [categoriasLocked, setCategoriasLocked] = useState<boolean>(false);

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

    atuacaoBasica: [],

    categoriasAtuacao: [],
    categoriasAtuacaoPairs: [],
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
    leadPreferencias: {
      categorias: [],
      ufs: [],
      ticketMin: null,
      ticketMax: null,
    },
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

        // === Limite de categorias vindo do Firestore (fallback 3)
        setCategoryLimit(Number(data?.categoryLimit ?? 3));

        const atuacaoBasica: AtuacaoBasicaPorCategoria[] = Array.isArray(data.atuacaoBasica)
          ? data.atuacaoBasica
          : [];

        setCategoriasLocked(locked);
        setForm((prev) => ({
          ...prev,
          nome: data.nome || "",
          email: data.email || user.email || "",
          telefone: data.whatsappE164
            ? maskBRFrom55(data.whatsappE164)
            : data.whatsapp
            ? maskBRFrom55(data.whatsapp)
            : data.telefone || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cpf_cnpj: data.cpf_cnpj || "",
          bio: data.bio || "",
          avatar: data.avatar || "",
          tipo: data.tipo || prev.tipo,
          prestaServicos: !!data.prestaServicos,
          vendeProdutos: !!data.vendeProdutos,

          atuacaoBasica,

          // legados apenas para manter consistência (não usados)
          categoriasAtuacao: Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [],
          categoriasAtuacaoPairs: Array.isArray(data.categoriasAtuacaoPairs)
            ? data.categoriasAtuacaoPairs
            : [],
          categoriasAtuacaoTriplets: Array.isArray(data.categoriasAtuacaoTriplets)
            ? data.categoriasAtuacaoTriplets
            : [],

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
          { cache: "no-store" },
        );
        const data = (await res.json()) as Array<{ nome: string }>;
        if (abort) return;

        const nomes = data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));
        setCidades(nomes);
      } catch {
        if (!abort) setCidades([]);
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }

    fetchCidades(form.estado || "");
    return () => {
      abort = true;
    };
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

  function pedirAlteracaoViaWhatsApp() {
    if (!userId) return;
    const texto = [
      "Olá, equipe de suporte! Quero alterar minhas CATEGORIAS de atuação.",
      "",
      `• UID: ${userId}`,
      `• Nome: ${form.nome || "-"}`,
      `• E-mail: ${form.email || "-"}`,
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

    const val = String(uf).trim().toUpperCase();
    if (!UFS_SET.has(val)) return;

    if (form.atendeBrasil) {
      setForm((f) => ({ ...f, atendeBrasil: false, ufsAtendidas: [val] }));
      return;
    }

    const has = form.ufsAtendidas.includes(val);
    setForm((f) => ({
      ...f,
      ufsAtendidas: has ? f.ufsAtendidas.filter((u) => u !== val) : [...f.ufsAtendidas, val],
    }));
  }

  /** ============== Editor da categoria (novo) ============== */
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
  }

  // === Gate de inclusão: permite atualizar uma existente mesmo no limite; bloqueia NOVA quando já atingiu
  function addOuAtualizaCategoria() {
    const categoria = selCategoria.trim();
    if (!categoria) {
      setMsg("Selecione uma categoria.");
      return;
    }

    // validações de descrição quando ativo
    if (vendaProdutosAtivo && !vendaProdutosObs.trim()) {
      setMsg("Descreva o que vende em 'Vendo produtos'.");
      return;
    }
    if (vendaPecasAtivo && !vendaPecasObs.trim()) {
      setMsg("Descreva quais peças você vende.");
      return;
    }
    if (servicosAtivo && !servicosObs.trim()) {
      setMsg("Descreva quais serviços você presta.");
      return;
    }

    const novo: AtuacaoBasicaPorCategoria = {
      categoria,
      vendaProdutos: { ativo: vendaProdutosAtivo, obs: vendaProdutosObs.trim() },
      vendaPecas: { ativo: vendaPecasAtivo, obs: vendaPecasObs.trim() },
      servicos: { ativo: servicosAtivo, obs: servicosObs.trim() },
    };

    setForm((f) => {
      const existe = f.atuacaoBasica.find((a) => a.categoria === categoria);
      const jaNoLimite = f.atuacaoBasica.length >= categoryLimit;

      if (!existe && jaNoLimite) {
        setMsg(`Você atingiu o limite de ${categoryLimit} categoria(s).`);
        return f; // não altera
      }

      if (!existe) {
        setMsg("Categoria adicionada.");
        setTimeout(() => setMsg(""), 2500);
        resetEditorCategoria();
        setEditorOpen(false);
        return { ...f, atuacaoBasica: [...f.atuacaoBasica, novo] };
      }

      // atualização de existente é sempre permitida
      setMsg("Categoria atualizada.");
      setTimeout(() => setMsg(""), 2500);
      resetEditorCategoria();
      setEditorOpen(false);
      return {
        ...f,
        atuacaoBasica: f.atuacaoBasica.map((a) => (a.categoria === categoria ? novo : a)),
      };
    });
  }

  function removerCategoria(categoria: string) {
    setForm((f) => ({
      ...f,
      atuacaoBasica: f.atuacaoBasica.filter((a) => a.categoria !== categoria),
    }));
    if (selCategoria === categoria) {
      resetEditorCategoria();
      setEditorOpen(false);
    }
  }

  /* ================= Salvar ================= */
  async function salvar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userId) return;

    setSaving(true);
    setMsg("");

    try {
      // Validação leve
      for (const a of form.atuacaoBasica) {
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

      // Campos derivados simples para pesquisa: lista de categorias distintas
      const categoriasDistintas = Array.from(
        new Set(form.atuacaoBasica.map((a) => a.categoria).filter(Boolean)),
      );

      // campos de busca auxiliares
      const categoriesAll = categoriasDistintas;
      const ufsSearch = buildUfsSearch(form.atendeBrasil, form.ufsAtendidas);

      // telefone
      const wDigits55 = form.telefone ? toDigits55FromFree(form.telefone) : "";
      const wE164 = wDigits55 ? `+${wDigits55}` : "";

      await updateDoc(doc(db, "usuarios", userId), {
        nome: form.nome,
        telefone: form.telefone || "",
        whatsapp: wDigits55 || "",
        whatsappE164: wE164 || "",
        cidade: form.estado === "BRASIL" ? "" : form.cidade || "",
        estado: form.estado || "",
        cpf_cnpj: form.cpf_cnpj || "",
        bio: form.bio || "",
        avatar: form.avatar || "",

        prestaServicos: form.prestaServicos,
        vendeProdutos: form.vendeProdutos,

        /** NOVO principal */
        atuacaoBasica: form.atuacaoBasica,

        /** compatibilidade mínima */
        categoriasAtuacao: categoriasDistintas,
        categorias: categoriasDistintas,

        /** buscas auxiliares */
        categoriesAll,
        ufsSearch,

        atendeBrasil: form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil
          ? ["BRASIL"]
          : Array.from(new Set((form.ufsAtendidas || []).map((u) => String(u).trim().toUpperCase()))),

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

      setMsg("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      setMsg("Erro ao salvar alterações.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  function buildUfsSearch(atendeBrasil: boolean, ufsAtendidas: string[] = []) {
    const arr = (ufsAtendidas || []).map((u) => String(u).trim().toUpperCase());
    if (atendeBrasil && !arr.includes("BRASIL")) arr.push("BRASIL");
    return Array.from(new Set(arr));
  }

  if (loading) {
    return (
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "50px 2vw 70px 2vw" }}>
        <div style={{ textAlign: "center", color: "#219EBC", fontWeight: 800 }}>
          <Loader className="animate-spin" /> Carregando perfil...
        </div>
      </section>
    );
  }

  const categoriasSelecionadas = form.atuacaoBasica.map((a) => a.categoria);
  const atingiuLimite = form.atuacaoBasica.length >= categoryLimit;
  const selecionadaJaExiste = !!form.atuacaoBasica.find((a) => a.categoria === selCategoria);

  return (
    <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 2vw 70px 2vw" }}>
      <Link
        href="/painel"
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
        <ChevronLeft size={18} /> Voltar ao Painel
      </Link>

      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1px",
          marginBottom: 10,
        }}
      >
        Meu Perfil
      </h1>

      {categoriasLocked && (
        <div className="lock-banner">
          <Lock size={16} />
          Suas <b>CATEGORIAS</b> estão travadas. (Apenas um aviso visual; seleção não é obrigatória.)
          <button type="button" className="btn-sec" onClick={pedirAlteracaoViaWhatsApp}>
            <HelpCircle size={14} /> Pedir alteração ao suporte
          </button>
        </div>
      )}

      {/* Contador de limite sempre visível */}
      <div
        style={{
          marginBottom: 14,
          fontSize: 13,
          color: "#334155",
          fontWeight: 800,
        }}
      >
        Categorias: <b>{form.atuacaoBasica.length}/{categoryLimit}</b>
        {atingiuLimite && (
          <span style={{ color: "#b91c1c", marginLeft: 8 }}>
            (Limite atingido — peça ao suporte/adm para aumentar)
          </span>
        )}
      </div>

      <form onSubmit={salvar} className="grid gap-16">
        {/* Identidade */}
        <div className="card">
          <div className="card-title">Identidade e Contato</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <div className="label">Foto do Perfil</div>
              <ImageUploader
                imagens={avatarLista}
                setImagens={(arr) => setField("avatar", arr[0] || "")}
                max={1}
              />
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                Use uma imagem quadrada para melhor resultado.
              </div>
            </div>

            <div className="grid gap-4">
              <label className="label">Nome</label>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setField("nome", e.target.value)}
                required
              />

              <label className="label">E-mail</label>
              <input className="input" value={form.email} disabled />

              <label className="label">WhatsApp</label>
              <input
                className="input"
                value={form.telefone || ""}
                onChange={(e) => setField("telefone", e.target.value)}
                placeholder="(xx) xxxxx-xxxx"
              />

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
                      {!form.estado
                        ? "Selecione o estado"
                        : form.estado === "BRASIL"
                        ? "—"
                        : carregandoCidades
                        ? "Carregando..."
                        : "Selecione a cidade"}
                    </option>
                    {cidades.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="label">CPF ou CNPJ</label>
              <input
                className="input"
                value={form.cpf_cnpj || ""}
                onChange={(e) => setField("cpf_cnpj", e.target.value)}
                placeholder="Somente números"
              />

              <label className="label">Bio / Sobre você</label>
              <textarea
                className="input"
                rows={3}
                value={form.bio || ""}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Conte um pouco sobre você, sua empresa ou serviços"
              />
            </div>
          </div>
        </div>

        {/* Atuação (NOVA LÓGICA + rótulos dinâmicos) */}
        <div className="card">
          <div className="card-title">Atuação por Categoria </div>

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

              {/* Aviso quando atingir limite e a seleção atual não existir */}
              {atingiuLimite && selCategoria && !selecionadaJaExiste && (
                <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6, fontWeight: 800 }}>
                  Você já tem {categoryLimit} categoria(s). Remova alguma ou peça aumento ao suporte/adm.
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
                    {/* Header compacto do editor */}
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

                    {/* Corpo do editor */}
                    {editorOpen && (
                      <div className="p-4">
                        <div className="label" style={{ marginBottom: 8 }}>
                          O que você faz nessa categoria?
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
                            onClick={addOuAtualizaCategoria}
                            disabled={!selCategoria || (atingiuLimite && !selecionadaJaExiste)}
                            title={
                              atingiuLimite && !selecionadaJaExiste
                                ? `Limite de ${categoryLimit} atingido`
                                : "Adicionar/Atualizar"
                            }
                          >
                            <Plus size={14} /> {selecionadaJaExiste ? "Atualizar categoria" : "Adicionar categoria"}
                          </button>
                          <button
                            type="button"
                            className="btn-sec"
                            onClick={() => {
                              resetEditorCategoria();
                              setEditorOpen(false);
                            }}
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

            {/* Lista de categorias adicionadas */}
            <div>
              <div className="label">Categorias adicionadas</div>
              {form.atuacaoBasica.length === 0 ? (
                <div className="rounded-xl border p-4" style={{ borderColor: "#e6ebf2", background: "#fff" }}>
                  Nenhuma categoria adicionada ainda. (Opcional)
                </div>
              ) : (
                <div className="grid gap-3">
                  {form.atuacaoBasica.map((a) => {
                    return (
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
                              onClick={() => {
                                carregarEditorDeUmaCategoria(a);
                                setEditorOpen(true);
                                setTimeout(
                                  () => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                                  0,
                                );
                              }}
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              type="button"
                              className="btn-sec"
                              title="Remover"
                              onClick={() => removerCategoria(a.categoria)}
                            >
                              <Trash2 size={14} /> Remover
                            </button>
                          </div>
                        </div>

                        {/* Chips com rótulos dinâmicos */}
                        <div className="chips" style={{ marginTop: 8 }}>
                          <span className="chip" style={{ opacity: a.vendaProdutos.ativo ? 1 : 0.5 }}>
                            <Check size={14} /> {labelProdutos(a.categoria)}{" "}
                            {a.vendaProdutos.ativo ? "— " + a.vendaProdutos.obs : "(não aplica)"}
                          </span>
                          <span className="chip" style={{ opacity: a.vendaPecas.ativo ? 1 : 0.5 }}>
                            <Check size={14} /> {labelPecas(a.categoria)}{" "}
                            {a.vendaPecas.ativo ? "— " + a.vendaPecas.obs : "(não aplica)"}
                          </span>
                          <span className="chip" style={{ opacity: a.servicos.ativo ? 1 : 0.5 }}>
                            <Check size={14} /> {labelServicos(a.categoria)}{" "}
                            {a.servicos.ativo ? "— " + a.servicos.obs : "(não aplica)"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {categoriasSelecionadas.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
                  <b>{categoriasSelecionadas.length}</b> categoria(s) selecionada(s).
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
            <b>Dica:</b> você pode adicionar várias categorias (limite atual: {categoryLimit}). Se marcar uma opção,
            descreva o que faz.
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
              marginTop: -6,
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
        .card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 4px 28px #0001;
          padding: 24px 22px;
        }
        .card-title {
          font-weight: 900;
          color: #023047;
          font-size: 1.2rem;
          margin-bottom: 14px;
        }
        .label {
          font-weight: 800;
          color: #023047;
          margin-bottom: 6px;
          display: block;
        }
        .input {
          width: 100%;
          border: 1.6px solid #e5e7eb;
          border-radius: 10px;
          background: #f8fafc;
          padding: 11px 12px;
          font-size: 16px;
          color: #222;
          outline: none;
        }
        .checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #023047;
        }
        .chips {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f3f7ff;
          color: #2563eb;
          border: 1px solid #e0ecff;
          padding: 6px 10px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .chip button {
          background: none;
          border: none;
          color: #999;
          font-weight: 900;
          cursor: pointer;
        }
        .pill {
          border: 1px solid #e6e9ef;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .btn-sec {
          background: #f7f9fc;
          color: #2563eb;
          border: 1px solid #e0ecff;
          font-weight: 800;
          border-radius: 10px;
          padding: 10px 14px;
        }
        .btn-gradient {
          background: linear-gradient(90deg, #fb8500, #fb8500);
          color: #fff;
          font-weight: 900;
          border: none;
          border-radius: 14px;
          padding: 14px 26px;
          font-size: 1.08rem;
          box-shadow: 0 4px 18px #fb850033;
        }
        .lock-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff7ed;
          border: 1px solid #ffedd5;
          color: #9a3412;
          padding: 10px 12px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-weight: 800;
        }
        @media (max-width: 650px) {
          .card {
            padding: 18px 14px;
            border-radius: 14px;
          }
        }
      `}</style>
    </section>
  );
}

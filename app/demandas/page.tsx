"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  orderBy,
  limit,
  startAfter,
  query,
  DocumentData,
  QueryDocumentSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  ClipboardList,
  MapPin,
  Calendar,
  Plus,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Phone,
  Mail,
  User2,
  Crown,
  Compass,
  ArrowLeft,
  Info,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";

declare global {
  interface Window {
    pedraumTour?: {
      expose: (key: string, el: HTMLElement | null) => void;
      start: (flow: string) => void;
    };
  }
}

/* ================== Utils ================== */
function toDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function resumo(str: string = "", len = 120) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}
function fmtData(ts?: any) {
  const d = toDate(ts);
  return d ? d.toLocaleDateString("pt-BR") : "-";
}
function strEq(a?: any, b?: string) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === b.toLowerCase();
}
function isFechada(d: any) {
  const s = (d?.status || "").toString().toLowerCase();
  return s === "fechada" || !!d?.fechada;
}
function getContatoFromDemanda(d: any) {
  const nome =
    d?.nomeContato || d?.contatoNome || d?.solicitante || d?.nome || null;
  const whatsapp = d?.whatsapp || d?.telefone || d?.fone || null;
  const email = d?.email || d?.contatoEmail || null;
  return { nome, whatsapp, email };
}

/* ==== Normalização de status ==== */
function normStatus(v: any) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}
function isPendente(d: any) {
  const s = normStatus(d?.status);
  const pend = new Set([
    "pending",
    "pendente",
    "em_analise",
    "em_análise",
    "em_analise_interna",
    "aguardando",
    "review",
    "analise",
    "análise",
    "aprovacao_pendente",
  ]);
  return pend.has(s) || d?.pendente === true || (d?.aprovada === false && d?.rejeitada !== true);
}
function isRejeitada(d: any) {
  const s = normStatus(d?.status);
  const rej = new Set([
    "rejected",
    "rejeitada",
    "rejeitado",
    "recusada",
    "recusado",
    "negada",
    "negado",
    "bloqueada",
    "bloqueado",
    "nao_aprovada",
    "não_aprovada",
  ]);
  return rej.has(s) || d?.rejeitada === true || d?.aprovada === false;
}

/* ================== Categorias (UX) ================== */
const CATEGORIAS_DEMANDAS = [
  "Equipamentos de Perfuração e Demolição",
  "Equipamentos de Carregamento e Transporte",
  "Britagem e Classificação",
  "Beneficiamento e Processamento Mineral",
  "Peças e Componentes Industriais",
  "Desgaste e Revestimento",
  "Automação, Elétrica e Controle",
  "Lubrificação e Produtos Químicos",
  "Equipamentos Auxiliares e Ferramentas",
  "EPIs (Equipamentos de Proteção Individual)",
  "Instrumentos de Medição e Controle",
  "Manutenção e Serviços Industriais",
  "Veículos e Pneus",
  "Outros",
] as const;

/* ================== Tipos ================== */
type SortKey = "recentes" | "views_desc";

/* ================== WhatsApp ================== */
const WHATSAPP_PEDRAUM = "5531990903613";
const WHATSAPP_MSG_PADRAO =
  "Olá! Quero ser patrocinador no Pedraum. Vim pela vitrine de demandas.";

export default function VitrineDemandas() {
  /* ===== Auth / Perfil ===== */
  const [uid, setUid] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const isPatrocinador = detectPatrocinador(perfil);

  /* ===== Tour: primeiro card visível ===== */
  const firstCardRef = useRef<HTMLDivElement | null>(null);

  /* ===== Exploração ===== */
  const [explorarOutras, setExplorarOutras] = useState(false);

  /* ===== Link do WhatsApp (com origem) ===== */
  const whatsHref = useMemo(() => {
    const origem =
      typeof window !== "undefined" ? ` Origem: ${window.location.href}` : "";
    const txt = encodeURIComponent(`${WHATSAPP_MSG_PADRAO}${origem}`);
    return `https://wa.me/${WHATSAPP_PEDRAUM}?text=${txt}`;
  }, []);

  /* ===== Categorias do usuário ===== */
  const userCats: string[] = useMemo(() => {
    if (!perfil) return [];
    type Par = { categoria?: string };
    const pairs: Par[] = Array.isArray(perfil.categoriasAtuacaoPairs)
      ? (perfil.categoriasAtuacaoPairs as Par[])
      : [];
    const legacy: unknown[] = Array.isArray(perfil.categoriasAtuacao)
      ? (perfil.categoriasAtuacao as unknown[])
      : [];
    const notEmptyString = (v: unknown): v is string =>
      typeof v === "string" && v.trim().length > 0;

    if (pairs.length) {
      const cats = pairs.map((p) => p?.categoria ?? "").filter(notEmptyString);
      return Array.from(new Set<string>(cats)).slice(0, 10);
    }
    const legacyCats = legacy.filter(notEmptyString);
    return Array.from(new Set<string>(legacyCats)).slice(0, 10);
  }, [perfil]);

  /* ===== Match e contato ===== */
  function demandaCategoryMatch(d: any, myCats: string[]) {
    if (!myCats?.length) return false;
    const cat = (d?.categoria || "").trim();
    const cats = Array.isArray(d?.categorias) ? d.categorias : [];
    const byString = !!cat && myCats.includes(cat);
    const byArray =
      !!cats?.length && cats.some((c: string) => myCats.includes(String(c)));
    return byString || byArray;
  }
  function canSeeContacts(d: any) {
    if (isFechada(d)) return false;
    if (!isPatrocinador) return false;
    return demandaCategoryMatch(d, userCats);
  }
  function detectPatrocinador(p: any): boolean {
    if (!p || typeof p !== "object") return false;
    if (p.isPatrocinador === true) return true;
    if (p.patrocinador === true) return true;
    if (p.patrocinadorAtivo === true) return true;
    if (strEq(p.role, "patrocinador")) return true;
    if (strEq(p.plano, "patrocinador")) return true;
    if (p.patrocinador && typeof p.patrocinador === "object") {
      if (p.patrocinador.ativo === true) return true;
      if (strEq(p.patrocinador.status, "ativo")) return true;
      if (strEq(p.patrocinador.plano, "patrocinador")) return true;
    }
    if (p.financeiro && typeof p.financeiro === "object") {
      if (strEq(p.financeiro.plano, "patrocinador")) return true;
      if (
        strEq(p.financeiro.status, "ativo") &&
        strEq(p.financeiro.tipo, "patrocinador")
      )
        return true;
    }
    return false;
  }

  /* ===== Lista e paginação ===== */
  const [demandas, setDemandas] = useState<any[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const pageSize = 24;
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const finishedRef = useRef<boolean>(false);

  /* ===== Filtros UI ===== */
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [somenteAbertas, setSomenteAbertas] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("recentes");

  /* ===== Busca (debounce) ===== */
  const [buscaRaw, setBuscaRaw] = useState("");
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaRaw.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [buscaRaw]);

  /* ================== Auth & Perfil ================== */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setUid(user ? user.uid : null);
        if (!user?.uid) {
          setPerfil(null);
          return;
        }
        const refUsuarios = doc(db, "usuarios", user.uid);
        const refUsers = doc(db, "users", user.uid);
        let snap = await getDoc(refUsuarios);
        if (!snap.exists()) snap = await getDoc(refUsers);
        if (snap.exists()) setPerfil({ id: snap.id, ...snap.data() });
        else setPerfil(null);
      } catch (e) {
        console.error("Erro ao carregar perfil:", e);
        setPerfil(null);
      }
    });
    return () => unsub();
  }, []);

  /* ================== Carregamento inicial ================== */
  useEffect(() => {
    (async () => {
      setCarregandoLista(true);
      setDemandas([]);
      lastDocRef.current = null;
      finishedRef.current = false;

      const qRef = query(
        collection(db, "demandas"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      const snap = await getDocs(qRef);

      const list: any[] = [];
      let last: QueryDocumentSnapshot<DocumentData> | null = null;
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
        last = doc;
      });

      lastDocRef.current = last;
      if (!last || snap.empty) finishedRef.current = true;

      setDemandas(list);
      setCarregandoLista(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================== Carregar mais ================== */
  async function carregarMais() {
    if (finishedRef.current || !lastDocRef.current) return;
    setCarregandoMais(true);

    const qRef = query(
      collection(db, "demandas"),
      orderBy("createdAt", "desc"),
      startAfter(lastDocRef.current),
      limit(pageSize)
    );
    const snap = await getDocs(qRef);

    const pageList: any[] = [];
    let last: QueryDocumentSnapshot<DocumentData> | null = null;
    snap.forEach((doc) => {
      pageList.push({ id: doc.id, ...doc.data() });
      last = doc;
    });

    if (!last || snap.empty) finishedRef.current = true;
    lastDocRef.current = last;

    setDemandas((prev) => [...prev, ...pageList]);
    setCarregandoMais(false);
  }

  /* ================== Base filtrada (UI) ================== */
  const demandasFiltradasBase = useMemo(() => {
    let arr = demandas.filter((d) => {
      if (isPendente(d) || isRejeitada(d)) return false;

      if (categoria && d.categoria !== categoria) return false;
      if (estado && d.estado !== estado) return false;
      if (cidade && d.cidade !== cidade) return false;

      if (busca) {
        const alvo =
          (d.titulo || "") +
          " " +
          (d.descricao || "") +
          " " +
          (d.categoria || "") +
          " " +
          (d.cidade || "") +
          " " +
          (d.estado || "");
        if (!alvo.toLowerCase().includes(busca)) return false;
      }

      if (somenteAbertas && isFechada(d)) return false;

      return true;
    });

    if (sortKey === "recentes") {
      arr.sort((a, b) => {
        const da = toDate(a.createdAt)?.getTime() ?? 0;
        const db = toDate(b.createdAt)?.getTime() ?? 0;
        return db - da;
      });
    } else if (sortKey === "views_desc") {
      arr.sort((a, b) => (b.visualizacoes ?? 0) - (a.visualizacoes ?? 0));
    }

    if (!somenteAbertas) {
      const abertas = arr.filter((x) => !isFechada(x));
      const fechadas = arr.filter((x) => isFechada(x));
      arr = [...abertas, ...fechadas];
    }

    return arr;
  }, [demandas, categoria, estado, cidade, busca, sortKey, somenteAbertas]);

  /* ================== Conjunto visível (filtro duro do patrocinador) ================== */
  const demandasVisiveis = useMemo(() => {
    if (isPatrocinador && !explorarOutras) {
      return demandasFiltradasBase.filter((d) => canSeeContacts(d));
    }
    return demandasFiltradasBase;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandasFiltradasBase, isPatrocinador, explorarOutras, perfil, userCats]);

  /* ================== Opções de CATEGORIA ================== */
  const categoriasTodasCarregadas = useMemo(() => {
    const set = new Set<string>([...CATEGORIAS_DEMANDAS]);
    for (const d of demandas) {
      const cat = (d.categoria || "").trim();
      if (cat) set.add(cat);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );
  }, [demandas]);

  const categoriasLiberadasPatrocinador = useMemo(() => {
    const set = new Set<string>();
    for (const d of demandas) {
      if (canSeeContacts(d)) {
        const cat = (d.categoria || "").trim();
        if (cat) set.add(cat);
      }
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { sensitivity: "base" })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandas, perfil, userCats, isPatrocinador]);

  const categoriasDisponiveis = useMemo(() => {
    if (isPatrocinador && !explorarOutras)
      return categoriasLiberadasPatrocinador;
    return categoriasTodasCarregadas;
  }, [
    isPatrocinador,
    explorarOutras,
    categoriasLiberadasPatrocinador,
    categoriasTodasCarregadas,
  ]);

  useEffect(() => {
    if (categoria && !categoriasDisponiveis.includes(categoria)) {
      setCategoria("");
    }
  }, [categoriasDisponiveis, categoria]);

  /* ================== Estados/Cidades (dinâmicos com base no visível) ================== */
  const estadosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const d of demandasVisiveis) {
      if (d.estado) set.add(d.estado);
    }
    return Array.from(set).sort();
  }, [demandasVisiveis]);

  const cidadesDisponiveis = useMemo(() => {
    if (!estado) return [];
    const set = new Set<string>();
    for (const d of demandasVisiveis) {
      if (d.estado === estado && d.cidade) set.add(d.cidade);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [demandasVisiveis, estado]);

  useEffect(() => {
    if (cidade && !cidadesDisponiveis.includes(cidade)) {
      setCidade("");
    }
  }, [cidadesDisponiveis, cidade]);

  /* ================== Integração leve com tour ================== */
  useEffect(() => {
    // expõe o primeiro card visível
    if (firstCardRef.current) {
      window.pedraumTour?.expose?.("demandas.card.first", firstCardRef.current);
    }
    // inicia via query param ?tour=demandas
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      if (q.get("tour") === "demandas") {
        window.pedraumTour?.start?.("demandas");
      }
    }
  }, [carregandoLista, demandasVisiveis.length]);

  /* ================== UI ================== */
  return (
    <section
      style={{ maxWidth: 1420, margin: "0 auto", padding: "40px 2vw 80px 2vw" }}
    >
      <h1
        style={{
          fontSize: "2.35rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        Vitrine de Demandas
        {isPatrocinador && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#fef3c7",
              color: "#9a6700",
              border: "1px solid #fde68a",
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
            }}
            title="Você é patrocinador — contatos liberados quando a demanda é da sua categoria"
          >
            <Crown size={14} /> Patrocinador ativo
          </span>
        )}
      </h1>

      {/* Banner de exploração */}
      {isPatrocinador && explorarOutras && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "#eef6ff",
            border: "1px solid #dbeafe",
            borderRadius: 12,
            marginBottom: 16,
            color: "#1e3a8a",
            fontWeight: 700,
          }}
        >
          <Info size={18} />
          Explorando outras categorias. Contatos fora da sua categoria
          permanecem bloqueados.
          <button
            type="button"
            onClick={() => setExplorarOutras(false)}
            className="hover:scale-[1.02]"
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #bfdbfe",
              background: "#fff",
              color: "#1e40af",
              fontWeight: 800,
            }}
          >
            <ArrowLeft size={16} />
            Voltar para minhas categorias
          </button>
        </div>
      )}

      {/* Ações topo */}
      <div
        style={{
          display: "flex",
          gap: 14,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Link
          data-tour="demandas.cta-nova-demanda"
          href="/create-demanda"
          className="hover:scale-[1.04] transition"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "13px 30px",
            borderRadius: 17,
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.13rem",
            boxShadow: "0 4px 16px #fb850013",
            textDecoration: "none",
            border: "none",
            outline: "none",
          }}
        >
          <Plus size={22} /> Postar uma Demanda
        </Link>

        {!isPatrocinador && (
          <a
            data-tour="demandas.cta-patrocinador"
            href={whatsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-[1.03] transition"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 22px",
              borderRadius: 14,
              background: "#ecfeff",
              color: "#0ea5e9",
              fontWeight: 800,
              fontSize: "1.02rem",
              border: "1px solid #bae6fd",
              textDecoration: "none",
            }}
            title="Fale no WhatsApp para virar Patrocinador — contatos inclusos"
            data-cta="whatsapp-patrocinador"
          >
            <ShieldCheck size={18} /> Seja Patrocinador (Veja as vantagens)
          </a>
        )}
      </div>

      {/* Filtros */}
      <div
        data-tour="demandas.filtros"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          background: "#fff",
          padding: 17,
          borderRadius: 15,
          boxShadow: "0 2px 10px #0001",
          marginBottom: 16,
        }}
      >
        <input
          data-tour="demandas.filtro-busca"
          aria-label="Buscar"
          className="filtro"
          placeholder="Buscar por palavra-chave"
          value={buscaRaw}
          onChange={(e) => setBuscaRaw(e.target.value)}
          style={{ minWidth: 220 }}
        />

        <select
          data-tour="demandas.filtro-categoria"
          aria-label="Categoria"
          className="filtro"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Categoria</option>
          {categoriasDisponiveis.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          data-tour="demandas.filtro-estado"
          aria-label="Estado"
          className="filtro"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="">Estado</option>
          {estadosDisponiveis.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        <select
          data-tour="demandas.filtro-cidade"
          aria-label="Cidade"
          className="filtro"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          disabled={!estado}
          style={{ opacity: estado ? 1 : 0.6, cursor: estado ? "pointer" : "not-allowed" }}
        >
          <option value="">{estado ? "Cidade" : "Selecione um estado"}</option>
          {cidadesDisponiveis.map((cid) => (
            <option key={cid} value={cid}>
              {cid}
            </option>
          ))}
        </select>

        <select
          data-tour="demandas.filtro-ordenacao"
          aria-label="Ordenação"
          className="filtro"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="recentes">Ordenar: Recentes</option>
          <option value="views_desc">Ordenar: Mais vistos</option>
        </select>

        <button
          data-tour="demandas.filtro-abertas"
          type="button"
          aria-pressed={somenteAbertas}
          onClick={() => setSomenteAbertas((v) => !v)}
          className="filtro"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
            background: somenteAbertas ? "#ecfeff" : "#f7f7fa",
            color: somenteAbertas ? "#0ea5e9" : "#6b7280",
          }}
          title="Mostrar apenas demandas abertas"
        >
          <Filter size={16} />
          {somenteAbertas ? "Somente abertas" : "Abertas e fechadas"}
        </button>

        <button
          data-tour="demandas.filtro-limpar"
          className="filtro"
          type="button"
          style={{ background: "#f7f7fa", fontWeight: 600, color: "#fb8500" }}
          onClick={() => {
            setCategoria("");
            setEstado("");
            setCidade("");
            setBuscaRaw("");
            setSomenteAbertas(false);
            setSortKey("recentes");
          }}
        >
          Limpar filtros
        </button>
      </div>

      {/* ====== GRID WRAPPER (sempre presente para o tour) ====== */}
      <div data-tour="demandas.grid">
        {carregandoLista ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
              gap: "34px",
            }}
          >
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse"
                style={{
                  borderRadius: 22,
                  boxShadow: "0 4px 28px #0001",
                  background: "#f3f6fa",
                  minHeight: 280,
                }}
              />
            ))}
          </div>
        ) : demandasVisiveis.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#3b4555",
              fontWeight: 800,
              fontSize: 19,
              padding: 66,
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 4px 18px #0001",
              marginTop: 6,
            }}
          >
            {isPatrocinador && !explorarOutras ? (
              <>
                <div style={{ fontSize: 22, marginBottom: 8 }}>
                  Não há demandas com contato disponível nas suas categorias por
                  enquanto.
                </div>
                <div style={{ fontWeight: 500, color: "#64748b", marginBottom: 18 }}>
                  Você pode explorar outras oportunidades sem liberar os contatos.
                </div>
                <button
                  type="button"
                  onClick={() => setExplorarOutras(true)}
                  className="hover:scale-[1.03]"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 22px",
                    borderRadius: 14,
                    background: "#FFEDD5",
                    color: "#9a3412",
                    fontWeight: 900,
                    fontSize: "1.02rem",
                    border: "1px solid #fed7aa",
                  }}
                >
                  <Compass size={18} />
                  Explorar outras categorias
                </button>
              </>
            ) : (
              <>
                Nenhuma demanda encontrada.
                <br />
                <span style={{ fontWeight: 400, fontSize: 16 }}>
                  Tente alterar os filtros ou pesquisar outro termo.
                </span>
              </>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
                gap: "34px",
              }}
            >
              {demandasVisiveis.map((item, idx) => {
                const fechada = isFechada(item);
                const contato = getContatoFromDemanda(item);
                const contatoLiberado = canSeeContacts(item);
                const statusStr = normStatus(item?.status);

                const setFirstRef = idx === 0 ? { ref: firstCardRef } : {};

                return (
                  <div
                    {...setFirstRef}
                    data-tour={idx === 0 ? "demandas.card" : undefined}
                    key={item.id}
                    style={{
                      borderRadius: 22,
                      boxShadow: "0 4px 32px #0001",
                      background: "#fff",
                      border: "1.6px solid #f2f3f7",
                      padding: "0 0 18px 0",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 280,
                      position: "relative",
                      overflow: "hidden",
                    }}
                    className="hover:shadow-xl group"
                  >
                    {/* Selo FECHADA */}
                    {fechada && (
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          left: 14,
                          background: "#9ca3af",
                          color: "#fff",
                          fontWeight: 900,
                          fontSize: 12.5,
                          padding: "3px 12px",
                          borderRadius: 10,
                          zIndex: 2,
                          letterSpacing: ".03em",
                        }}
                      >
                        FECHADA
                      </span>
                    )}

                    {/* Chip de status */}
                    {!fechada &&
                      statusStr &&
                      statusStr !== "pending" &&
                      statusStr !== "rejected" && (
                        <span
                          style={{
                            position: "absolute",
                            top: 14,
                            left: 14,
                            background:
                              statusStr === "em_andamento" ? "#E0F2FE" : "#ECFDF5",
                            color: statusStr === "em_andamento" ? "#0369A1" : "#166534",
                            fontWeight: 900,
                            fontSize: 12.5,
                            padding: "3px 12px",
                            borderRadius: 10,
                            zIndex: 2,
                            letterSpacing: ".03em",
                            border: "1px solid #e5e7eb",
                          }}
                          title={`Status: ${String(item.status).toUpperCase()}`}
                        >
                          {String(item.status).toUpperCase()}
                        </span>
                      )}

                    {isPatrocinador && (
                      <span
                        style={{
                          position: "absolute",
                          top: 14,
                          right: 14,
                          background: contatoLiberado ? "#DCFCE7" : "#FEF2F2",
                          color: contatoLiberado ? "#15803d" : "#991B1B",
                          fontWeight: 900,
                          fontSize: 12.5,
                          padding: "3px 10px",
                          borderRadius: 999,
                          zIndex: 2,
                          border: "1px solid",
                          borderColor: contatoLiberado ? "#bbf7d0" : "#FECACA",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        title={
                          contatoLiberado
                            ? "Contato liberado para você (mesma categoria)"
                            : "Contato bloqueado (categoria fora da sua atuação)"
                        }
                      >
                        <ShieldCheck size={14} />
                        {contatoLiberado ? "Contato disponível" : "Contato bloqueado"}
                      </span>
                    )}

                    <div
                      style={{
                        padding: "18px 22px 10px 22px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 15,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 53,
                            height: 53,
                            borderRadius: 14,
                            background: "#FFEDD5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ClipboardList size={27} style={{ color: "#FB8500" }} />
                        </div>
                        <div>
                          <div
                            data-tour={idx === 0 ? "demandas.card.titulo" : undefined}
                            style={{
                              fontWeight: 800,
                              fontSize: "1.17rem",
                              color: "#023047",
                              marginBottom: 4,
                              lineHeight: 1.2,
                            }}
                          >
                            {item.titulo || "Sem título"}
                          </div>
                          {item.categoria && (
                            <span
                              data-tour={idx === 0 ? "demandas.card.categoria" : undefined}
                              style={{
                                background: "#FFEDD5",
                                color: "#E17000",
                                fontWeight: 700,
                                fontSize: 12.5,
                                padding: "2px 9px",
                                borderRadius: 7,
                              }}
                            >
                              {item.categoria}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.descricao && (
                        <div
                          style={{
                            margin: "7px 0",
                            color: "#444",
                            fontWeight: 500,
                          }}
                        >
                          {resumo(item.descricao, 140)}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 13,
                          color: "#8c9199",
                          fontSize: 15,
                          margin: "10px 0 8px 0",
                          fontWeight: 600,
                        }}
                      >
                        <MapPin size={17} /> {item.cidade || "-"}, {item.estado || "-"}
                        <Calendar size={16} />
                        {fmtData(item.createdAt)}
                        <Eye size={17} />
                        {item.visualizacoes ?? 0}
                      </div>

                      {/* Contato (quando liberado) */}
                      {contatoLiberado &&
                        (contato?.whatsapp || contato?.email || contato?.nome) && (
                          <div
                            data-tour={idx === 0 ? "demandas.card.contato" : undefined}
                            style={{
                              border: "1px dashed #bbf7d0",
                              background: "#f0fdf4",
                              padding: "12px 14px",
                              borderRadius: 12,
                              marginTop: 6,
                              display: "grid",
                              gap: 8,
                            }}
                            title="Visível porque esta demanda é da sua categoria"
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: "#166534",
                                fontWeight: 800,
                              }}
                            >
                              <ShieldCheck size={16} />
                              Contato da Demanda (incluso no plano)
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                color: "#065f46",
                                fontWeight: 600,
                              }}
                            >
                              {contato?.nome && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <User2 size={16} />
                                  {contato.nome}
                                </div>
                              )}
                              {contato?.whatsapp && (
                                <Link
                                  href={`https://wa.me/${String(contato.whatsapp).replace(/\D/g, "")}`}
                                  target="_blank"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    textDecoration: "none",
                                    color: "#065f46",
                                  }}
                                >
                                  <Phone size={16} />
                                  {contato.whatsapp}
                                </Link>
                              )}
                              {contato?.email && (
                                <a
                                  href={`mailto:${contato.email}`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    textDecoration: "none",
                                    color: "#065f46",
                                  }}
                                >
                                  <Mail size={16} />
                                  {contato.email}
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Botões */}
                      {isFechada(item) ? (
                        <button
                          type="button"
                          disabled
                          style={{
                            background: "#d1d5db",
                            color: "#fff",
                            padding: "13px 0",
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: "1.12rem",
                            border: "none",
                            outline: "none",
                            letterSpacing: ".01em",
                            marginTop: 14,
                            cursor: "not-allowed",
                          }}
                        >
                          Fechada
                        </button>
                      ) : isPatrocinador ? (
                        contatoLiberado ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                              marginTop: 14,
                            }}
                          >
                            <Link
                              data-tour={idx === 0 ? "demandas.card.botao" : undefined}
                              href={`/demandas/${item.id}`}
                              className="group-hover:scale-[1.02] transition"
                              style={{
                                background: "#e5f3f7",
                                color: "#0b7285",
                                padding: "13px 0",
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: "1.02rem",
                                textDecoration: "none",
                                textAlign: "center",
                                border: "1px solid #cbe9f1",
                              }}
                            >
                              Ver detalhes
                            </Link>
                            {contato?.whatsapp ? (
                              <Link
                                href={`https://wa.me/${String(contato.whatsapp).replace(/\D/g, "")}`}
                                target="_blank"
                                className="group-hover:scale-[1.02] transition"
                                style={{
                                  background: "#219EBC",
                                  color: "#fff",
                                  padding: "13px 0",
                                  borderRadius: 12,
                                  fontWeight: 800,
                                  fontSize: "1.02rem",
                                  textDecoration: "none",
                                  textAlign: "center",
                                  boxShadow: "0 2px 10px #219EBC22",
                                }}
                              >
                                Falar agora
                              </Link>
                            ) : (
                              <Link
                                href={`/demandas/${item.id}`}
                                className="group-hover:scale-[1.02] transition"
                                style={{
                                  background: "#219EBC",
                                  color: "#fff",
                                  padding: "13px 0",
                                  borderRadius: 12,
                                  fontWeight: 800,
                                  fontSize: "1.02rem",
                                  textDecoration: "none",
                                  textAlign: "center",
                                  boxShadow: "0 2px 10px #219EBC22",
                                }}
                              >
                                Contato / opções
                              </Link>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={`/demandas/${item.id}`}
                            className="group-hover:scale-[1.02] transition"
                            style={{
                              background: "#219EBC",
                              color: "#fff",
                              padding: "13px 0",
                              borderRadius: 12,
                              fontWeight: 800,
                              fontSize: "1.12rem",
                              boxShadow: "0 2px 10px #219EBC22",
                              textDecoration: "none",
                              border: "none",
                              outline: "none",
                              letterSpacing: ".01em",
                              marginTop: 14,
                              display: "block",
                              textAlign: "center",
                            }}
                            title="Contato bloqueado — desbloqueie no detalhe da demanda"
                          >
                            Atender Demanda (desbloquear)
                          </Link>
                        )
                      ) : (
                        <Link
                          href={`/demandas/${item.id}`}
                          className="group-hover:scale-[1.02] transition"
                          style={{
                            background: "#219EBC",
                            color: "#fff",
                            padding: "13px 0",
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: "1.12rem",
                            boxShadow: "0 2px 10px #219EBC22",
                            textDecoration: "none",
                            border: "none",
                            outline: "none",
                            letterSpacing: ".01em",
                            marginTop: 14,
                            display: "block",
                            textAlign: "center",
                          }}
                        >
                          Atender Demanda
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!finishedRef.current && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <button
                  onClick={carregarMais}
                  disabled={carregandoMais}
                  className="group"
                  style={{
                    padding: "12px 26px",
                    borderRadius: 14,
                    background: "#f3f6fa",
                    border: "1px solid #e5e7eb",
                    fontWeight: 800,
                    color: "#023047",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {carregandoMais ? "Carregando..." : "Carregar mais"}
                  {carregandoMais ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .filtro {
          border: 1.4px solid #e5e7eb;
          border-radius: 9px;
          padding: 9px 13px;
          font-size: 15px;
          color: #444;
        }
      `}</style>
    </section>
  );
}

// app/admin/usuarios/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query as fsQuery,
  orderBy,
  startAfter,
  addDoc,
  serverTimestamp,
  limit as fsLimit,
} from "firebase/firestore";
import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import {
  Pencil,
  Trash2,
  UserCheck,
  User as UserIcon,
  PlusCircle,
  Search,
  Lock,
  ClipboardCopy,
  Filter,
  BadgeCheck,
  ShieldCheck,
  Tag as TagIcon,
  RefreshCw,
  Download,
  Users,
  MapPin,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

/* ========================= Constantes e helpers ========================= */
const COLLECTION_CANDIDATES = ["usuarios", "users", "user"] as const;
const FIRESTORE_PAGE = 1000;

const onlyDigits = (v = "") => v.replace(/\D/g, "");
const norm = (s = "") =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function tsToDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function formatDate(ts?: any) {
  const d = tsToDate(ts);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}
function daysFromNow(d?: Date | null) {
  if (!d) return Infinity;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ========================= Tipos ========================= */
type UsuarioDoc = {
  id: string;
  nome?: string;
  email?: string;
  

  role?: "admin" | "usuario" | "patrocinador";
  tipo?: "admin" | "usuario" | "patrocinador";
  status?:
    | "Ativo"
    | "Inativo"
    | "Bloqueado"
    | "Pendente"
    | "ativo"
    | "bloqueado"
    | "pendente";
  verificado?: boolean;

  cidade?: string;
  estado?: string;

  createdAt?: any;
  lastLogin?: any;
  lastLoginAt?: any;

  planoTipo?: string;
  planoStatus?: "ativo" | "inadimplente" | "expirado";
  planoExpiraEm?: any;

  categoriesAll?: string[];
  ufsSearch?: string[];

  whatsapp?: string;
  whatsappDigits?: string;
  emailLower?: string;
  nomeLower?: string;

  perfilCompleto?: boolean;
  tags?: string[];
  leadsInclusos?: number;
  leadsConsumidos?: number;
  consumo30d?: number;

  searchPrefixes?: string[];
  
    isPatrocinador?: boolean;
  patrocinadorDesde?: any;
  patrocinadorAte?: any;

};

function asRole(u: UsuarioDoc): "admin" | "usuario" | "patrocinador" {
  return (u.role as any) || (u.tipo as any) || "usuario";
}
function asStatus(
  u: UsuarioDoc,
): "Ativo" | "Bloqueado" | "Pendente" | "Inativo" {
  const s = (u.status || "") as string;
  if (!s) return "Ativo";
  const n = s.toLowerCase();
  if (n === "ativo") return "Ativo";
  if (n === "bloqueado") return "Bloqueado";
  if (n === "pendente") return "Pendente";
  if (n === "inativo") return "Inativo";
  return (u.status as any) || "Ativo";
}
function isFornecedor(u: UsuarioDoc) {
  return !!u.verificado;
}

function isPatrocinador(u: UsuarioDoc) {
  const papel = (u.role || u.tipo || "").toLowerCase();
  const byRole = papel === "patrocinador";
  const byFlag = (u as any).isPatrocinador === true; // se você usa esse flag
  const byPlano = ["ativo", "inadimplente", "expirado"].includes(
    (u.planoStatus || "").toLowerCase(),
  );
  // qualquer uma das condições já considera o usuário como patrocinador
  return byRole || byFlag || byPlano;
}

/** Retorna o campo correto de criação (createdAt | criadoEm | criadoem | created_at) */
function getCreatedAt(u: UsuarioDoc) {
  return u.createdAt ?? (u as any).criadoEm ?? (u as any).criadoem ?? (u as any).created_at;
}

/* ========================= Página ========================= */
function UsuariosAdminPage() {
  /* ---------- estado base ---------- */
  const [listaExibida, setListaExibida] = useState<UsuarioDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // cache com TUDO carregado das 3 coleções (dedupe por id)
  const allDocsRef = useRef<UsuarioDoc[]>([]);
  const [visibleMax, setVisibleMax] = useState(50); // paginação client
  const PAGE_CHUNK = 50;

  /* ---------- filtros ---------- */
  const [busca, setBusca] = useState("");
  const [fRole, setFRole] = useState<
    "" | "admin" | "usuario" | "patrocinador" | "fornecedor"
  >("");
  const [fStatus, setFStatus] = useState<
    "" | "Ativo" | "Bloqueado" | "Pendente" | "Inativo"
  >("");
  const [fUF, setFUF] = useState("");
  const [fCidade, setFCidade] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fUFCobertura, setFUFCobertura] = useState("");
  const [fPatro, setFPatro] = useState<
    "" | "ativo" | "expira7" | "inadimplente" | "expirado"
  >("");
  const [fSomenteMelhorados, setFSomenteMelhorados] = useState(false);
  const [fSemWhats, setFSemWhats] = useState(false);
  const [fTag, setFTag] = useState("");

  // seleção em massa
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});

  /* ---------- stats (client, confiáveis) ---------- */
  const stats = useMemo(() => {
  const now = Date.now();
  const msDia = 24 * 60 * 60 * 1000;

  const total = allDocsRef.current.length;
  let admins = 0;
  let patrocinadores = 0; // total (derivado)
  let ativos = 0;
  let fornecedores = 0;   // verificado === true
  let perfisMelhorados = 0;

  let ult7 = 0;
  let ult30 = 0;
  let ult90 = 0;

  for (const u of allDocsRef.current) {
    if (asRole(u) === "admin") admins++;
    if (isPatrocinador(u)) patrocinadores++;
    if (asStatus(u) === "Ativo") ativos++;
    if (isFornecedor(u)) fornecedores++;
    if ((u.categoriesAll?.length || 0) > 0) perfisMelhorados++;

    const cAt = tsToDate(getCreatedAt(u));
    if (cAt) {
      const diff = now - cAt.getTime();
      if (diff <= 7 * msDia) ult7++;
      if (diff <= 30 * msDia) ult30++;
      if (diff <= 90 * msDia) ult90++;
    }
  }

  return {
    total,
    admins,
    patrocinadores,
    ativos,
    fornecedores,
    perfisMelhorados,
    ult7,
    ult30,
    ult90,
  };
}, [listaExibida]);


  /* ==================== Carregamento TOTAL sem filtros ==================== */
  const fetchAllRaw = useCallback(async () => {
    const map = new Map<string, UsuarioDoc>();

    for (const cName of COLLECTION_CANDIDATES) {
      let cursor: any | null = null;
      while (true) {
        try {
          const q = fsQuery(
            collection(db, cName),
            orderBy("__name__"),
            ...(cursor ? [startAfter(cursor)] : []),
            fsLimit(FIRESTORE_PAGE),
          );
          const snap: QuerySnapshot<DocumentData> = await getDocs(q);
          if (snap.empty) break;

          for (const d of snap.docs) {
            const raw = { id: d.id, ...(d.data() as any) };
            const u: UsuarioDoc = {
              ...raw,
              emailLower: raw.email ? String(raw.email).toLowerCase() : undefined,
              nomeLower: raw.nome ? norm(String(raw.nome)) : undefined,
              whatsappDigits: raw.whatsapp
                ? onlyDigits(String(raw.whatsapp))
                : undefined,
            };
            map.set(u.id, u);
          }

          cursor = snap.docs.at(-1);
          if (map.size > 50000) break;
        } catch {
          break;
        }
      }
    }

    const out = Array.from(map.values());
    // dentro de fetchAllRaw (depois de montar 'out')
out.sort((a, b) => {
  const da = tsToDate(getCreatedAt(a))?.getTime() ?? 0;
  const db = tsToDate(getCreatedAt(b))?.getTime() ?? 0;
  if (db !== da) return db - da;     // mais novo primeiro
  return a.id.localeCompare(b.id);
});


    allDocsRef.current = out;
  }, []);

  /* ==================== Busca + Filtros no CLIENT ==================== */
  function matchesSearch(u: UsuarioDoc, term: string) {
    if (!term) return true;
    const t = norm(term);
    if (!t) return true;

    // ID exato
    if (u.id === term.trim()) return true;

    // e-mail contains
    if (u.emailLower && u.emailLower.includes(t)) return true;

    // nome prefix/contains
    const nLower = u.nomeLower || (u.nome ? norm(u.nome) : "");
    if (nLower && (nLower.startsWith(t) || nLower.includes(t))) return true;

    // cidade contains
    const cLower = u.cidade ? norm(u.cidade) : "";
    if (cLower && cLower.includes(t)) return true;

    // telefone exato (com e sem 55)
    const d = onlyDigits(term);
    if (d) {
      const variants = new Set<string>([
        d,
        d.startsWith("55") ? d.slice(2) : `55${d}`,
      ]);
      if (u.whatsappDigits && variants.has(u.whatsappDigits)) return true;
    }

    // prefixes (se existir)
    if (u.searchPrefixes?.some((p) => t.startsWith(p))) return true;

    return false;
  }

  function matchesFilters(u: UsuarioDoc) {
    // Tipo/Papel unificado (inclui "fornecedor" e patrocinador derivado)
if (fRole) {
  if (fRole === "fornecedor") {
    if (!isFornecedor(u)) return false;
  } else if (fRole === "patrocinador") {
    if (!isPatrocinador(u)) return false;
  } else {
    if (!(u.role === fRole || u.tipo === fRole)) return false;
  }
}
// Período de cadastro
if (fPeriodoCadastro) {
  const dias = Number(fPeriodoCadastro);
  const cAt = tsToDate(getCreatedAt(u));
  if (!cAt) return false;
  const diffDias = (Date.now() - cAt.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias > dias) return false;
}


    if (fStatus && asStatus(u) !== fStatus) return false;
    if (fUF && u.estado !== fUF) return false;
    if (fCidade && u.cidade !== fCidade) return false;

    if (fCategoria && !(u.categoriesAll || []).includes(fCategoria))
      return false;

    if (fUFCobertura && !(u.ufsSearch || []).includes(fUFCobertura))
      return false;

    if (fPatro === "ativo" && u.planoStatus !== "ativo") return false;
    if (fPatro === "inadimplente" && u.planoStatus !== "inadimplente")
      return false;
    if (fPatro === "expirado" && u.planoStatus !== "expirado") return false;
    if (fPatro === "expira7") {
      const ativo = u.planoStatus === "ativo";
      const exp = tsToDate(u.planoExpiraEm);
      if (!(ativo && daysFromNow(exp) <= 7)) return false;
    }

    if (fSomenteMelhorados && !(u.categoriesAll?.length)) return false;
    if (fSemWhats && !!u.whatsapp) return false;
    if (fTag && !(u.tags || []).includes(fTag)) return false;

    return true;
  }

  const aplicarFiltrosEExibir = useCallback(() => {
    const term = (busca || "").trim();
    const base = allDocsRef.current;
    let list = term ? base.filter((u) => matchesSearch(u, term)) : base.slice();
    list = list.filter(matchesFilters);

    // dentro de aplicarFiltrosEExibir
list.sort((a, b) => {
  const da = tsToDate(getCreatedAt(a))?.getTime() ?? 0;
  const db = tsToDate(getCreatedAt(b))?.getTime() ?? 0;
  if (db !== da) return db - da;
  return a.id.localeCompare(b.id);
});


    setVisibleMax(PAGE_CHUNK);
    setListaExibida(list);
  }, [
    busca,
    fRole,
    fStatus,
    fUF,
    fCidade,
    fCategoria,
    fUFCobertura,
    fPatro,
    fSomenteMelhorados,
    fSemWhats,
    fTag,
  ]);

  /* ==================== Ciclo de vida ==================== */
  const recarregar = useCallback(async () => {
    setLoading(true);
    setSelecionados({});
    await fetchAllRaw();
    aplicarFiltrosEExibir();
    setLoading(false);
  }, [fetchAllRaw, aplicarFiltrosEExibir]);

  // primeira carga
  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // re-aplica filtros quando mudam
  useEffect(() => {
    if (!loading) aplicarFiltrosEExibir();
  }, [loading, aplicarFiltrosEExibir]);

  // Auto-refresh ao voltar o foco (resolve edição de papel/patro, etc.)
  useEffect(() => {
    const onFocus = () => recarregar();
    const onVisibility = () => {
      if (document.visibilityState === "visible") recarregar();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [recarregar]);

  // BroadcastChannel para refletir mudanças salvas na página de edição
  useEffect(() => {
    // Dica: na página /admin/usuarios/[id]/edit, após salvar role/verificado, faça:
    // bc.postMessage({ type: "user-updated", id, patch: { role, tipo, verificado, planoStatus, ... } })
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("admin-users");
      bc.onmessage = (ev) => {
        const msg = ev.data || {};
        if (msg?.type === "user-updated") {
          // aplica patch rápido se o usuário já está no cache; senão recarrega geral
          const idx = allDocsRef.current.findIndex((u) => u.id === msg.id);
          if (idx >= 0) {
            allDocsRef.current[idx] = {
              ...allDocsRef.current[idx],
              ...(msg.patch || {}),
            };
            aplicarFiltrosEExibir();
          } else {
            recarregar();
          }
        }
      };
    } catch {}
    return () => {
      try {
        bc?.close();
      } catch {}
    };
  }, [aplicarFiltrosEExibir, recarregar]);

  /* ==================== Opções dinâmicas (derivadas) ==================== */
  const estadosDisponiveis = useMemo(() => {
    const s = new Set<string>();
    allDocsRef.current.forEach((u) => u.estado && s.add(u.estado));
    return Array.from(s).sort();
  }, [listaExibida]);

  const cidadesDisponiveis = useMemo(() => {
    const s = new Set<string>();
    allDocsRef.current.forEach((u) => {
      if (!fUF || u.estado === fUF) {
        u.cidade && s.add(u.cidade);
      }
    });
    return Array.from(s).sort();
  }, [listaExibida, fUF]);

  const categoriasDisponiveis = useMemo(() => {
    const s = new Set<string>();
    allDocsRef.current.forEach((u) =>
      (u.categoriesAll || []).forEach((c) => c && s.add(c)),
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [listaExibida]);

  const ufsCoberturaDisponiveis = useMemo(() => {
    const s = new Set<string>();
    allDocsRef.current.forEach((u) =>
      (u.ufsSearch || []).forEach((uf) => uf && s.add(uf)),
    );
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [listaExibida]);

  const tagsDisponiveis = useMemo(() => {
    const s = new Set<string>();
    allDocsRef.current.forEach((u) => (u.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [listaExibida]);

  /* ==================== Exportação CSV ==================== */
  function exportCSV() {
    const cols = [
      "id",
      "nome",
      "email",
      "role",
      "status",
      "fornecedor",
      "estado",
      "cidade",
      "categorias",
      "ufsCobertura",
      "createdAt",
      "lastLogin",
      "planoStatus",
    ];
    const lines = [cols.join(",")];
    const data = listaExibida.slice(0, visibleMax);
    data.forEach((u) => {
      const row = [
        u.id,
        (u.nome || "").replace(/,/g, " "),
        (u.email || "").replace(/,/g, " "),
        asRole(u),
        asStatus(u),
        String(!!u.verificado),
        u.estado || "",
        u.cidade || "",
        (u.categoriesAll || []).join("|"),
        (u.ufsSearch || []).join("|"),
        formatDate(getCreatedAt(u)),

        formatDate(u.lastLoginAt || u.lastLogin),
        u.planoStatus || "",
      ];
      lines.push(row.map((v) => `"${v}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ==================== Ações por linha ==================== */
  async function logAdmin(
    action: string,
    usuarioId: string,
    before: any,
    after: any,
  ) {
    try {
      await addDoc(collection(db, "adminLogs"), {
        usuarioId,
        action,
        before,
        after,
        at: serverTimestamp(),
      });
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir usuário permanentemente?")) return;
    const before = allDocsRef.current.find((u) => u.id === id);
    for (const cName of COLLECTION_CANDIDATES) {
      try {
        await deleteDoc(doc(db, cName, id));
        break;
      } catch {}
    }
    allDocsRef.current = allDocsRef.current.filter((u) => u.id !== id);
    aplicarFiltrosEExibir();
    await logAdmin("delete-usuario", id, before || null, null);
  }

  async function handleStatus(
    id: string,
    novo: "Ativo" | "Bloqueado" | "Pendente" | "Inativo",
  ) {
    const before = allDocsRef.current.find((u) => u.id === id);
    let ok = false;
    for (const cName of COLLECTION_CANDIDATES) {
      try {
        await updateDoc(doc(db, cName, id), { status: novo });
        ok = true;
        break;
      } catch {}
    }
    if (!ok) return;
    allDocsRef.current = allDocsRef.current.map((u) =>
      u.id === id ? { ...u, status: novo } : u,
    );
    aplicarFiltrosEExibir();
    await logAdmin("update-status", id, before || null, { status: novo });
  }

  async function handleRole(
    id: string,
    novo: "admin" | "usuario" | "patrocinador",
  ) {
    const before = allDocsRef.current.find((u) => u.id === id);
    let ok = false;
    for (const cName of COLLECTION_CANDIDATES) {
      try {
        await updateDoc(doc(db, cName, id), { role: novo, tipo: novo });
        ok = true;
        break;
      } catch {}
    }
    if (!ok) return;
    allDocsRef.current = allDocsRef.current.map((u) =>
      u.id === id ? { ...u, role: novo, tipo: novo } : u,
    );
    aplicarFiltrosEExibir();

    // notifica outras abas/páginas (ex.: lista) sobre a mudança
    try {
      const bc = new BroadcastChannel("admin-users");
      bc.postMessage({ type: "user-updated", id, patch: { role: novo, tipo: novo } });
      bc.close();
    } catch {}

    await logAdmin("update-role", id, before || null, { role: novo });
  }

  async function handleApplyTag(id: string, tag: string) {
    const val = tag.trim();
    if (!val) return;
    const before = allDocsRef.current.find((u) => u.id === id);
    const tags = new Set([...(before?.tags || []), val]);
    let ok = false;
    for (const cName of COLLECTION_CANDIDATES) {
      try {
        await updateDoc(doc(db, cName, id), { tags: Array.from(tags) });
        ok = true;
        break;
      } catch {}
    }
    if (!ok) return;
    allDocsRef.current = allDocsRef.current.map((u) =>
      u.id === id ? { ...u, tags: Array.from(tags) } : u,
    );
    aplicarFiltrosEExibir();

    try {
      const bc = new BroadcastChannel("admin-users");
      bc.postMessage({ type: "user-updated", id, patch: { tags: Array.from(tags) } });
      bc.close();
    } catch {}

    await logAdmin(
      "apply-tag",
      id,
      { tags: before?.tags || [] },
      { tags: Array.from(tags) },
    );
  }

  /* ==================== seleção em massa ==================== */
  const idsSelecionados = useMemo(
    () =>
      Object.entries(selecionados)
        .filter(([, v]) => v)
        .map(([id]) => id),
    [selecionados],
  );

  async function bulkStatus(novo: "Ativo" | "Bloqueado") {
    if (!idsSelecionados.length) return;
    if (
      !window.confirm(
        `Alterar status para "${novo}" em ${idsSelecionados.length} usuário(s)?`,
      )
    )
      return;
    await Promise.all(idsSelecionados.map((id) => handleStatus(id, novo)));
    setSelecionados({});
  }

  async function bulkTag(tag: string) {
    const val = tag.trim();
    if (!idsSelecionados.length || !val) return;
    if (
      !window.confirm(
        `Aplicar tag "${val}" em ${idsSelecionados.length} usuário(s)?`,
      )
    )
      return;
    await Promise.all(idsSelecionados.map((id) => handleApplyTag(id, val)));
    setSelecionados({});
  }

  /* ==================== UI ==================== */
  const paginada = useMemo(
    () => listaExibida.slice(0, visibleMax),
    [listaExibida, visibleMax],
  );
  const fimDaLista = paginada.length >= listaExibida.length;
const [fPeriodoCadastro, setFPeriodoCadastro] = useState<"" | "7" | "30" | "90">("");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "46px 0 30px 0",
      }}
    >
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "0 2vw" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 22,
          }}
        >
          <h1
            style={{
              fontWeight: 900,
              fontSize: "2.3rem",
              color: "#023047",
              margin: 0,
              letterSpacing: "-1px",
            }}
          >
            Gestão de Usuários
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => recarregar()}
              title="Recarregar"
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              <RefreshCw size={18} />
            </button>
            <Link
              href="/admin/usuarios/create"
              style={{
                background: "#FB8500",
                color: "#fff",
                borderRadius: 16,
                fontWeight: 800,
                fontSize: "1.05rem",
                padding: "12px 18px",
                textDecoration: "none",
                boxShadow: "0 2px 12px #0001",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PlusCircle size={18} /> Novo Usuário
            </Link>
          </div>
        </div>

        {/* Cards resumo */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <ResumoCard label="Total" value={stats.total} icon={<Users size={18} />} color="#2563eb" />
<ResumoCard label="Admins" value={stats.admins} icon={<ShieldCheck size={18} />} color="#4f46e5" />
<ResumoCard label="Patrocinadores" value={stats.patrocinadores} icon={<BadgeCheck size={18} />} color="#059669" />
<ResumoCard label="Ativos" value={stats.ativos} icon={<CheckCircle2 size={18} />} color="#10b981" />
<ResumoCard label="Fornecedores" value={stats.fornecedores} icon={<BadgeCheck size={18} />} color="#0ea5e9" />
<ResumoCard label="Perfis melhorados" value={stats.perfisMelhorados} icon={<TagIcon size={18} />} color="#f59e0b" />

{/* novos (cadastros recentes) */}
<ResumoCard label="Últimos 7 dias" value={stats.ult7} icon={<Users size={18} />} color="#22c55e" />
<ResumoCard label="Últimos 30 dias" value={stats.ult30} icon={<Users size={18} />} color="#a855f7" />
<ResumoCard label="Últimos 90 dias" value={stats.ult90} icon={<Users size={18} />} color="#ef4444" />
        </div>

        {/* Busca + filtros */}
        <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
          {/* Linha 1 */}
          <div className="filtersTopRow">
            <div className="searchWrap">
              <Search size={18} className="searchIcon" />
              <input
                className="searchInput"
                placeholder="Buscar por ID / nome / e-mail / telefone / cidade"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="filtersActionsRight">
              <button
                onClick={exportCSV}
                className="btnIcon"
                title="Exportar CSV (lista atual)"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Linha 2 — filtros principais */}
          <div className="filtersScroller">
            <select
              value={fRole}
              onChange={(e) => setFRole(e.target.value as any)}
              className="filterItem"
            >
              <option value="">Tipo/Papel</option>
              <option value="admin">Admin</option>
              <option value="patrocinador">Patrocinador</option>
              <option value="usuario">Usuário</option>
              <option value="fornecedor">Fornecedor (selo)</option>
            </select>
<select
  value={fPeriodoCadastro}
  onChange={(e) => setFPeriodoCadastro(e.target.value as any)}
  className="filterItem"
>
  <option value="">Período</option>
  <option value="7">Últimos 7 dias</option>
  <option value="30">Últimos 30 dias</option>
  <option value="90">Últimos 90 dias</option>
</select>

            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value as any)}
              className="filterItem"
            >
              <option value="">Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Bloqueado">Bloqueado</option>
              <option value="Pendente">Pendente</option>
              <option value="Inativo">Inativo</option>
            </select>

            <select
              value={fUF}
              onChange={(e) => {
                setFUF(e.target.value);
                setFCidade("");
              }}
              className="filterItem"
            >
              <option value="">Estado (cadastro)</option>
              {estadosDisponiveis.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>

            <select
              value={fCidade}
              onChange={(e) => setFCidade(e.target.value)}
              className="filterItem"
            >
              <option value="">Cidade</option>
              {cidadesDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={fCategoria}
              onChange={(e) => setFCategoria(e.target.value)}
              className="filterItem"
            >
              <option value="">Categoria</option>
              {categoriasDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={fUFCobertura}
              onChange={(e) => setFUFCobertura(e.target.value)}
              className="filterItem"
            >
              <option value="">Cobertura (UF/BRASIL)</option>
              {ufsCoberturaDisponiveis.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>

            <select
              value={fPatro}
              onChange={(e) => setFPatro(e.target.value as any)}
              className="filterItem"
            >
              <option value="">Patrocínio</option>
              <option value="ativo">Plano Ativo</option>
              <option value="expira7">Expira ≤7 dias</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="expirado">Expirado</option>
            </select>

            {/* Toggle Somente perfis melhorados */}
            <label className="chk">
              <input
                type="checkbox"
                checked={fSomenteMelhorados}
                onChange={(e) => setFSomenteMelhorados(e.target.checked)}
              />{" "}
              Somente perfis melhorados
            </label>

            <details className="filterItem detailsAdv">
              <summary className="btnAdv">
                <Filter size={16} /> Avançados <ChevronDown size={14} />
              </summary>
              <div className="advContent">
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={fSemWhats}
                    onChange={(e) => setFSemWhats(e.target.checked)}
                  />{" "}
                  Sem WhatsApp
                </label>
                <select
                  value={fTag}
                  onChange={(e) => setFTag(e.target.value)}
                  className="filterItem"
                  style={{ minWidth: 160 }}
                >
                  <option value="">Tag</option>
                  {tagsDisponiveis.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </details>
          </div>
        </div>

        {/* Chips */}
        <Chips
          values={
            [
              busca && {
                label: `Busca: "${busca}"`,
                onClear: () => setBusca(""),
              },
              fRole && {
                label:
                  fRole === "fornecedor"
                    ? "Tipo: Fornecedor"
                    : `Tipo: ${fRole}`,
                onClear: () => setFRole(""),
              },
              fStatus && {
                label: `Status: ${fStatus}`,
                onClear: () => setFStatus(""),
              },
              fUF && { label: `UF: ${fUF}`, onClear: () => setFUF("") },
              fCidade && {
                label: `Cidade: ${fCidade}`,
                onClear: () => setFCidade(""),
              },
              fCategoria && {
                label: `Categoria: ${fCategoria}`,
                onClear: () => setFCategoria(""),
              },
              fUFCobertura && {
                label: `Cobertura: ${fUFCobertura}`,
                onClear: () => setFUFCobertura(""),
              },
              fPatro && {
                label: `Patrocínio: ${fPatro}`,
                onClear: () => setFPatro(""),
              },
              fSomenteMelhorados && {
                label: "Somente perfis melhorados",
                onClear: () => setFSomenteMelhorados(false),
              },
              fSemWhats && {
                label: "Sem WhatsApp",
                onClear: () => setFSemWhats(false),
              },
              fPeriodoCadastro && {
  label: `Cadastro: últimos ${fPeriodoCadastro} dias`,
  onClear: () => setFPeriodoCadastro(""),
},
              fTag && { label: `Tag: ${fTag}`, onClear: () => setFTag("") },
            ].filter(Boolean) as any[]
          }

          
          onClearAll={() => {
            setBusca("");
            setFPeriodoCadastro("");
            setFRole("");
            setFStatus("");
            setFUF("");
            setFCidade("");
            setFCategoria("");
            setFUFCobertura("");
            setFPatro("");
            setFSomenteMelhorados(false);
            setFSemWhats(false);
            setFTag("");
          }}
        />

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            margin: "10px 0 16px",
          }}
        >
          <span style={{ fontWeight: 800, color: "#64748b" }}>
            {idsSelecionados.length} selecionado(s)
          </span>
          <button
            onClick={() => bulkStatus("Bloqueado")}
            disabled={!idsSelecionados.length}
            style={btnDanger()}
          >
            <Lock size={16} /> Bloquear
          </button>
          <button
            onClick={() => bulkStatus("Ativo")}
            disabled={!idsSelecionados.length}
            style={btnSuccess()}
          >
            <UserCheck size={16} /> Desbloquear
          </button>
          <BulkTag
            onApply={(t) => bulkTag(t)}
            disabled={!idsSelecionados.length}
          />
          <button
            onClick={exportCSV}
            style={btnNeutral()}
            title="Exportar CSV (lista atual)"
          >
            <Download size={16} /> Exportar CSV
          </button>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setVisibleMax((v) => v + PAGE_CHUNK)}
              style={btnPrimary()}
              disabled={loading || fimDaLista}
              title={fimDaLista ? "Fim da lista" : "Carregar mais"}
            >
              Carregar mais
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading && listaExibida.length === 0 ? (
          <div
            style={{
              color: "#219EBC",
              fontWeight: 700,
              padding: 44,
              textAlign: "center",
            }}
          >
            Carregando usuários...
          </div>
        ) : paginada.length === 0 ? (
          <div
            style={{
              color: "#adb0b6",
              fontWeight: 600,
              padding: 44,
              textAlign: "center",
            }}
          >
            Nenhum resultado — experimente limpar os filtros.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 22,
              marginBottom: 28,
            }}
          >
            {paginada.map((u) => {
              const role = asRole(u);
              const papelVisual = isPatrocinador(u) ? "PATROCINADOR" : (asRole(u) || "usuario").toUpperCase();
              const status = asStatus(u);
              const isSelected = !!selecionados[u.id];
              const expiraEm = tsToDate(u.planoExpiraEm);
              const dias = daysFromNow(expiraEm);
              const badgePlano =
                u.planoStatus === "expirado"
                  ? { bg: "#ffe6e6", fg: "#d90429", txt: "Expirado" }
                  : u.planoStatus === "inadimplente"
                  ? { bg: "#fff4e6", fg: "#c2410c", txt: "Inadimplente" }
                  : u.planoStatus === "ativo" && dias <= 7
                  ? {
                      bg: "#fff7ed",
                      fg: "#b45309",
                      txt: `Expira em ${Math.max(dias, 0)}d`,
                    }
                  : u.planoStatus === "ativo"
                  ? { bg: "#e7faec", fg: "#059669", txt: "Plano Ativo" }
                  : undefined;

              return (
                <div
                  key={u.id}
                  style={{
                    background: "#fff",
                    borderRadius: 17,
                    boxShadow: "0 2px 20px #0001",
                    padding: "18px 20px 16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    position: "relative",
                  }}
                >
                  <label style={{ position: "absolute", top: 14, left: 14 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        setSelecionados((s) => ({
                          ...s,
                          [u.id]: e.target.checked,
                        }))
                      }
                    />
                  </label>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <div
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #FB8500 60%, #2563eb 120%)",
                        color: "#fff",
                        fontWeight: 900,
                        fontSize: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 10px #0001",
                      }}
                    >
                      {u.nome ? (
                        u.nome.charAt(0).toUpperCase()
                      ) : (
                        <UserIcon size={28} />
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "1.08rem",
                          color: "#023047",
                        }}
                      >
                        {u.nome || "—"}
                      </div>
                      <div
                        style={{
                          color: "#219ebc",
                          fontWeight: 700,
                          fontSize: 14,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{u.email || "—"}</span>
                        {u.email && (
                          <span
                            title="Copiar e-mail"
                            onClick={() =>
                              navigator.clipboard.writeText(u.email!)
                            }
                            style={{
                              cursor: "pointer",
                              display: "inline-flex",
                            }}
                            aria-label="Copiar e-mail"
                          >
                            <ClipboardCopy size={15} />
                          </span>
                        )}
                        {u.verificado ? (
                          <span title="Fornecedor (verificado)">
                            <BadgeCheck size={16} />
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontWeight: 600,
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{u.id}</span>
                        <span
                          title="Copiar ID"
                          onClick={() => navigator.clipboard.writeText(u.id)}
                          style={{ cursor: "pointer", display: "inline-flex" }}
                          aria-label="Copiar ID"
                        >
                          <ClipboardCopy size={14} />
                        </span>
                      </div>
                      {(u.cidade || u.estado) && (
                        <div
                          style={{
                            color: "#64748b",
                            fontWeight: 700,
                            fontSize: 13,
                            marginTop: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <MapPin size={14} />
                          {u.cidade || "—"}
                          {u.estado ? ` - ${u.estado}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={pill("#eef2ff", "#4f46e5")}>
  {papelVisual}
</span>
                    <span
                      style={pill(
                        status === "Ativo" ? "#e7faec" : "#ffe6e6",
                        status === "Ativo" ? "#059669" : "#d90429",
                      )}
                    >
                      {status}
                    </span>
                    {u.verificado && (
                      <span style={pill("#e0f2fe", "#0369a1")}>
                        <BadgeCheck size={12} /> Fornecedor
                      </span>
                    )}
                    {badgePlano && (
                      <span style={pill(badgePlano.bg, badgePlano.fg)}>
                        {badgePlano.txt}
                      </span>
                    )}
                    {(u.categoriesAll || []).slice(0, 2).map((c) => (
                      <span key={c} style={pill("#f1f5f9", "#334155")}>
                        <TagIcon size={12} /> {c}
                      </span>
                    ))}
                  </div>

                  <div style={{ color: "#A0A0A0", fontSize: 12 }}>
  Cadastro: {formatDate(getCreatedAt(u))}
  {(u.lastLoginAt || u.lastLogin) && (
    <>
      {" "}{" | "}Último login: {formatDate(u.lastLoginAt || u.lastLogin)}
    </>
  )}
</div>


                  {/* ações */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={`/admin/usuarios/${u.id}/edit`}
                      style={btnLink()}
                    >
                      <Pencil size={15} /> Editar
                    </Link>

                    {asStatus(u) !== "Bloqueado" ? (
                      <button
                        onClick={() => handleStatus(u.id, "Bloqueado")}
                        style={btnDanger()}
                      >
                        <Lock size={15} /> Bloquear
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatus(u.id, "Ativo")}
                        style={btnSuccess()}
                      >
                        <UserCheck size={15} /> Ativar
                      </button>
                    )}

                    <div
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <label
                        style={{
                          fontWeight: 800,
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        Papel:
                      </label>
                      <select
                        value={asRole(u)}
                        onChange={(e) =>
                          handleRole(u.id, e.target.value as any)
                        }
                        style={sel()}
                      >
                        <option value="usuario">Usuário</option>
                        <option value="patrocinador">Patrocinador</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <label
                        style={{
                          fontWeight: 800,
                          color: "#64748b",
                          fontSize: 12,
                        }}
                      >
                        Tag:
                      </label>
                      <input
                        placeholder="ex.: fornecedor"
                        onKeyDown={(e) => {
                          const val = (
                            e.target as HTMLInputElement
                          ).value.trim();
                          if (e.key === "Enter" && val) {
                            handleApplyTag(u.id, val);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                        style={{ ...sel(), width: 150 }}
                      />
                    </div>

                    <button
                      onClick={() => handleDelete(u.id)}
                      style={btnOutlineDanger()}
                    >
                      <Trash2 size={15} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA fim da lista */}
        {!loading && !fimDaLista && (
          <div
            style={{ display: "flex", justifyContent: "center", marginTop: 8 }}
          >
            <button
              onClick={() => setVisibleMax((v) => v + PAGE_CHUNK)}
              style={btnPrimary()}
              title="Carregar mais"
            >
              Carregar mais
            </button>
          </div>
        )}
      </section>

      <style jsx>{`
        .filtersTopRow {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
        }
        .searchWrap {
          position: relative;
        }
        .searchIcon {
          position: absolute;
          top: 9px;
          left: 10px;
          color: #a0a0a0;
        }
        .searchInput {
          width: 100%;
          padding: 8px 8px 8px 35px;
          border-radius: 11px;
          border: 1px solid #e0e7ef;
          font-size: 15px;
          font-weight: 600;
          color: #023047;
          background: #fff;
        }
        .filtersActionsRight {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }
        .filtersScroller {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
        }
        .filtersScroller::-webkit-scrollbar {
          height: 8px;
        }
        .filtersScroller::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 8px;
        }
        .filterItem {
          border-radius: 10px;
          border: 1px solid #e0e7ef;
          font-weight: 800;
          color: #0f172a;
          padding: 8px 12px;
          background: #fff;
          white-space: nowrap;
          min-width: 160px;
        }
        .detailsAdv {
          min-width: unset;
        }
        .btnAdv {
          list-style: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          font-weight: 800;
          padding: 8px 12px;
        }
        .advContent {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .chk {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          color: #334155;
          background: #fff;
          padding: 6px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }

        @media (min-width: 1024px) {
          .filtersScroller {
            display: grid;
            grid-template-columns: repeat(8, minmax(160px, 1fr)) 220px;
            gap: 10px;
            overflow: visible;
          }
          .filterItem {
            width: 100%;
            min-width: 0;
          }
          .detailsAdv {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </main>
  );
}

/* ========================= Subcomponentes / estilos ========================= */
function ResumoCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        background: "#fff",
        borderRadius: 13,
        padding: "9px 18px",
        fontWeight: 900,
        color: "#023047",
        border: `2px solid ${color}22`,
        fontSize: 16,
        boxShadow: "0 2px 12px #0001",
      }}
    >
      <span style={{ color, display: "flex", alignItems: "center" }}>
        {icon}
      </span>
      <span style={{ fontWeight: 800, fontSize: 19, marginLeft: 4 }}>
        {value}
      </span>
      <span style={{ color: "#697A8B", fontWeight: 700, marginLeft: 6 }}>
        {label}
      </span>
    </div>
  );
}

function Chips({
  values,
  onClearAll,
}: {
  values: { label: string; onClear: () => void }[];
  onClearAll: () => void;
}) {
  if (!values.length) return null;
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        margin: "8px 0 12px",
      }}
    >
      {values.map((c, i) => (
        <span
          key={i}
          style={{
            padding: "6px 10px",
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            fontWeight: 800,
            color: "#334155",
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {c.label}
          <button
            onClick={c.onClear}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          marginLeft: 4,
          background: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: 999,
          padding: "6px 12px",
          fontWeight: 900,
          color: "#475569",
          cursor: "pointer",
        }}
      >
        Limpar tudo
      </button>
    </div>
  );
}

function BulkTag({
  onApply,
  disabled,
}: {
  onApply: (t: string) => void;
  disabled?: boolean;
}) {
  const [tag, setTag] = useState("");
  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <label style={{ fontWeight: 800, color: "#64748b" }}>Tag:</label>
      <input
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder="ex.: fornecedor"
        style={{ ...sel(), width: 160 }}
      />
      <button
        onClick={() => onApply(tag.trim())}
        disabled={disabled || !tag.trim()}
        style={btnNeutral()}
      >
        <TagIcon size={16} /> Aplicar
      </button>
    </div>
  );
}

/* ---------- helpers de estilo ---------- */
function sel() {
  return {
    borderRadius: 10,
    border: "1px solid #e0e7ef",
    fontWeight: 800,
    color: "#0f172a",
    padding: "8px 12px",
    background: "#fff",
  } as React.CSSProperties;
}
function pill(bg: string, fg: string) {
  return {
    borderRadius: 999,
    background: bg,
    color: fg,
    fontWeight: 900,
    fontSize: ".85rem",
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnLink() {
  return {
    background: "#e8f8fe",
    color: "#2563eb",
    border: "1px solid #e0ecff",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 13px",
    borderRadius: 9,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnDanger() {
  return {
    background: "#fff0f0",
    color: "#d90429",
    border: "1px solid #ffe5e5",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnOutlineDanger() {
  return {
    background: "#fff",
    color: "#d90429",
    border: "1px solid #ffe5e5",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnSuccess() {
  return {
    background: "#e7faec",
    color: "#059669",
    border: "1px solid #d0ffdd",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnPrimary() {
  return {
    background: "#eef2ff",
    color: "#4f46e5",
    border: "1px solid #e0e7ff",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties;
}
function btnNeutral() {
  return {
    background: "#fff",
    color: "#334155",
    border: "1px solid #e5e7eb",
    fontWeight: 800,
    fontSize: ".95rem",
    padding: "7px 12px",
    borderRadius: 9,
    cursor: "pointer",
    display: "inline-flex",
    gap: 6,
  } as React.CSSProperties;
}

export default withRoleProtection(UsuariosAdminPage, { allowed: ["admin"] });

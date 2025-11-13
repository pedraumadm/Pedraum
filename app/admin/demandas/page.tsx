"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit as fsLimit,
  startAfter,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  where,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  PlusCircle,
  Search,
  Info,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Save,
  BadgeDollarSign,
  Wallet,
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

/* =================== Tipos & meta =================== */
type StatusCode = "pending" | "approved" | "in_progress" | "rejected" | "closed";

type Demanda = {
  id: string;
  titulo: string;
  categoria?: string;
  criador?: string;
  emailCriador?: string;
  status?: StatusCode | string;
  createdAt?: Timestamp | any;
  visibilidade?: "publica" | "oculta";
  preco?: number;
  cobrancaStatus?: "pendente" | "pago" | "isento";
};

const STATUS_META: Record<
  StatusCode,
  { label: string; color: string; bg: string; next: StatusCode }
> = {
  pending: {
    label: "Em curadoria",
    color: "#92400e",
    bg: "#fffbeb",
    next: "approved",
  },
  approved: {
    label: "Aprovada",
    color: "#059669",
    bg: "#e7faec",
    next: "in_progress",
  },
  in_progress: {
    label: "Em andamento",
    color: "#2563eb",
    bg: "#eff6ff",
    next: "closed",
  },
  closed: {
    label: "Encerrada",
    color: "#334155",
    bg: "#f1f5f9",
    next: "pending",
  },
  rejected: {
    label: "Rejeitada",
    color: "#b91c1c",
    bg: "#fef2f2",
    next: "pending",
  },
};

const CATEGORIAS = [
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

const PAGE_SIZE = 30;

/* =================== Helpers =================== */
function toDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(ts?: any) {
  const d = toDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}
function currency(n?: number) {
  return typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/* ======== busca (normalização / tokens / heurística id) ======== */
function normalize(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}
function tokenizeTerm(s = ""): string[] {
  const base = normalize(s);
  if (!base) return [];
  const parts = base.split(/[\s,.;:/\\\-_|]+/g).filter(Boolean);
  return Array.from(new Set([base, ...parts])).slice(0, 10);
}
// IDs do Firestore costumam ter ~20+ chars; ajuste se quiser
function looksLikeDocId(s = "") {
  const t = s.trim();
  return t.length >= 18;
}

/* ==== mapeia status antigos (aberta/andamento/fechada/inativa) para o padrão novo ==== */
function normalizeStatus(raw?: string): StatusCode {
  const s = (raw || "").trim();

  // já está no formato novo
  if (
    s === "pending" ||
    s === "approved" ||
    s === "in_progress" ||
    s === "rejected" ||
    s === "closed"
  ) {
    return s as StatusCode;
  }

  // legado
  switch (s) {
    case "aberta":
      return "approved";
    case "andamento":
      return "in_progress";
    case "fechada":
    case "inativa":
      return "closed";
    default:
      return "pending";
  }
}

/* =================== Toast =================== */
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  function push(text: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }
  return { push, toasts };
}

/* =================== Página =================== */
function AdminDemandasPage() {
  const { push, toasts } = useToasts();

  // lista + carregamento
  const [items, setItems] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // filtros
  const [term, setTerm] = useState(""); // agora usado (id exato + searchKeywords)
  const [fStatus, setFStatus] = useState<StatusCode | "">("");
  const [fCat, setFCat] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");

  // totais e KPIs
  const [totalGeral, setTotalGeral] = useState(0);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [kpi, setKpi] = useState({
    hoje: 0,
    andamento: 0,
    fechadas: 0,
    rejeitadas: 0,
  });

  // cursores p/ scroll infinito
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMoreRef = useRef<boolean>(false);

  // sentinela p/ IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // seleção / drawer
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const selCount = useMemo(
    () => Object.values(sel).filter(Boolean).length,
    [sel],
  );
  const [drawer, setDrawer] = useState<Demanda | null>(null);
  const [editPreco, setEditPreco] = useState("");

  /* ========= constraints a partir dos filtros ========= */
  const buildConstraints = useCallback((): QueryConstraint[] => {
    const c: QueryConstraint[] = [];

    if (fStatus) c.push(where("status", "==", fStatus));
    if (fCat) c.push(where("categoria", "==", fCat));
    if (fEmail.trim()) c.push(where("emailCriador", "==", fEmail.trim()));

    if (fIni) c.push(where("createdAt", ">=", startOfDay(new Date(fIni))));
    if (fFim) c.push(where("createdAt", "<=", endOfDay(new Date(fFim))));

    // Busca por palavra (requer campo searchKeywords e índice composto)
    if (term.trim()) {
      const tokens = tokenizeTerm(term);
      if (tokens.length > 0) {
        c.push(where("searchKeywords", "array-contains-any", tokens));
      }
    }

    return c;
  }, [fStatus, fCat, fEmail, fIni, fFim, term]);

  /* =================== contagens =================== */
  const refreshCounts = useCallback(async () => {
    const totalAll = await getCountFromServer(collection(db, "demandas"));
    setTotalGeral(totalAll.data().count);

    const base = buildConstraints();
    const totalSnap = await getCountFromServer(
      query(collection(db, "demandas"), ...base),
    );
    setTotalFiltrado(totalSnap.data().count);

    const baseNoStatus = base.filter(
      (cc: any) =>
        !(cc?.type === "where" && cc?.fieldPath?.canonicalString === "status"),
    );

    const today = startOfDay(new Date());
    const [hojeC, andC, fecC, rejC] = await Promise.all([
      getCountFromServer(
        query(
          collection(db, "demandas"),
          ...baseNoStatus.filter(
            (cc: any) => cc?.fieldPath?.canonicalString !== "createdAt",
          ),
          where("createdAt", ">=", today),
        ),
      ),
      getCountFromServer(
        query(
          collection(db, "demandas"),
          ...baseNoStatus,
          where("status", "==", "in_progress"),
        ),
      ),
      getCountFromServer(
        query(
          collection(db, "demandas"),
          ...baseNoStatus,
          where("status", "==", "closed"),
        ),
      ),
      getCountFromServer(
        query(
          collection(db, "demandas"),
          ...baseNoStatus,
          where("status", "==", "rejected"),
        ),
      ),
    ]);

    setKpi({
      hoje: hojeC.data().count,
      andamento: andC.data().count,
      fechadas: fecC.data().count,
      rejeitadas: rejC.data().count,
    });
  }, [buildConstraints]);

  /* =================== 1ª carga =================== */
  const loadFirst = useCallback(async () => {
    setLoading(true);
    setErrMsg(null);
    setSel({});
    try {
      // 0) Se o termo parece um ID exato, tenta buscar direto o documento
      try {
        const raw = term.trim();
        if (raw && looksLikeDocId(raw)) {
          const dref = doc(db, "demandas", raw);
          const dsnap = await getDoc(dref);
          if (dsnap.exists()) {
            const it = { id: dsnap.id, ...(dsnap.data() as any) } as Demanda;
            setItems([it]);
            lastDocRef.current = null;
            hasMoreRef.current = false;

            setTotalFiltrado(1);
            const totalAll = await getCountFromServer(
              collection(db, "demandas"),
            );
            setTotalGeral(totalAll.data().count);

            const today = startOfDay(new Date());
            const statusCode = normalizeStatus(it.status as string);
            setKpi({
              hoje: it.createdAt && toDate(it.createdAt)! >= today ? 1 : 0,
              andamento: statusCode === "in_progress" ? 1 : 0,
              fechadas: statusCode === "closed" ? 1 : 0,
              rejeitadas: statusCode === "rejected" ? 1 : 0,
            });

            setLoading(false);
            if (typeof window !== "undefined")
              window.scrollTo({ top: 0, behavior: "smooth" });
            return; // não segue para a query paginada
          }
        }
      } catch (e) {
        console.warn("Lookup por ID falhou (segue query normal):", e);
      }

      // 1) Query paginada normal com filtros
      const constraints = buildConstraints();
      const qPage = query(
        collection(db, "demandas"),
        ...constraints,
        orderBy("createdAt", "desc"),
        fsLimit(PAGE_SIZE),
      );
      const snap = await getDocs(qPage);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Demanda[];
      setItems(list);

      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      if (lastDocRef.current) {
        const next = await getDocs(
          query(
            collection(db, "demandas"),
            ...constraints,
            orderBy("createdAt", "desc"),
            startAfter(lastDocRef.current),
            fsLimit(1),
          ),
        );
        hasMoreRef.current = !next.empty;
      } else {
        hasMoreRef.current = false;
      }

      await refreshCounts();
    } catch (e: any) {
      console.error(e);
      setItems([]);
      if (
        e?.message?.includes("FAILED_PRECONDITION") ||
        e?.message?.includes("index")
      ) {
        setErrMsg(
          "Faltou um índice composto no Firestore. Abra o link sugerido no console para criar.",
        );
      } else {
        setErrMsg("Erro ao carregar demandas.");
        push("Erro ao carregar demandas.");
      }
    } finally {
      setLoading(false);
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [buildConstraints, refreshCounts, push, term]);

  /* =================== mais itens (scroll infinito) =================== */
  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || !hasMoreRef.current || loadingMore) return;
    setLoadingMore(true);
    setErrMsg(null);
    try {
      const constraints = buildConstraints();
      const snap = await getDocs(
        query(
          collection(db, "demandas"),
          ...constraints,
          orderBy("createdAt", "desc"),
          startAfter(lastDocRef.current),
          fsLimit(PAGE_SIZE),
        ),
      );
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Demanda[];
      setItems((prev) => [...prev, ...list]);

      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      if (lastDocRef.current) {
        const ns = await getDocs(
          query(
            collection(db, "demandas"),
            ...constraints,
            orderBy("createdAt", "desc"),
            startAfter(lastDocRef.current),
            fsLimit(1),
          ),
        );
        hasMoreRef.current = !ns.empty;
      } else {
        hasMoreRef.current = false;
      }
    } catch (e: any) {
      console.error(e);
      if (
        e?.message?.includes("FAILED_PRECONDITION") ||
        e?.message?.includes("index")
      ) {
        setErrMsg(
          "Faltou um índice composto no Firestore. Abra o link sugerido no console para criar.",
        );
      } else {
        setErrMsg("Erro ao carregar mais demandas.");
        push("Erro ao carregar mais demandas.");
      }
    } finally {
      setLoadingMore(false);
    }
  }, [buildConstraints, loadingMore, push]);

  /* =================== efeitos =================== */
  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadFirst();
    }, 300);
    return () => clearTimeout(t);
  }, [term, fStatus, fCat, fEmail, fIni, fFim]); // eslint-disable-line

  useEffect(() => {
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (
            e.isIntersecting &&
            !loading &&
            !loadingMore &&
            hasMoreRef.current
          ) {
            loadMore();
          }
        });
      },
      { rootMargin: "600px 0px 600px 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loading, loadingMore, items.length, loadMore]);

  /* =================== ações =================== */
  async function changeStatus(d: Demanda) {
    const current = normalizeStatus(d.status as string);
    const next = STATUS_META[current].next;
    await updateDoc(doc(db, "demandas", d.id), {
      status: next,
      updatedAt: serverTimestamp(),
    });
    setItems((arr) =>
      arr.map((x) =>
        x.id === d.id ? { ...x, status: next as StatusCode } : x,
      ),
    );
    await refreshCounts();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta demanda?")) return;
    await deleteDoc(doc(db, "demandas", id));
    await loadFirst();
  }

  async function toggleVis(d: Demanda) {
    const next = d.visibilidade === "oculta" ? "publica" : "oculta";
    await updateDoc(doc(db, "demandas", d.id), {
      visibilidade: next,
      updatedAt: serverTimestamp(),
    });
    setItems((arr) =>
      arr.map((x) => (x.id === d.id ? { ...x, visibilidade: next } : x)),
    );
  }

  const selectedIds = useMemo(
    () =>
      Object.entries(sel)
        .filter(([, v]) => v)
        .map(([id]) => id),
    [sel],
  );

  async function bulkStatus(next: StatusCode) {
    if (!selectedIds.length) return;
    if (
      !confirm(
        `Mudar status de ${selectedIds.length} demanda(s) para "${STATUS_META[next].label}"?`,
      )
    )
      return;
    await Promise.all(
      selectedIds.map((id) =>
        updateDoc(doc(db, "demandas", id), {
          status: next,
          updatedAt: serverTimestamp(),
        }),
      ),
    );
    await loadFirst();
  }

  async function bulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm(`Excluir ${selectedIds.length} demanda(s)?`)) return;
    await Promise.all(
      selectedIds.map((id) => deleteDoc(doc(db, "demandas", id))),
    );
    await loadFirst();
  }

  // cobrança
  async function salvarPreco() {
    if (!drawer) return;
    const val = Number(String(editPreco).replace(",", "."));
    if (isNaN(val)) return push("Informe um valor válido.");
    await updateDoc(doc(db, "demandas", drawer.id), {
      preco: val,
      updatedAt: serverTimestamp(),
    });
    setItems((a) =>
      a.map((x) => (x.id === drawer.id ? { ...x, preco: val } : x)),
    );
    setDrawer((d) => (d ? { ...d, preco: val } : d));
    push("Preço salvo.");
  }

  async function setCobranca(status: "pendente" | "pago" | "isento") {
    if (!drawer) return;
    await updateDoc(doc(db, "demandas", drawer.id), {
      cobrancaStatus: status,
      updatedAt: serverTimestamp(),
    });
    setItems((a) =>
      a.map((x) =>
        x.id === drawer.id ? { ...x, cobrancaStatus: status } : x,
      ),
    );
    setDrawer((d) => (d ? { ...d, cobrancaStatus: status } : d));
    push(`Cobrança: ${status}`);
  }

  /* =================== render =================== */
  return (
    <section className="adm">
      {/* Header */}
      <div className="adm-header">
        <div className="adm-left">
          <Link href="/admin" className="btn-sec">
            <ArrowLeft size={18} /> Voltar ao Painel
          </Link>
          <h1>Demandas Publicadas</h1>
        </div>
        <Link href="/create-demanda" className="btn-cta">
          <PlusCircle size={18} /> Nova Demanda
        </Link>
      </div>

      {/* Totais globais */}
      <div className="totals">
        <div className="total-box">
          <div className="total-label">Total de Demandas</div>
          <div className="total-value">
            {totalGeral.toLocaleString("pt-BR")}
          </div>
        </div>
        <div className="total-box muted-box">
          <div className="total-label">Total (com filtros)</div>
          <div className="total-value">
            {totalFiltrado.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-label">Criadas hoje</div>
          <div className="kpi-value" style={{ color: "#2563eb" }}>
            {kpi.hoje}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Em andamento</div>
          <div className="kpi-value" style={{ color: "#FB8500" }}>
            {kpi.andamento}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Encerradas</div>
          <div className="kpi-value" style={{ color: "#d90429" }}>
            {kpi.fechadas}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Rejeitadas</div>
          <div className="kpi-value" style={{ color: "#6b7280" }}>
            {kpi.rejeitadas}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar (id, título, criador, e-mail, categoria, etc.)"
          />
        </div>

        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value as StatusCode | "")}
        >
          <option value="">Todos Status</option>
          <option value="pending">Em curadoria</option>
          <option value="approved">Aberta / Aprovada</option>
          <option value="in_progress">Em andamento</option>
          <option value="closed">Encerrada</option>
          <option value="rejected">Rejeitada</option>
        </select>

        <select value={fCat} onChange={(e) => setFCat(e.target.value)}>
          <option value="">Todas Categorias</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="E-mail do criador (igual ao salvo)"
          value={fEmail}
          onChange={(e) => setFEmail(e.target.value)}
        />

        <div className="date-group">
          <span>De:</span>
          <input
            type="date"
            value={fIni}
            onChange={(e) => setFIni(e.target.value)}
          />
          <span>Até:</span>
          <input
            type="date"
            value={fFim}
            onChange={(e) => setFFim(e.target.value)}
          />
        </div>

        <button
          className="btn-sec"
          onClick={() => {
            setTerm("");
            setFStatus("");
            setFCat("");
            setFEmail("");
            setFIni("");
            setFFim("");
          }}
        >
          Limpar
        </button>
      </div>

      {/* Chips */}
      <div className="chips">
        {term && <Chip onX={() => setTerm("")}>Busca: “{term}”</Chip>}
        {fStatus && (
          <Chip onX={() => setFStatus("")}>
            Status: {STATUS_META[fStatus].label}
          </Chip>
        )}
        {fCat && <Chip onX={() => setFCat("")}>Categoria: {fCat}</Chip>}
        {fEmail && <Chip onX={() => setFEmail("")}>E-mail: {fEmail}</Chip>}
        {fIni && <Chip onX={() => setFIni("")}>De: {fIni}</Chip>}
        {fFim && <Chip onX={() => setFFim("")}>Até: {fFim}</Chip>}
      </div>

      {/* Lista */}
      {errMsg && <div className="error">{errMsg}</div>}

      {loading ? (
        <div className="loading">Carregando demandas…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <h3>Nada por aqui…</h3>
          <p>Tente ajustar os filtros ou criar uma nova demanda.</p>
          <Link href="/create-demanda" className="btn-cta">
            <PlusCircle size={18} /> Nova Demanda
          </Link>
        </div>
      ) : (
        <>
          {/* seleção em massa */}
          {selCount > 0 && (
            <div className="bulk">
              <span className="bulk-count">
                {selCount} selecionada{selCount > 1 ? "s" : ""}
              </span>
              <button
                className="pill pill-warn"
                onClick={() => bulkStatus("in_progress")}
              >
                Em andamento
              </button>
              <button
                className="pill pill-danger"
                onClick={() => bulkStatus("closed")}
              >
                Encerrar
              </button>
              <button
                className="pill pill-mute"
                onClick={() => bulkStatus("pending")}
              >
                Voltar para curadoria
              </button>
              <button
                className="pill pill-danger"
                style={{ marginLeft: "auto" }}
                onClick={bulkDelete}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          )}

          <div className="select-all">
            <label>
              <input
                type="checkbox"
                checked={items.length > 0 && items.every((d) => sel[d.id])}
                onChange={() => {
                  const all = items.every((d) => sel[d.id]);
                  const n: Record<string, boolean> = {};
                  items.forEach((d) => (n[d.id] = !all));
                  setSel(n);
                }}
              />
              Selecionar todos (desta tela)
            </label>
            <span className="muted">
              Mostrando {items.length} de{" "}
              {totalFiltrado.toLocaleString("pt-BR")}
            </span>
          </div>

          <div className="grid-cards">
            {items.map((d) => {
              const statusCode = normalizeStatus(d.status as string);
              const meta = STATUS_META[statusCode];

              return (
                <article key={d.id} className="card">
                  <div className="card-top">
                    <input
                      type="checkbox"
                      checked={!!sel[d.id]}
                      onChange={() =>
                        setSel((s) => ({ ...s, [d.id]: !s[d.id] }))
                      }
                      className="chk"
                    />
                    <h3 className="card-title">{d.titulo}</h3>
                    <button
                      className="icon-btn"
                      title="Detalhes"
                      onClick={() => setDrawer(d)}
                    >
                      <Info size={18} color="#2563eb" />
                    </button>
                  </div>

                  {d.categoria && (
                    <div className="card-cat">{d.categoria}</div>
                  )}
                  {(d.criador || d.emailCriador) && (
                    <div className="card-author">
                      {d.criador || "—"}{" "}
                      {d.emailCriador && (
                        <span className="muted">({d.emailCriador})</span>
                      )}
                    </div>
                  )}

                  <div className="badges">
                    <span
                      className="status"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span
                      className={
                        d.visibilidade === "oculta"
                          ? "vis-badge oculta"
                          : "vis-badge publica"
                      }
                    >
                      {d.visibilidade === "oculta" ? "Oculta" : "Pública"}
                    </span>
                    <span className="muted small">
                      Criado: {fmtDate(d.createdAt)}
                    </span>
                  </div>

                  <div className="card-actions">
                    <Link
                      href={`/admin/demandas/${d.id}/edit`}
                      className="pill pill-edit"
                    >
                      <Pencil size={16} /> Editar
                    </Link>
                    <button
                      className="pill pill-warn"
                      onClick={() => changeStatus(d)}
                      title="Trocar status"
                    >
                      <ArrowLeftRight size={16} /> Próximo status
                    </button>
                    <button className="pill" onClick={() => setDrawer(d)}>
                      Ações
                    </button>
                    <span className="muted id">{d.id.slice(0, 6)}…</span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* sentinela para scroll infinito */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {loadingMore && <div className="loading">Carregando mais…</div>}

          {!loadingMore && hasMoreRef.current && (
            <div className="loadmore">
              <button className="btn-sec" onClick={loadMore}>
                Carregar mais
              </button>
            </div>
          )}

          {!loadingMore && !hasMoreRef.current && items.length > 0 && (
            <div className="end">Fim da lista</div>
          )}
        </>
      )}

      {/* Drawer */}
      {drawer && (
        <div className="drawer-mask" onClick={() => setDrawer(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setDrawer(null)}>
              ×
            </button>

            <h3 className="drawer-title">{drawer.titulo}</h3>
            <div className="drawer-sub">
              {(() => {
                const sc = normalizeStatus(drawer.status as string);
                const meta = STATUS_META[sc];
                return (
                  <span
                    className="pill mini"
                    style={{
                      background: meta.bg,
                      color: meta.color,
                    }}
                  >
                    {meta.label}
                  </span>
                );
              })()}
              <span
                className={
                  drawer.visibilidade === "oculta"
                    ? "vis-badge oculta"
                    : "vis-badge publica"
                }
              >
                {drawer.visibilidade === "oculta" ? "Oculta" : "Pública"}
              </span>
              <span className="muted small">
                {drawer.id} • {fmtDate(drawer.createdAt)}
              </span>
            </div>

            <div className="drawer-group">
              <Link
                href={`/admin/demandas/${drawer.id}/edit`}
                className="pill pill-edit big"
              >
                <Pencil size={18} /> Editar demanda
              </Link>
              <button
                className="pill pill-warn big"
                onClick={() => changeStatus(drawer)}
              >
                <ArrowLeftRight size={18} /> Próximo status
              </button>
              <button className="pill big" onClick={() => toggleVis(drawer)}>
                {drawer.visibilidade === "oculta" ? (
                  <>
                    <Eye size={18} /> Tornar pública
                  </>
                ) : (
                  <>
                    <EyeOff size={18} /> Ocultar
                  </>
                )}
              </button>
              <button
                className="pill pill-danger big"
                onClick={() => remove(drawer.id)}
              >
                <Trash2 size={18} /> Excluir
              </button>
            </div>

            <div className="drawer-box">
              <div className="drawer-box-title">
                <Wallet size={18} /> Preço da demanda
              </div>
              <div className="drawer-inline">
                <input
                  defaultValue={drawer.preco ?? ""}
                  onChange={(e) => setEditPreco(e.target.value)}
                  placeholder="Ex.: 49.90"
                  className="drawer-input"
                />
                <button className="pill pill-primary" onClick={salvarPreco}>
                  <Save size={16} /> Salvar preço
                </button>
                <span className="muted">
                  Atual: <b>{currency(drawer.preco)}</b>
                </span>
              </div>
            </div>

            <div className="drawer-box">
              <div className="drawer-box-title">
                <BadgeDollarSign size={18} /> Status de cobrança
              </div>
              <div className="drawer-inline">
                <button
                  className="pill pill-success"
                  onClick={() => setCobranca("pago")}
                >
                  Pago
                </button>
                <button
                  className="pill pill-warn"
                  onClick={() => setCobranca("pendente")}
                >
                  Pendente
                </button>
                <button
                  className="pill pill-mute"
                  onClick={() => setCobranca("isento")}
                >
                  Isento
                </button>
                <span className="muted">
                  Atual: <b>{drawer.cobrancaStatus ?? "—"}</b>
                </span>
              </div>
            </div>

            {(drawer.criador || drawer.emailCriador) && (
              <div className="drawer-note">
                <b>Criador:</b> {drawer.criador || "—"}{" "}
                {drawer.emailCriador && (
                  <span className="muted">({drawer.emailCriador})</span>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Toasts */}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>

      {/* CSS */}
      <style jsx>{`
        .adm {
          max-width: 1380px;
          margin: 0 auto;
          padding: 30px 2vw 60px;
          background: #f8fbfd;
        }

        .adm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .adm-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        h1 {
          margin: 0;
          font-size: 2.1rem;
          font-weight: 900;
          color: #023047;
          letter-spacing: -0.5px;
        }

        .btn-sec {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          color: #023047;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          transition: background 0.14s;
        }
        .btn-sec:hover {
          background: #fafafa;
        }
        .btn-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fb8500;
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 12px 18px;
          font-weight: 900;
          box-shadow: 0 2px 14px #fb850033;
          text-decoration: none;
        }

        .totals {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .total-box {
          background: #fff;
          border: 1.5px solid #edf2f7;
          border-radius: 16px;
          padding: 14px 18px;
          box-shadow: 0 2px 14px #0000000a;
        }
        .total-label {
          color: #6b7280;
          font-weight: 700;
          font-size: 0.92rem;
        }
        .total-value {
          font-size: 1.6rem;
          font-weight: 900;
          color: #023047;
        }
        .muted-box {
          opacity: 0.9;
        }

        .kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 12px;
        }
        .kpi {
          background: #fff;
          border: 1.5px solid #edf2f7;
          border-radius: 16px;
          padding: 14px 18px;
          box-shadow: 0 2px 14px #0000000a;
        }
        .kpi-label {
          color: #6b7280;
          font-weight: 600;
          font-size: 0.92rem;
        }
        .kpi-value {
          font-size: 2rem;
          font-weight: 900;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-top: 14px;
        }
        .input-with-icon {
          position: relative;
        }
        .input-with-icon .icon {
          position: absolute;
          left: 10px;
          top: 10px;
          color: #9ca3af;
        }
        .input-with-icon input {
          height: 42px;
          padding: 0 12px 0 32px;
          border-radius: 12px;
          border: 1.5px solid #e0e7ef;
          font-weight: 600;
          color: #023047;
          background: #fff;
          min-width: 320px;
        }
        .filters select,
        .filters input[type="text"] {
          height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1.5px solid #e0e7ef;
          font-weight: 700;
          background: #fff;
        }
        .date-group {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #9ca3af;
          font-size: 0.9rem;
        }
        .date-group input {
          height: 38px;
          padding: 0 8px;
          border-radius: 10px;
          border: 1.5px solid #e0e7ef;
          font-weight: 700;
          background: #fff;
          color: #219ebc;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1.5px solid #e8edf3;
          color: #023047;
          border-radius: 10px;
          padding: 6px 10px;
          font-weight: 800;
          font-size: 0.9rem;
        }
        .chip button {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 16px;
        }

        .bulk {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid #e9ecef;
          border-radius: 16px;
          padding: 10px 12px;
          box-shadow: 0 2px 12px #0000000a;
        }
        .bulk-count {
          color: #023047;
          font-weight: 800;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #e8edf3;
          font-weight: 800;
          background: #fff;
          cursor: pointer;
        }
        .pill-edit {
          background: #e8f8fe;
          color: #2563eb;
          border: 1px solid #e0ecff;
        }
        .pill-warn {
          background: #fff7ea;
          color: #fb8500;
          border: 1px solid #ffeccc;
        }
        .pill-danger {
          background: #fff0f0;
          color: #d90429;
          border: 1px solid #ffdede;
        }
        .pill-mute {
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }
        .pill-success {
          background: #e7faec;
          color: #059669;
          border: 1px solid #d1fae5;
        }
        .pill-primary {
          background: #2563eb;
          color: #fff;
          border: 1px solid #2563eb;
        }

        .select-all {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }
        .select-all label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
        }

        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 22px;
          margin-top: 10px;
        }
        .card {
          background: #fff;
          border: 1.5px solid #eef2f7;
          border-radius: 18px;
          padding: 18px 18px 14px;
          box-shadow: 0 2px 14px #0000000a;
          transition:
            box-shadow 0.12s,
            transform 0.12s;
        }
        .card:hover {
          box-shadow: 0 6px 22px #00000014;
          transform: translateY(-1px);
        }
        .card-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .chk {
          margin-top: 3px;
        }
        .card-title {
          margin: 0;
          font-size: 1.12rem;
          font-weight: 900;
          color: #023047;
          flex: 1;
        }
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
        }
        .card-cat {
          color: #fb8500;
          font-weight: 900;
          margin-top: 3px;
        }
        .card-author {
          color: #2563eb;
          font-weight: 800;
          font-size: 0.96rem;
        }
        .card-author .muted {
          color: #94a3b8;
          font-weight: 500;
          margin-left: 4px;
        }

        .badges {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .status {
          font-weight: 900;
          font-size: 0.92rem;
          border-radius: 8px;
          padding: 4px 12px;
        }
        .vis-badge {
          font-weight: 800;
          font-size: 0.86rem;
          border-radius: 8px;
          padding: 3px 10px;
          border: 1px solid;
        }
        .vis-badge.publica {
          background: #e8f8fe;
          color: #2563eb;
          border-color: #e0ecff;
        }
        .vis-badge.oculta {
          background: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        }
        .muted {
          color: #94a3b8;
        }
        .small {
          font-size: 0.82rem;
        }
        .id {
          margin-left: auto;
          font-size: 0.82rem;
        }

        .loadmore {
          display: flex;
          justify-content: center;
          padding: 12px 0;
        }
        .loading {
          text-align: center;
          color: #219ebc;
          font-weight: 900;
          padding: 24px 0;
        }
        .end {
          text-align: center;
          color: #94a3b8;
          font-weight: 800;
          padding: 18px 0;
        }
        .error {
          margin-top: 10px;
          background: #fff5f5;
          color: #b91c1c;
          border: 1px solid #fecaca;
          padding: 10px 12px;
          border-radius: 10px;
          font-weight: 700;
        }

        .empty {
          background: #fff;
          border: 1.5px solid #edf2f7;
          border-radius: 18px;
          padding: 28px;
          text-align: center;
          box-shadow: 0 2px 14px #0000000a;
          margin-top: 12px;
        }
        .empty h3 {
          margin: 0 0 6px 0;
          color: #023047;
          font-size: 1.28rem;
          font-weight: 900;
        }
        .empty p {
          color: #6b7280;
          margin: 0 0 12px 0;
        }

        .drawer-mask {
          position: fixed;
          inset: 0;
          background: #0006;
          z-index: 1200;
          display: flex;
          justify-content: flex-end;
        }
        .drawer {
          width: min(560px, 96vw);
          height: 100%;
          background: #fff;
          padding: 22px;
          border-left: 1.5px solid #edf2f7;
          box-shadow: -6px 0 28px #00000030;
          position: relative;
          overflow: auto;
        }
        .drawer-close {
          position: absolute;
          right: 16px;
          top: 8px;
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 28px;
          cursor: pointer;
        }
        .drawer-title {
          font-size: 1.26rem;
          font-weight: 900;
          color: #023047;
          margin: 0 0 2px 0;
        }
        .drawer-sub {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .mini {
          padding: 3px 10px;
          font-size: 0.9rem;
          border-radius: 8px;
        }

        .drawer-group {
          display: grid;
          gap: 8px;
          margin: 12px 0 16px 0;
        }
        .big {
          padding: 11px 12px;
        }

        .drawer-box {
          background: #fafafa;
          border: 1.5px solid #e9ecf2;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
        }
        .drawer-box-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
          color: #023047;
          margin-bottom: 8px;
        }
        .drawer-inline {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .drawer-input {
          height: 40px;
          padding: 0 10px;
          border-radius: 10px;
          border: 1.5px solid #e0e7ef;
          font-weight: 800;
          width: 160px;
          background: #fff;
        }
        .drawer-note {
          background: #f8fafc;
          border: 1.5px solid #eef2f7;
          border-radius: 12px;
          padding: 10px;
          color: #475569;
        }

        .toasts {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 1400;
          display: grid;
          gap: 8px;
        }
        .toast {
          background: #023047;
          color: #fff;
          padding: 10px 12px;
          border-radius: 10px;
          font-weight: 800;
          box-shadow: 0 8px 20px #00000033;
        }

        @media (max-width: 900px) {
          .kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}

/* =================== componente Chip =================== */
function Chip({
  children,
  onX,
}: {
  children: React.ReactNode;
  onX: () => void;
}) {
  return (
    <span className="chip">
      {children}
      <button onClick={onX} aria-label="Remover">
        ×
      </button>
      <style jsx>{`
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid #e8edf3;
          color: #023047;
          border-radius: 10px;
          padding: 6px 10px;
          font-weight: 800;
          font-size: 0.9rem;
        }
        button {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
      `}</style>
    </span>
  );
}

export default withRoleProtection(AdminDemandasPage, { allowed: ["admin"] });

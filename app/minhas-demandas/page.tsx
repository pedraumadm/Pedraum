"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  DocumentData,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import Link from "next/link";
import {
  ClipboardList,
  Loader,
  Lightbulb,
  Edit,
  Trash2,
  Eye,
  CircleDot,
  CircleCheck,
  Clock,
  XCircle,
  Ban,
  Info,
  AlertTriangle,
} from "lucide-react";

/* ===== Tipos ===== */
type Demanda = {
  id: string;
  titulo?: string;
  descricao?: string;
  categoria?: string;
  status?: "pending" | "approved" | "in_progress" | "rejected" | "closed" | string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  cidade?: string;
  estado?: string;
  submittedBy?: string;
  userId?: string;
};
type StatusOpt = "all" | "pending" | "approved" | "in_progress" | "rejected" | "closed";

/* ===== Utils ===== */
function toDate(ts?: Timestamp | null) { try { return ts ? ts.toDate() : null; } catch { return null; } }
function fmt(d: Date | null) { return d ? d.toLocaleString("pt-BR") : "—"; }
function statusInfo(status?: string) {
  switch (status) {
    case "approved": return { label: "Aprovada", color: "#065f46", bg: "#ecfdf5", Icon: CircleCheck, ring: "#34d39955" };
    case "in_progress": return { label: "Em andamento", color: "#1d4ed8", bg: "#eff6ff", Icon: Clock, ring: "#93c5fd55" };
    case "rejected": return { label: "Rejeitada", color: "#991b1b", bg: "#fef2f2", Icon: XCircle, ring: "#fca5a555" };
    case "closed": return { label: "Encerrada", color: "#334155", bg: "#f1f5f9", Icon: Ban, ring: "#cbd5e155" };
    case "pending":
    default: return { label: "Em curadoria", color: "#92400e", bg: "#fffbeb", Icon: CircleDot, ring: "#fbbf2455" };
  }
}
const btnStyle = (bg: string, color: string, border: string, disabled = false): React.CSSProperties => ({
  background: bg, color, fontWeight: 700, borderRadius: 8, padding: "7px 14px", fontSize: 14,
  display: "inline-flex", alignItems: "center", gap: 7, border: `1.4px solid ${border}`,
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
});
function fallbackTitle(d: Demanda) {
  if (d.titulo) return d.titulo;
  const txt = (d.descricao || "").trim();
  return txt ? (txt.length > 80 ? txt.slice(0, 80) + "…" : txt) : "Demanda sem título";
}
function fallbackCategoria(d: Demanda) { return d.categoria || "—"; }
function resumo(d: Demanda, max = 160) {
  const txt = (d.descricao || "").trim();
  return txt ? (txt.length > max ? txt.slice(0, max) + "…" : txt) : "—";
}

/* ===== Página ===== */
export default function MinhasDemandasPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notLogged, setNotLogged] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusOpt>("all");
  const [error, setError] = useState<string | null>(null);

  const unsubRef = useRef<Unsubscribe[]>([]);

  /* auth */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u?.uid) { setUserId(u.uid); setNotLogged(false); }
      else { setUserId(null); setNotLogged(true); setDemandas([]); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  /* assinaturas */
  useEffect(() => {
    // limpa assinaturas antigas
    unsubRef.current.forEach((fn) => fn && fn());
    unsubRef.current = [];

    if (!userId) return;
    setLoading(true);
    setError(null);

    const colRef = collection(db, "demandas");

    // 1) docs novos: submittedBy == uid
    const q1 = query(colRef, where("submittedBy", "==", userId));
    // 2) docs antigos: userId == uid
    const q2 = query(colRef, where("userId", "==", userId));

    const merge = (a: Demanda[], b: Demanda[]) => {
      const map = new Map<string, Demanda>();
      [...a, ...b].forEach((d) => map.set(d.id, d));
      // ordena no cliente: updatedAt > createdAt > id
      return [...map.values()].sort((x, y) => {
        const ux = toDate(x.updatedAt)?.getTime() ?? 0;
        const uy = toDate(y.updatedAt)?.getTime() ?? 0;
        if (ux !== uy) return uy - ux;
        const cx = toDate(x.createdAt)?.getTime() ?? 0;
        const cy = toDate(y.createdAt)?.getTime() ?? 0;
        if (cx !== cy) return cy - cx;
        return y.id.localeCompare(x.id);
      });
    };

    let list1: Demanda[] = [];
    let list2: Demanda[] = [];

    const un1 = onSnapshot(
      q1,
      (snap) => {
        list1 = snap.docs.map((s) => ({
          id: s.id,
          ...(s.data() as DocumentData),
        })) as Demanda[];
        setDemandas(merge(list1, list2));
        setLoading(false);
      },
      (err) => { console.error(err); setError("Falha ao carregar suas demandas (submittedBy)."); setLoading(false); },
    );
    const un2 = onSnapshot(
      q2,
      (snap) => {
        list2 = snap.docs.map((s) => ({
          id: s.id,
          ...(s.data() as DocumentData),
        })) as Demanda[];
        setDemandas(merge(list1, list2));
        setLoading(false);
      },
      (err) => { console.error(err); setError("Falha ao carregar suas demandas (userId)."); setLoading(false); },
    );

    unsubRef.current = [un1, un2];
    return () => { un1(); un2(); };
  }, [userId]);

  /* contadores / filtro */
  const counters = useMemo(() => {
    const base = { all: demandas.length, pending: 0, approved: 0, in_progress: 0, rejected: 0, closed: 0 };
    for (const d of demandas) {
      const s = (d.status as StatusOpt) || "pending";
      if (s in base) (base as any)[s] += 1;
      else base.pending += 1;
    }
    return base;
  }, [demandas]);

  const listFiltered = useMemo(() => {
    if (statusFilter === "all") return demandas;
    return demandas.filter((d) => (d.status || "pending") === statusFilter);
  }, [demandas, statusFilter]);

  /* excluir */
  const handleDelete = useCallback(async (id: string) => {
    if (!userId) return;
    if (!window.confirm("Tem certeza que deseja excluir esta demanda?")) return;
    try { setDeleting(id); await deleteDoc(doc(db, "demandas", id)); }
    finally { setDeleting(null); }
  }, [userId]);

  /* UI */
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
        <h1
          style={{
            fontSize: "2.1rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px",
            background: "#f3f6fa", borderRadius: 13, boxShadow: "0 2px 12px #0001",
            padding: "7px 28px", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <ClipboardList size={31} style={{ color: "#219ebc" }} /> Minhas Demandas
        </h1>
        <Link
          href="/create-demanda"
          style={{
            background: "#FB8500", color: "#fff", fontWeight: 800, fontSize: 19, borderRadius: 13,
            padding: "12px 30px", marginLeft: 8, boxShadow: "0 2px 12px #0001",
            display: "flex", alignItems: "center", gap: 7,
          }}
        >
          + Cadastrar Demanda
        </Link>
      </div>

      {/* Aviso de erro (se houver) */}
      {error && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
            background: "#fff7f7", color: "#991b1b", border: "1px solid #fecaca",
            borderRadius: 12, padding: "10px 12px",
          }}
        >
          <AlertTriangle size={18} />
          <span style={{ fontWeight: 700 }}>{error}</span>
        </div>
      )}

      {/* Filtros */}
      {!notLogged && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
          <FilterPill active={statusFilter==="all"} onClick={()=>setStatusFilter("all")} label={`Todas (${counters.all})`} color="#0f172a" bg="#e2e8f0" />
          <FilterPill active={statusFilter==="pending"} onClick={()=>setStatusFilter("pending")} label={`Em curadoria (${counters.pending})`} {...pillStyleFromStatus("pending")} />
          <FilterPill active={statusFilter==="approved"} onClick={()=>setStatusFilter("approved")} label={`Aprovadas (${counters.approved})`} {...pillStyleFromStatus("approved")} />
          <FilterPill active={statusFilter==="in_progress"} onClick={()=>setStatusFilter("in_progress")} label={`Em andamento (${counters.in_progress})`} {...pillStyleFromStatus("in_progress")} />
          <FilterPill active={statusFilter==="rejected"} onClick={()=>setStatusFilter("rejected")} label={`Rejeitadas (${counters.rejected})`} {...pillStyleFromStatus("rejected")} />
          <FilterPill active={statusFilter==="closed"} onClick={()=>setStatusFilter("closed")} label={`Encerradas (${counters.closed})`} {...pillStyleFromStatus("closed")} />
        </div>
      )}

      {/* Estados de tela */}
      {notLogged ? (
        <EmptyLogin />
      ) : loading ? (
        <LoadingState />
      ) : listFiltered.length === 0 ? (
        <EmptyNoItems />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
          {listFiltered.map((d) => {
            const s = statusInfo(d.status);
            const created = fmt(toDate(d.createdAt));
            return (
              <div key={d.id}
                style={{
                  borderRadius: 16, boxShadow: "0 2px 20px #0001", background: "#fff",
                  border: "1.6px solid #f2f3f7", padding: "18px 18px 14px 18px",
                }}
              >
                {/* header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span title="Categoria"
                      style={{ background: "#F1F5F9", borderRadius: 7, color: "#FB8500", fontWeight: 800,
                        padding: "3px 10px", fontSize: 13, border: "1px solid #ffe5bb" }}>
                      {fallbackCategoria(d)}
                    </span>
                    <span style={{ fontWeight: 800, color: "#023047", fontSize: 16, letterSpacing: "-0.2px" }}>
                      {fallbackTitle(d)}
                    </span>
                  </div>
                  <span title={s.label}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13,
                      borderRadius: 999, padding: "6px 10px", background: s.bg, color: s.color,
                      border: `1.5px solid ${s.ring}`, whiteSpace: "nowrap" }}>
                    <s.Icon size={15} /> {s.label}
                  </span>
                </div>

                {/* desc */}
                <div style={{ color: "#667085", fontSize: 14, marginTop: 10, minHeight: 44 }}>{resumo(d)}</div>

                {/* footer */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10, flexWrap: "wrap", color: "#64748b", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Info size={15} />
                    <span>{d.cidade ? `${d.cidade}${d.estado ? `, ${d.estado}` : ""}` : d.estado || "Local não informado"}</span>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span>Criada: {created}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/edit-demanda/${d.id}`} style={btnStyle("#e3f2fd", "#2563eb", "#2563eb25")}><Edit size={16}/> Editar</Link>
                    <button onClick={() => handleDelete(d.id)} disabled={deleting===d.id} style={btnStyle("#fff6f3","#e63946","#e6394624",deleting===d.id)}>
                      <Trash2 size={16}/> {deleting===d.id ? "Excluindo..." : "Excluir"}
                    </button>
                    <Link href={`/demandas/${d.id}`} style={btnStyle("#f7fafc", "#FB8500", "#FB850022")}><Eye size={16}/> Ver</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ===== auxiliares UI ===== */
function FilterPill({ active, onClick, label, color, bg }:{active:boolean;onClick:()=>void;label:string;color:string;bg:string;}) {
  return (
    <button onClick={onClick}
      style={{
        borderRadius: 999, padding: "7px 12px", fontWeight: 800, fontSize: 12,
        border: `1.5px solid ${active ? "#0ea5e955" : "#e5e7eb"}`,
        background: active ? bg : "#fff", color: active ? color : "#0f172a",
        boxShadow: active ? "0 1px 8px #0001" : "none", cursor: "pointer",
      }}
    >{label}</button>
  );
}
function pillStyleFromStatus(status: Exclude<StatusOpt,"all">) {
  const s = statusInfo(status); return { color: s.color, bg: s.bg };
}
function EmptyLogin() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"64px 0" }}>
      <Lightbulb style={{ marginBottom:8, color:"#FB8500" }} size={44} />
      <p style={{ color:"#FB8500", fontWeight:700, fontSize:22, marginBottom:20 }}>Faça login para ver suas Demandas.</p>
      <Link href="/auth/login" style={{ padding:"14px 36px", borderRadius:13, background:"#FB8500", color:"#fff", fontWeight:800, fontSize:19, boxShadow:"0 2px 14px #0001" }}>
        Fazer login
      </Link>
    </div>
  );
}
function LoadingState() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"64px 0" }}>
      <Loader className="animate-spin mr-2" size={28} color="#219EBC" />
      <span style={{ fontSize:21, fontWeight:700, color:"#219EBC" }}>Carregando demandas...</span>
    </div>
  );
}
function EmptyNoItems() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 0" }}>
      <img src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png" alt="Sem demandas" style={{ width:74, opacity:0.7, marginBottom:15 }} />
      <p style={{ color:"#5B6476", fontSize:20, fontWeight:700, marginBottom:4 }}>Você ainda não cadastrou nenhuma demanda.</p>
      <Link href="/create-demanda" style={{ marginTop:4, padding:"12px 32px", borderRadius:11, background:"#219ebc", color:"#fff", fontWeight:800, fontSize:17, boxShadow:"0 2px 10px #0001" }}>
        Nova Demanda
      </Link>
    </div>
  );
}

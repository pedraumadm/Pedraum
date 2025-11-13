"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  limit as fbLimit,
  startAfter,
  getCountFromServer,
  serverTimestamp,
  updateDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  Loader2,
  Edit,
  PlusCircle,
  ChevronLeft,
  Eye,
  ShieldCheck,
  FileText,
  BadgeCheck,
  Trash2,
  Globe,
  EyeOff,
} from "lucide-react";

/* ================= Helpers ================= */
type Produto = {
  id: string;
  userId?: string;
  nome: string;
  descricao?: string;
  status?: "em_curadoria" | "aprovado" | "recusado" | "ajustes_solicitados" | "pausado";
  visivel?: boolean;
  imagens?: string[];
  imagem?: string;
  preco?: number | string | null;
  condicao?: string;
  hasWarranty?: boolean | null;
  warrantyMonths?: number | null;
  pdfUrl?: string | null;
  createdAt?: any;
  updatedAt?: any;
  expiraEm?: any;
  cidade?: string;
  estado?: string;
  categoria?: string;
};

function getDateFromTs(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function isExpired(createdAt?: any, expiraEm?: any) {
  const now = Date.now();
  const exp = getDateFromTs(expiraEm);
  if (exp) return now > exp.getTime();
  const c = getDateFromTs(createdAt);
  if (!c) return false;
  const plus45 = new Date(c);
  plus45.setDate(plus45.getDate() + 45);
  return now > plus45.getTime();
}
function currency(preco: any) {
  const n = Number(preco);
  if (!preco || isNaN(n) || n <= 0) return null;
  return `R$ ${n.toLocaleString("pt-BR")}`;
}
function garantiaTexto(p: Produto) {
  const cond = (p.condicao || "").toLowerCase();
  const has = p.hasWarranty || /com garantia/.test(cond);
  if (!has) return "Sem garantia";
  const m =
    typeof p.warrantyMonths === "number" && p.warrantyMonths > 0
      ? p.warrantyMonths
      : null;
  return m ? `${m}m de garantia` : "Com garantia";
}

const PAGE_SIZE = 12;

/* ================= Page ================= */
export default function MeusProdutosPage() {
  const [userId, setUserId] = useState<string | null>(null);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [counts, setCounts] = useState<Record<string, number>>({
    total: 0,
    aprovado: 0,
    em_curadoria: 0,
    ajustes_solicitados: 0,
    recusado: 0,
    pausado: 0,
  });

  // auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => setUserId(user?.uid || null));
    return () => unsub();
  }, []);

  // primeira carga
  useEffect(() => {
    if (!userId) return;
    loadFirst();
    loadCounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadFirst() {
  setLoading(true);
  try {
    // Tentativa 1: com orderBy (rápido no servidor)
    const q1 = query(
      collection(db, "produtos"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      fbLimit(PAGE_SIZE),
    );
    const snap = await getDocs(q1);
    const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Produto[];

    // fallback: se vazio OU se algum doc não tem createdAt válido, tenta sem orderBy
    const needFallback =
      docs.length === 0 ||
      docs.some((d) => !d.createdAt || (typeof d.createdAt?.toDate !== "function" && typeof d.createdAt?.seconds !== "number"));

    if (needFallback) {
      const q2 = query(
        collection(db, "produtos"),
        where("userId", "==", userId),
        fbLimit(PAGE_SIZE),
      );
      const snap2 = await getDocs(q2);
      const docs2 = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Produto[];
      // ordena no cliente por createdAt (desc)
      docs2.sort(
        (a, b) =>
          (getDateFromTs(b.createdAt)?.getTime() || 0) -
          (getDateFromTs(a.createdAt)?.getTime() || 0),
      );
      setProdutos(docs2);
      setLastDoc(snap2.docs.length ? snap2.docs[snap2.docs.length - 1] : null);
    } else {
      setProdutos(docs);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
    }
  } catch (err) {
    // fallback se houver erro de índice (failed-precondition)
    console.error("loadFirst error (tentando fallback):", err);
    const q2 = query(
      collection(db, "produtos"),
      where("userId", "==", userId),
      fbLimit(PAGE_SIZE),
    );
    const snap2 = await getDocs(q2);
    const docs2 = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Produto[];
    docs2.sort(
      (a, b) =>
        (getDateFromTs(b.createdAt)?.getTime() || 0) -
        (getDateFromTs(a.createdAt)?.getTime() || 0),
    );
    setProdutos(docs2);
    setLastDoc(snap2.docs.length ? snap2.docs[snap2.docs.length - 1] : null);
  } finally {
    setLoading(false);
  }
}


 async function loadMore() {
  if (!lastDoc || loadingMore) return;
  setLoadingMore(true);
  try {
    // Tentativa 1: com orderBy
    const q1 = query(
      collection(db, "produtos"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      fbLimit(PAGE_SIZE),
    );
    const snap = await getDocs(q1);
    let docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Produto[];

    const needFallback =
      docs.length === 0 ||
      docs.some((d) => !d.createdAt || (typeof d.createdAt?.toDate !== "function" && typeof d.createdAt?.seconds !== "number"));

    if (needFallback) {
      // Sem orderBy (o Firestore não suporta startAfter sem orderBy),
      // então apenas pega mais registros e reordena no cliente:
      const q2 = query(
        collection(db, "produtos"),
        where("userId", "==", userId),
        fbLimit(PAGE_SIZE),
      );
      const snap2 = await getDocs(q2);
      docs = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Produto[];
      docs.sort(
        (a, b) =>
          (getDateFromTs(b.createdAt)?.getTime() || 0) -
          (getDateFromTs(a.createdAt)?.getTime() || 0),
      );
      setProdutos((prev) => [...prev, ...docs]);
      setLastDoc(snap2.docs.length ? snap2.docs[snap2.docs.length - 1] : null);
    } else {
      setProdutos((prev) => [...prev, ...docs]);
      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
    }
  } catch (err) {
    console.error("loadMore error (fallback):", err);
    const q2 = query(
      collection(db, "produtos"),
      where("userId", "==", userId),
      fbLimit(PAGE_SIZE),
    );
    const snap2 = await getDocs(q2);
    const docs2 = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Produto[];
    docs2.sort(
      (a, b) =>
        (getDateFromTs(b.createdAt)?.getTime() || 0) -
        (getDateFromTs(a.createdAt)?.getTime() || 0),
    );
    setProdutos((prev) => [...prev, ...docs2]);
    setLastDoc(snap2.docs.length ? snap2.docs[snap2.docs.length - 1] : null);
  } finally {
    setLoadingMore(false);
  }
}


  async function loadCounters() {
    if (!userId) return;
    const baseQ = (field: string, val: any) =>
      query(collection(db, "produtos"), where("userId", "==", userId), where(field as any, "==", val));
    const [totalSnap, aprovSnap, pendSnap, ajusteSnap, recSnap, pausSnap] = await Promise.all([
      getCountFromServer(query(collection(db, "produtos"), where("userId", "==", userId))),
      getCountFromServer(baseQ("status", "aprovado")),
      getCountFromServer(baseQ("status", "em_curadoria")),
      getCountFromServer(baseQ("status", "ajustes_solicitados")),
      getCountFromServer(baseQ("status", "recusado")),
      getCountFromServer(baseQ("status", "pausado")),
    ]);
    setCounts({
      total: totalSnap.data().count,
      aprovado: aprovSnap.data().count,
      em_curadoria: pendSnap.data().count,
      ajustes_solicitados: ajusteSnap.data().count,
      recusado: recSnap.data().count,
      pausado: pausSnap.data().count,
    });
  }

  // publicar/despublicar (somente aprovados)
  async function togglePublish(p: Produto) {
    if (!p.status || p.status !== "aprovado") {
      alert("Só é possível publicar itens aprovados.");
      return;
    }
    const ref = doc(db, "produtos", p.id);
    await updateDoc(ref, {
      visivel: !p.visivel,
      updatedAt: serverTimestamp(),
    });
    setProdutos((prev) => prev.map((it) => (it.id === p.id ? { ...it, visivel: !p.visivel } : it)));
  }

  // excluir produto
  async function handleDelete(id: string, nome?: string) {
    const ok = confirm(`Deseja realmente excluir o produto "${nome || id}"?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "produtos", id));
      setProdutos((prev) => prev.filter((p) => p.id !== id));
      loadCounters();
      alert("Produto excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto. Tente novamente.");
    }
  }

  // total ativos (pela sua regra de expiração)
  const totalAtivos = useMemo(
    () => produtos.filter((p) => !isExpired(p.createdAt, p.expiraEm)).length,
    [produtos],
  );

  function statusBadge(p: Produto) {
    const s = p.status || "em_curadoria";
    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "4px 10px",
      borderRadius: 999,
      fontWeight: 900,
      fontSize: 12,
      border: "1px solid #e5e7eb",
    };
    const map: Record<string, React.CSSProperties> = {
      aprovado: { background: "#ecfdf5", color: "#065f46" },
      recusado: { background: "#fff1f2", color: "#9f1239" },
      ajustes_solicitados: { background: "#fffbeb", color: "#92400e" },
      pausado: { background: "#f1f5f9", color: "#111827" },
      em_curadoria: { background: "#f1f5f9", color: "#111827" },
    };
    return (
      <span style={{ ...base, ...(map[s] || {}) }}>
        {s} • Visível: <b>{p.visivel ? "Sim" : "Não"}</b>
      </span>
    );
  }

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "42px 4vw 60px 4vw",
        background: "#f7fafc",
      }}
    >
      {/* voltar */}
      <Link
        href="/painel"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
          color: "#2563eb",
          fontWeight: 800,
          fontSize: 14,
          gap: 6,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={18} /> Voltar ao Painel
      </Link>

      {/* header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-.5px",
              margin: 0,
            }}
          >
            Meus Produtos
          </h1>
          <span
            style={{
              background: "#e7f0ff",
              color: "#1e40af",
              border: "1px solid #dbeafe",
              padding: "4px 10px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {totalAtivos} ativos
          </span>
        </div>

        <Link
          href="/create-produto"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "linear-gradient(90deg,#fb8500,#219ebc)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            borderRadius: 12,
            padding: "10px 18px",
            boxShadow: "0 6px 22px rgba(33,158,188,0.20)",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <PlusCircle size={20} /> Novo Produto
        </Link>
      </div>

      {/* resumo (contadores por status) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { key: "total", label: "Total" },
          { key: "aprovado", label: "Aprovados" },
          { key: "em_curadoria", label: "Curadoria" },
          { key: "ajustes_solicitados", label: "Ajustes" },
          { key: "recusado", label: "Recusados" },
          { key: "pausado", label: "Pausados" },
        ].map((c) => (
          <div
            key={c.key}
            style={{
              borderRadius: 12,
              border: "1.5px solid #eef2f6",
              background: "#fff",
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{c.label}</div>
            <div style={{ fontSize: 22, color: "#023047", fontWeight: 900 }}>{counts[c.key]}</div>
          </div>
        ))}
      </div>

      {/* listagem */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Loader2 className="animate-spin inline-block" size={32} /> Carregando...
        </div>
      ) : produtos.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "56px 0",
            background: "#fff",
            borderRadius: 16,
            border: "1.5px solid #eef2f6",
          }}
        >
          <img
            src="/images/no-image.png"
            alt="Sem produtos"
            style={{
              width: 80,
              height: 80,
              objectFit: "contain",
              opacity: 0.6,
              marginBottom: 12,
            }}
          />
          <p
            style={{
              color: "#475569",
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Você ainda não cadastrou produtos.
          </p>
          <Link
            href="/create-produto"
            style={{
              marginTop: 6,
              padding: "10px 22px",
              borderRadius: 10,
              background: "#219ebc",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Adicionar Produto
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 18,
            }}
          >
            {produtos.map((p) => {
              const capa =
                (p.imagens && p.imagens[0]) || p.imagem || "/images/no-image.png";
              const expired = isExpired(p.createdAt, p.expiraEm);
              const preco = currency(p.preco);
              const garantia = garantiaTexto(p);
              const status = p.status || (expired ? "expirado" : "ativo");

              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 16,
                    background: "#fff",
                    border: "1.5px solid #eef2f6",
                    boxShadow: "0 4px 22px rgba(2,48,71,0.05)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ position: "relative", width: "100%", height: 180, background: "#f3f6fa" }}>
                    <img
                      src={capa}
                      alt={p.nome}
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src = "/images/no-image.png")
                      }
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {expired && <span className="chip chip-gray">EXPIRADO</span>}
                      {!expired && <span className="chip chip-green">ATIVO</span>}
                      {p.pdfUrl && (
                        <span className="chip chip-red">
                          <FileText size={13} /> PDF
                        </span>
                      )}
                    </div>
                    {/* badge de status/visibilidade */}
                    <div
                      style={{
                        position: "absolute",
                        right: 10,
                        top: 10,
                      }}
                    >
                      {statusBadge(p)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px 14px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#023047",
                          fontSize: "1.05rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {p.nome}
                      </div>
                      {preco && <div style={{ color: "#fb8500", fontWeight: 900 }}>{preco}</div>}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        color: "#334155",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {p.categoria && <span className="pill">{p.categoria}</span>}
                      {p.condicao && (
                        <span className="pill">
                          <BadgeCheck size={13} /> {p.condicao}
                        </span>
                      )}
                      <span className="pill">
                        <ShieldCheck size={13} /> {garantia}
                      </span>
                      {p.cidade && p.estado && (
                        <span className="pill">
                          {p.cidade} - {p.estado}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        color: "#5b6476",
                        fontSize: 14,
                        maxHeight: 54,
                        overflow: "hidden",
                      }}
                    >
                      {p.descricao || <span style={{ color: "#9aa6b2" }}>Sem descrição.</span>}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        href={`/edit-produto/${p.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#2563eb",
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        <Edit size={18} /> Editar
                      </Link>

                      <Link
                        href={`/produtos/${p.id}`}
                        target="_blank"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#fb8500",
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        <Eye size={18} /> Ver
                      </Link>

                      <button
                        onClick={() => togglePublish(p)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: p.visivel ? "#9a3412" : "#0369a1",
                          fontWeight: 800,
                          background: p.visivel ? "#fff7ed" : "#ecfeff",
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                        title={
                          p.status === "aprovado"
                            ? p.visivel
                              ? "Despublicar"
                              : "Publicar"
                            : "Disponível apenas para itens aprovados"
                        }
                      >
                        {p.visivel ? <EyeOff size={18} /> : <Globe size={18} />}
                        {p.visivel ? "Despublicar" : "Publicar"}
                      </button>

                      <button
                        onClick={() => handleDelete(p.id, p.nome)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#dc2626",
                          fontWeight: 800,
                          background: "none",
                          border: "1px solid #ffe5e5",
                          borderRadius: 10,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={18} /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </>
      )}

      {/* styles */}
      <style jsx>{`
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid #e5e7eb;
        }
        .chip-green {
          background: #10b981;
          color: #fff;
          border-color: #10b981;
        }
        .chip-gray {
          background: #9ca3af;
          color: #fff;
          border-color: #9ca3af;
        }
        .chip-red {
          background: #ef4444;
          color: #fff;
          border-color: #ef4444;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          color: #0f172a;
        }
        .pill-blue {
          background: #e8f3fb;
          color: #1e40af;
          border-color: #dbeafe;
        }
        .pill-gray {
          background: #eef2f7;
          color: #475569;
          border-color: #e5e7eb;
        }
      `}</style>
    </section>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
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
} from "lucide-react";

/* ================= Helpers ================= */
type Produto = {
  id: string;
  nome: string;
  descricao?: string;
  status?: string;
  imagens?: string[];
  imagem?: string;
  preco?: number | string | null;
  condicao?: string;
  hasWarranty?: boolean | null;
  warrantyMonths?: number | null;
  pdfUrl?: string | null;
  createdAt?: any;
  expiraEm?: any;
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

/* ================= Page ================= */
export default function MeusProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) =>
      setUserId(user?.uid || null),
    );
    return () => unsub();
  }, []);

  // fetch produtos
  async function fetchProdutos() {
    if (!userId) return;
    setLoading(true);
    const q = query(collection(db, "produtos"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const data: Produto[] = [];
    querySnapshot.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
    data.sort(
      (a, b) =>
        (getDateFromTs(b.createdAt)?.getTime() || 0) -
        (getDateFromTs(a.createdAt)?.getTime() || 0),
    );
    setProdutos(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchProdutos();
  }, [userId]);

  // excluir produto
  async function handleDelete(id: string, nome?: string) {
    const ok = confirm(`Deseja realmente excluir o produto "${nome || id}"?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "produtos", id));
      alert("Produto excluído com sucesso!");
      setProdutos((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      alert("Erro ao excluir produto. Tente novamente.");
    }
  }

  const totalAtivos = useMemo(
    () => produtos.filter((p) => !isExpired(p.createdAt, p.expiraEm)).length,
    [produtos],
  );

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
                      ((e.currentTarget as HTMLImageElement).src =
                        "/images/no-image.png")
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
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
                    {preco && (
                      <div style={{ color: "#fb8500", fontWeight: 900 }}>
                        {preco}
                      </div>
                    )}
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
                    <span
                      className={`pill ${expired ? "pill-gray" : "pill-blue"}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div
                    style={{
                      color: "#5b6476",
                      fontSize: 14,
                      maxHeight: 54,
                      overflow: "hidden",
                    }}
                  >
                    {p.descricao || (
                      <span style={{ color: "#9aa6b2" }}>Sem descrição.</span>
                    )}
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
                      onClick={() => handleDelete(p.id, p.nome)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#dc2626",
                        fontWeight: 800,
                        background: "none",
                        border: "none",
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

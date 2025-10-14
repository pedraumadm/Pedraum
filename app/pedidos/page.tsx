"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ClipboardList, Loader, ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

type Pedido = {
  id: string;
  titulo: string;
  status: string;
  valor: number;
  vendedorEmail: string;
  createdAt: any;
  urlDetalhes?: string;
};

export default function PedidosCompradorPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchPedidos() {
      if (!userId) return;
      setLoading(true);
      const q = query(
        collection(db, "pedidos"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const data: Pedido[] = [];
      snap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Pedido);
      });
      setPedidos(data);
      setLoading(false);
    }
    fetchPedidos();
  }, [userId]);

  return (
    <section
      style={{ maxWidth: 1100, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <Link
        href="/painel-comprador"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.1px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "7px 30px",
            background: "#f3f6fa",
            color: "#023047",
            borderRadius: "12px",
            boxShadow: "0 2px 12px #0001",
            fontWeight: 800,
            fontSize: "2rem",
          }}
        >
          Minhas Negociações
        </span>
        <ClipboardList size={34} color="#2563eb" />
      </h1>
      <div className="text-[#5B6476] mb-8" style={{ fontSize: 18 }}>
        Acompanhe aqui suas negociações, propostas e histórico de pedidos
        realizados na plataforma.
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin mr-2" size={28} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>
            Carregando pedidos...
          </span>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="text-[#6b7680] text-center py-8">
          Nenhuma negociação encontrada.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 32,
            marginBottom: 40,
          }}
        >
          {pedidos.map((p) => (
            <div
              key={p.id}
              style={{
                borderRadius: 18,
                boxShadow: "0 2px 22px #0001",
                background: "#fff",
                border: "1.5px solid #e4e8ef",
                padding: "30px 22px 22px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
                minHeight: 150,
              }}
            >
              <div
                style={{
                  color: "#023047",
                  fontWeight: 800,
                  fontSize: 19,
                  marginBottom: 4,
                }}
              >
                {p.titulo}
              </div>
              <div
                style={{
                  color: "#219ebc",
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 2,
                }}
              >
                Vendedor: {p.vendedorEmail}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 15,
                  color: "#565f6e",
                  marginBottom: 6,
                }}
              >
                <span>
                  Status:{" "}
                  <b
                    style={{
                      color:
                        p.status === "finalizado"
                          ? "#18B56D"
                          : p.status === "cancelado"
                            ? "#E85D04"
                            : "#FB8500",
                    }}
                  >
                    {p.status || "pendente"}
                  </b>
                </span>
                <span>
                  Valor:{" "}
                  <b style={{ color: "#2563eb" }}>
                    R$ {Number(p.valor).toFixed(2)}
                  </b>
                </span>
              </div>
              <div
                style={{
                  color: "#8d9297",
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                {p.createdAt?.seconds
                  ? new Date(p.createdAt.seconds * 1000).toLocaleString("pt-BR")
                  : ""}
              </div>
              {p.urlDetalhes && (
                <Link
                  href={p.urlDetalhes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#FB8500] font-bold mt-1 hover:underline"
                  style={{ fontSize: 15, marginTop: 5 }}
                >
                  Ver detalhes <ExternalLink size={17} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

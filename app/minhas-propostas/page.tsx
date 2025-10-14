"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader, ChevronLeft, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";

type Proposta = {
  id: string;
  titulo: string;
  descricao?: string;
  status?: string;
  valor?: number;
  destinatarioNome?: string;
  createdAt?: any;
};

export default function MinhasPropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchPropostas() {
      if (!userId) return;
      setLoading(true);
      const q = query(
        collection(db, "propostas"),
        where("userId", "==", userId),
      );
      const querySnapshot = await getDocs(q);
      const data: Proposta[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Proposta);
      });
      setPropostas(data);
      setLoading(false);
    }
    if (userId) fetchPropostas();
  }, [userId]);

  return (
    <section
      style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <Link
        href="/painel-vendedor"
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
          marginBottom: 38,
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
          Minhas Propostas
        </span>
      </h1>
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 0",
          }}
        >
          <Loader className="animate-spin mr-2" size={26} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>
            Carregando propostas...
          </span>
        </div>
      ) : propostas.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 0",
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/5247/5247987.png"
            alt="Sem propostas"
            style={{ width: 90, opacity: 0.68, marginBottom: 18 }}
          />
          <p
            style={{
              color: "#5B6476",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Você ainda não enviou nem recebeu propostas.
          </p>
          <span
            style={{
              marginTop: 2,
              color: "#219ebc",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Envie uma proposta para negociar com potenciais clientes!
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 32,
          }}
        >
          {propostas
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            )
            .map((prop) => (
              <div
                key={prop.id}
                style={{
                  borderRadius: 16,
                  boxShadow: "0 2px 20px #0001",
                  background: "#fff",
                  border: "1.6px solid #f2f3f7",
                  padding: "28px 26px 18px 26px",
                  marginBottom: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 180,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.17rem",
                      color: "#023047",
                    }}
                  >
                    {prop.titulo}
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.99rem",
                      borderRadius: 10,
                      padding: "7px 15px",
                      background: "#F1F5F9",
                      color: "#FB8500",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1.5px solid #ffe5bb",
                    }}
                  >
                    {prop.status ?? "Pendente"}
                  </span>
                </div>
                <div
                  style={{
                    color: "#525252",
                    fontSize: "1rem",
                    marginBottom: 4,
                  }}
                >
                  {prop.descricao || (
                    <span style={{ color: "#A0A0A0" }}>Sem detalhes.</span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ color: "#767676", fontSize: "0.97rem" }}>
                    Enviada em:{" "}
                    {prop.createdAt?.seconds
                      ? new Date(prop.createdAt.seconds * 1000).toLocaleString()
                      : "---"}
                  </span>
                  {typeof prop.valor === "number" && (
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "1.07rem",
                        color: "#219ebc",
                        background: "#F2F6F9",
                        borderRadius: 7,
                        padding: "3.5px 12px",
                        letterSpacing: ".01em",
                        border: "1px solid #e5ecf2",
                      }}
                    >
                      Valor: R${prop.valor?.toFixed(2) || "0.00"}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    borderTop: "1.2px solid #f3f3f5",
                    paddingTop: 10,
                    marginTop: 2,
                  }}
                >
                  {prop.destinatarioNome && (
                    <div
                      style={{
                        color: "#222",
                        fontSize: "1rem",
                        marginBottom: 2,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>Para:</span>{" "}
                      {prop.destinatarioNome}
                    </div>
                  )}
                  <Link
                    href={`/mensagens?proposta=${prop.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#2563eb",
                      color: "#fff",
                      borderRadius: 9,
                      fontWeight: 800,
                      fontSize: "1.03rem",
                      padding: "9px 20px",
                      boxShadow: "0 2px 8px #0001",
                      marginTop: 6,
                      textDecoration: "none",
                    }}
                  >
                    <MessageCircle size={19} /> Negociar/Conversar
                  </Link>
                  <Link
                    href={`/propostas/${prop.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#FB8500",
                      color: "#fff",
                      borderRadius: 9,
                      fontWeight: 800,
                      fontSize: "1.03rem",
                      padding: "9px 20px",
                      boxShadow: "0 2px 8px #0001",
                      marginTop: 6,
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={19} /> Ver detalhes
                  </Link>
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

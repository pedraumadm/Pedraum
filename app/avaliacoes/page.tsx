"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader, ChevronLeft, Star } from "lucide-react";
import Link from "next/link";

type Avaliacao = {
  id: string;
  nota: number;
  comentario: string;
  nomeAvaliador?: string;
  createdAt?: any;
};

export default function AvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchAvaliacoes() {
      if (!userId) return;
      setLoading(true);
      const q = query(
        collection(db, "avaliacoes"),
        where("avaliadoId", "==", userId),
      );
      const querySnapshot = await getDocs(q);
      const data: Avaliacao[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Avaliacao);
      });
      setAvaliacoes(data);
      setLoading(false);
    }
    if (userId) fetchAvaliacoes();
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
          Avaliações Recebidas
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
            Carregando avaliações...
          </span>
        </div>
      ) : avaliacoes.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 0",
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/633/633759.png"
            alt="Sem avaliações"
            style={{ width: 70, opacity: 0.7, marginBottom: 18 }}
          />
          <p
            style={{
              color: "#5B6476",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Ainda não recebeu avaliações.
          </p>
          <span
            style={{
              marginTop: 2,
              color: "#219ebc",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Quando clientes te avaliarem, você verá aqui!
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
          {avaliacoes
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            )
            .map((av) => (
              <div
                key={av.id}
                style={{
                  borderRadius: 16,
                  boxShadow: "0 2px 20px #0001",
                  background: "#fff",
                  border: "1.6px solid #f2f3f7",
                  padding: "28px 26px 18px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  position: "relative",
                  minHeight: 140,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={21}
                      color={n <= (av.nota || 0) ? "#FB8500" : "#e6e6e6"}
                      fill={n <= (av.nota || 0) ? "#FB8500" : "#e6e6e6"}
                      style={{ marginRight: 2 }}
                    />
                  ))}
                  <span
                    style={{
                      color: "#219ebc",
                      fontWeight: 700,
                      fontSize: 17,
                      marginLeft: 14,
                    }}
                  >
                    {av.nota?.toFixed(1) || "-"}
                  </span>
                </div>
                <div
                  style={{
                    color: "#525252",
                    fontSize: "1.08rem",
                    fontWeight: 600,
                    minHeight: 36,
                  }}
                >
                  {av.comentario || (
                    <span style={{ color: "#A0A0A0" }}>Sem comentário.</span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 2,
                    color: "#767676",
                    fontSize: 14,
                  }}
                >
                  <span>
                    {av.nomeAvaliador ? `Por ${av.nomeAvaliador}` : "Cliente"}
                  </span>
                  <span>
                    {av.createdAt?.seconds
                      ? new Date(
                          av.createdAt.seconds * 1000,
                        ).toLocaleDateString("pt-BR")
                      : "--/--/--"}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

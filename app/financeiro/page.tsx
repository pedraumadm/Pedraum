"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Loader,
  ChevronLeft,
  Wallet2,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";

type Movimentacao = {
  id: string;
  tipo: "credito" | "debito";
  valor: number;
  descricao?: string;
  createdAt?: any;
};

export default function FinanceiroPage() {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchMovs() {
      if (!userId) return;
      setLoading(true);
      const q = query(
        collection(db, "financeiro"),
        where("userId", "==", userId),
      );
      const querySnapshot = await getDocs(q);
      const data: Movimentacao[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Movimentacao);
      });
      setMovs(data);
      setLoading(false);
    }
    if (userId) fetchMovs();
  }, [userId]);

  // Cálculo do saldo:
  const saldo = movs.reduce(
    (total, m) =>
      m.tipo === "credito" ? total + (m.valor || 0) : total - (m.valor || 0),
    0,
  );

  return (
    <section
      style={{ maxWidth: 900, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
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
          Financeiro / Carteira
        </span>
      </h1>

      {/* Saldo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          background: "#fff",
          borderRadius: 15,
          boxShadow: "0 2px 14px #0001",
          border: "1.5px solid #e4e8ef",
          padding: "27px 34px",
          marginBottom: 42,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "#f3f6fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 29,
            color: "#FB8500",
            border: "2px solid #ffe5bb",
          }}
        >
          <Wallet2 size={32} />
        </div>
        <div>
          <div
            style={{
              color: "#7f8ea3",
              fontWeight: 700,
              fontSize: 17,
              marginBottom: 4,
            }}
          >
            Saldo disponível
          </div>
          <div
            style={{
              color: saldo > 0 ? "#18B56D" : "#E85D04",
              fontWeight: 900,
              fontSize: 31,
              letterSpacing: "-1px",
            }}
          >
            R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        {/* Futuro: botão de saque, transferência, etc */}
      </div>

      {/* Movimentações */}
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
            Carregando extrato...
          </span>
        </div>
      ) : movs.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 0",
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/2331/2331970.png"
            alt="Sem movimentações"
            style={{ width: 77, opacity: 0.7, marginBottom: 18 }}
          />
          <p
            style={{
              color: "#5B6476",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Nenhuma movimentação financeira ainda.
          </p>
          <span
            style={{
              marginTop: 2,
              color: "#219ebc",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Conforme realizar vendas ou recebimentos, seu extrato aparecerá
            aqui.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {movs
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            )
            .map((mov) => (
              <div
                key={mov.id}
                style={{
                  borderRadius: 13,
                  boxShadow: "0 2px 13px #0001",
                  background: "#fff",
                  border: "1.3px solid #f2f3f7",
                  padding: "19px 26px 15px 26px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  minHeight: 62,
                }}
              >
                <div>
                  {mov.tipo === "credito" ? (
                    <ArrowDownLeft size={27} color="#18B56D" />
                  ) : (
                    <ArrowUpRight size={27} color="#E85D04" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.13rem",
                      color: "#023047",
                      marginBottom: 2,
                    }}
                  >
                    {mov.tipo === "credito"
                      ? "Crédito recebido"
                      : "Débito/saída"}
                  </div>
                  <div
                    style={{
                      color: "#495668",
                      fontSize: "1.01rem",
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {mov.descricao ||
                      (mov.tipo === "credito"
                        ? "Recebimento na plataforma"
                        : "Movimentação de saída")}
                  </div>
                  <div
                    style={{
                      marginTop: 7,
                      color: "#919dae",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {mov.createdAt?.seconds
                      ? new Date(mov.createdAt.seconds * 1000).toLocaleString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "--/--/-- --:--"}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 21,
                    color: mov.tipo === "credito" ? "#18B56D" : "#E85D04",
                    letterSpacing: "-.5px",
                  }}
                >
                  {mov.tipo === "credito" ? "+" : "-"}R$ {mov.valor?.toFixed(2)}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

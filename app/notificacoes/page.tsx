"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader, ChevronLeft, Bell } from "lucide-react";
import Link from "next/link";

type Notificacao = {
  id: string;
  titulo: string;
  mensagem: string;
  lida?: boolean;
  tipo?: string;
  createdAt?: any;
};

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchNotificacoes() {
      if (!userId) return;
      setLoading(true);
      const q = query(
        collection(db, "notificacoes"),
        where("usuarioId", "==", userId),
      );
      const querySnapshot = await getDocs(q);
      const data: Notificacao[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Notificacao);
      });
      setNotificacoes(data);
      setLoading(false);
    }
    if (userId) fetchNotificacoes();
  }, [userId]);

  return (
    <section
      style={{ maxWidth: 1000, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <Link
        href="/painel"
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
          Notificações
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
            Carregando notificações...
          </span>
        </div>
      ) : notificacoes.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 0",
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/3602/3602123.png"
            alt="Sem notificações"
            style={{ width: 75, opacity: 0.7, marginBottom: 18 }}
          />
          <p
            style={{
              color: "#5B6476",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Nenhuma notificação no momento.
          </p>
          <span
            style={{
              marginTop: 2,
              color: "#219ebc",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Assim que houver novidades, avisaremos por aqui!
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {notificacoes
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            )
            .map((notif) => (
              <div
                key={notif.id}
                style={{
                  borderRadius: 16,
                  boxShadow: "0 2px 16px #0001",
                  background: notif.lida ? "#f7fafd" : "#fffceb",
                  border: "1.5px solid #f2f3f7",
                  padding: "24px 23px 20px 23px",
                  display: "flex",
                  flexDirection: "row",
                  gap: 20,
                  alignItems: "flex-start",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    minWidth: 46,
                    minHeight: 46,
                    borderRadius: "50%",
                    background: "#f3f6fa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    color: "#FB8500",
                    border: "1.6px solid #ffe5bb",
                    marginTop: 4,
                  }}
                >
                  <Bell size={25} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "1.14rem",
                      color: "#023047",
                      marginBottom: 5,
                    }}
                  >
                    {notif.titulo}
                  </div>
                  <div
                    style={{
                      color: "#495668",
                      fontSize: "1.01rem",
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {notif.mensagem}
                  </div>
                  <div
                    style={{
                      marginTop: 9,
                      color: "#919dae",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {notif.createdAt?.seconds
                      ? new Date(notif.createdAt.seconds * 1000).toLocaleString(
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
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

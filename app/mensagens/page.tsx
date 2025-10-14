"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  or,
  orderBy,
} from "firebase/firestore";
import { Loader, ChevronLeft, MessageCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

type Mensagem = {
  id: string;
  nomeOutroUsuario: string;
  ultimaMensagem: string;
  updatedAt?: any;
  destinatarioId: string;
  remetenteId: string;
};

export default function MensagensPage() {
  const [conversas, setConversas] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchConversas() {
      if (!userId) return;
      setLoading(true);

      // Filtro: usuário logado é destinatário OU remetente
      const q = query(
        collection(db, "mensagens"),
        where("usuarios", "array-contains", userId),
        // Se você usa campos separados, faça dois queries (ou adapte)
      );
      const querySnapshot = await getDocs(q);
      const data: Mensagem[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Mensagem);
      });

      // Ordena pela última mensagem recebida/enviada
      data.sort(
        (a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0),
      );

      setConversas(data);
      setLoading(false);
    }
    if (userId) fetchConversas();
  }, [userId]);

  return (
    <section
      style={{ maxWidth: 900, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
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
          Mensagens
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
            Carregando conversas...
          </span>
        </div>
      ) : conversas.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 0",
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/1946/1946429.png"
            alt="Sem conversas"
            style={{ width: 75, opacity: 0.68, marginBottom: 18 }}
          />
          <p
            style={{
              color: "#5B6476",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Nenhuma conversa iniciada ainda.
          </p>
          <span
            style={{
              marginTop: 2,
              color: "#219ebc",
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            Assim que você negociar com clientes, as conversas aparecerão aqui!
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {conversas.map((conversa) => (
            <Link
              key={conversa.id}
              href={`/mensagens/${conversa.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "22px 28px",
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 2px 14px #0001",
                border: "1.6px solid #f2f3f7",
                textDecoration: "none",
                transition: "box-shadow .18s, border .18s",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#f3f6fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 29,
                  fontWeight: 900,
                  color: "#2563eb",
                  border: "2px solid #e5eaf0",
                }}
              >
                <MessageCircle size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "1.14rem",
                    color: "#023047",
                  }}
                >
                  {conversa.nomeOutroUsuario || "Contato"}
                </div>
                <div
                  style={{
                    color: "#495668",
                    fontSize: "1.01rem",
                    fontWeight: 500,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 300,
                  }}
                >
                  {conversa.ultimaMensagem || "Sem mensagens ainda."}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  minWidth: 80,
                  gap: 4,
                }}
              >
                <span
                  style={{
                    color: "#2563eb",
                    fontSize: "0.98rem",
                    fontWeight: 700,
                  }}
                >
                  {conversa.updatedAt?.seconds
                    ? new Date(
                        conversa.updatedAt.seconds * 1000,
                      ).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })
                    : "--/--/--"}
                </span>
                <ArrowRight size={18} color="#FB8500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

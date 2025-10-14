"use client";
import { useEffect, useState, useRef } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ChevronLeft, SendHorizonal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Mensagem = {
  id: string;
  texto: string;
  remetenteId: string;
  nomeRemetente?: string;
  createdAt?: any;
};

export default function ConversaPage() {
  const params = useParams();
  const conversaId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
      setUserName(user?.displayName || user?.email || "");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchMsgs() {
      if (!conversaId) return;
      setLoading(true);
      const msgsRef = collection(db, "mensagens", conversaId, "itens");
      const q = query(msgsRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      const data: Mensagem[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Mensagem);
      });
      setMensagens(data);
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    fetchMsgs();
    // eslint-disable-next-line
  }, [conversaId]);

  async function enviarMensagem() {
    if (!msg.trim() || !userId) return;
    setSending(true);
    await addDoc(collection(db, "mensagens", conversaId, "itens"), {
      texto: msg.trim(),
      remetenteId: userId,
      nomeRemetente: userName,
      createdAt: serverTimestamp(),
    });
    setMsg("");
    setSending(false);
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
    // Reload mensagens
    const msgsRef = collection(db, "mensagens", conversaId, "itens");
    const q = query(msgsRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    const data: Mensagem[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as Mensagem);
    });
    setMensagens(data);
  }

  return (
    <section
      style={{
        maxWidth: 650,
        margin: "0 auto",
        padding: "42px 4vw 32px 4vw",
        minHeight: "90vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Link
        href="/mensagens"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 18,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <ChevronLeft size={19} /> Voltar
      </Link>
      <div
        style={{
          fontSize: "1.65rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.1px",
          marginBottom: 22,
          background: "#f3f6fa",
          padding: "7px 20px",
          borderRadius: 13,
          boxShadow: "0 2px 12px #0001",
          width: "fit-content",
        }}
      >
        Conversa
      </div>
      <div
        style={{
          flex: 1,
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 18px #0001",
          padding: "28px 20px 24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 350,
          maxHeight: "55vh",
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#219ebc",
              fontWeight: 700,
              fontSize: 18,
              padding: "60px 0",
            }}
          >
            Carregando mensagens...
          </div>
        ) : mensagens.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#5B6476",
              fontWeight: 700,
              fontSize: 19,
              padding: "60px 0",
            }}
          >
            Nenhuma mensagem nesta conversa ainda.
          </div>
        ) : (
          mensagens.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems:
                  m.remetenteId === userId ? "flex-end" : "flex-start",
                gap: 3,
              }}
            >
              <span
                style={{
                  background: m.remetenteId === userId ? "#2563eb" : "#FB8500",
                  color: "#fff",
                  borderRadius: 11,
                  padding: "9px 19px",
                  fontSize: 16,
                  fontWeight: 600,
                  maxWidth: 380,
                  wordBreak: "break-word",
                  boxShadow: "0 2px 10px #0001",
                }}
              >
                {m.texto}
              </span>
              <span
                style={{
                  color: "#7b809a",
                  fontSize: 13,
                  marginTop: 2,
                  marginBottom: 4,
                  textAlign: m.remetenteId === userId ? "right" : "left",
                }}
              >
                {m.nomeRemetente || "Usuário"} ·{" "}
                {m.createdAt?.seconds
                  ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString(
                      "pt-BR",
                      { hour: "2-digit", minute: "2-digit" },
                    )
                  : ""}
              </span>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>
      {/* Campo de envio */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviarMensagem();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 22,
          gap: 11,
        }}
      >
        <input
          type="text"
          placeholder="Digite sua mensagem..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          disabled={sending}
          style={{
            flex: 1,
            padding: "13px 18px",
            borderRadius: 13,
            border: "1.4px solid #e3e6ef",
            fontSize: 16,
            fontWeight: 500,
            outline: "none",
            background: "#f7fafd",
          }}
          autoFocus
        />
        <button
          type="submit"
          disabled={!msg.trim() || sending}
          style={{
            background: "#FB8500",
            border: "none",
            borderRadius: 13,
            padding: "12px 19px",
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
            boxShadow: "0 2px 10px #0001",
            transition: "opacity .16s",
          }}
        >
          <SendHorizonal size={21} />
        </button>
      </form>
    </section>
  );
}

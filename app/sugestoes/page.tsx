"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Lightbulb, Send, Loader, ChevronLeft, ThumbsUp } from "lucide-react";
import Link from "next/link";

type Sugestao = {
  id: string;
  sugestao: string;
  userEmail: string;
  createdAt: any;
  votos?: string[];
};

export default function SugestoesPage() {
  const [userEmail, setUserEmail] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const [ultimas, setUltimas] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [votando, setVotando] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserEmail(user?.email || "");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchSugestoes() {
      setLoading(true);
      const q = query(
        collection(db, "sugestoes"),
        orderBy("createdAt", "desc"),
        limit(10),
      );
      const snap = await getDocs(q);
      const data: Sugestao[] = [];
      snap.forEach((docu) => {
        data.push({ id: docu.id, ...docu.data() } as Sugestao);
      });
      setUltimas(data);
      setLoading(false);
    }
    fetchSugestoes();
  }, [msg, votando]);

  async function enviarSugestao(e: React.FormEvent) {
    e.preventDefault();
    if (!sugestao.trim()) return;
    setEnviando(true);
    setMsg("");
    try {
      await addDoc(collection(db, "sugestoes"), {
        sugestao,
        userEmail,
        createdAt: Timestamp.now(),
        votos: [],
      });
      setSugestao("");
      setMsg("Sugestão enviada com sucesso! Obrigado por contribuir.");
    } catch (e) {
      setMsg("Erro ao enviar sugestão.");
    }
    setEnviando(false);
  }

  async function votarSugestao(s: Sugestao) {
    if (!userEmail || !s.id) return;
    setVotando(s.id);
    const votos = s.votos || [];
    if (votos.includes(userEmail)) return; // já votou, nada faz
    try {
      await updateDoc(doc(db, "sugestoes", s.id), {
        votos: [...votos, userEmail],
      });
    } catch (e) {}
    setVotando(null);
  }

  return (
    <section
      style={{ maxWidth: 700, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
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
          marginBottom: 30,
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
          Sugestões
        </span>
        <Lightbulb size={34} color="#FB8500" style={{ marginLeft: 10 }} />
      </h1>

      <form
        className="bg-white rounded-2xl shadow-xl p-7 flex flex-col gap-5 mb-8"
        onSubmit={enviarSugestao}
      >
        <label className="font-semibold text-[#023047] text-lg mb-2">
          Tem uma ideia ou sugestão para melhorar a plataforma?
        </label>
        <textarea
          className="block w-full px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
          value={sugestao}
          onChange={(e) => setSugestao(e.target.value)}
          rows={4}
          maxLength={400}
          required
          placeholder="Descreva sua sugestão ou ideia..."
        />
        <button
          type="submit"
          disabled={enviando || !sugestao.trim()}
          className="bg-[#FB8500] flex items-center justify-center gap-2 text-white text-lg font-bold rounded-xl py-3 mt-2 shadow-md hover:opacity-90 transition"
        >
          {enviando ? (
            <Loader className="animate-spin" size={22} />
          ) : (
            <Send size={20} />
          )}
          {enviando ? "Enviando..." : "Enviar Sugestão"}
        </button>
        {msg && (
          <div
            className="text-center mt-2 font-semibold"
            style={{
              color: msg.includes("sucesso") ? "#18B56D" : "#E85D04",
              fontSize: 16,
            }}
          >
            {msg}
          </div>
        )}
      </form>

      <h2
        className="text-xl font-bold text-[#023047] mb-2"
        style={{ marginBottom: 12 }}
      >
        Últimas sugestões enviadas
      </h2>

      <div style={{ minHeight: 120 }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin mr-2" size={22} color="#219EBC" />
            <span style={{ fontSize: 17, fontWeight: 700, color: "#219EBC" }}>
              Carregando sugestões...
            </span>
          </div>
        ) : ultimas.length === 0 ? (
          <div className="text-[#6b7680] text-center py-6">
            Nenhuma sugestão enviada ainda. Seja o primeiro a contribuir!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {ultimas.map((s) => {
              const jaVotou = (s.votos || []).includes(userEmail);
              return (
                <div
                  key={s.id}
                  style={{
                    borderRadius: 11,
                    background: "#fffbea",
                    border: "1.1px solid #ffe5bb",
                    boxShadow: "0 2px 9px #0001",
                    padding: "16px 19px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        color: "#FB8500",
                        fontWeight: 700,
                        fontSize: 15,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Lightbulb size={18} /> {s.userEmail}
                    </div>
                    <button
                      onClick={() => votarSugestao(s)}
                      disabled={jaVotou || votando === s.id}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold transition 
                        ${jaVotou ? "bg-[#FB8500] text-white opacity-90" : "bg-[#f7fafd] text-[#FB8500] hover:bg-[#ffe5bb]"}
                        ${votando === s.id ? "opacity-60" : ""}`}
                      style={{
                        cursor: jaVotou ? "not-allowed" : "pointer",
                        border: "none",
                        minWidth: 55,
                        justifyContent: "center",
                      }}
                      title={
                        jaVotou ? "Você já votou!" : "Curtir esta sugestão"
                      }
                      type="button"
                    >
                      <ThumbsUp size={16} style={{ marginRight: 4 }} />
                      {s.votos?.length || 0}
                    </button>
                  </div>
                  <div
                    style={{
                      color: "#023047",
                      fontSize: 16,
                      fontWeight: 500,
                      marginBottom: 3,
                      marginTop: 4,
                    }}
                  >
                    {s.sugestao}
                  </div>
                  <div style={{ color: "#8d9297", fontSize: 13 }}>
                    {s.createdAt?.seconds
                      ? new Date(s.createdAt.seconds * 1000).toLocaleString(
                          "pt-BR",
                        )
                      : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

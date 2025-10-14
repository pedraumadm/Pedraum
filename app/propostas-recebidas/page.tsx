// =============================
// app/propostas-recebidas/page.tsx (Propostas Recebidas para Minhas Demandas)
// =============================
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import Link from "next/link";
import {
  Loader2,
  User,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";

interface Proposta {
  id: string;
  demandaId: string;
  userId: string;
  mensagem: string;
  valor?: string;
  status?: "pendente" | "aceita" | "recusada";
  createdAt?: any;
  userNome?: string;
  userFoto?: string;
}

export default function PropostasRecebidasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) fetchPropostas(u.uid);
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, []);

  async function fetchPropostas(uid: string) {
    setLoading(true);
    // Buscar todas as propostas recebidas em demandas do usuário logado
    const demandasSnap = await getDocs(
      query(collection(db, "demandas"), where("userId", "==", uid)),
    );
    const minhasDemandasIds = demandasSnap.docs.map((d) => d.id);
    if (minhasDemandasIds.length === 0) {
      setPropostas([]);
      setLoading(false);
      return;
    }
    const propostasSnap = await getDocs(
      query(
        collection(db, "propostas"),
        where("demandaId", "in", minhasDemandasIds),
        orderBy("createdAt", "desc"),
      ),
    );
    // Buscar dados de usuário do proponente
    const propostasList: Proposta[] = [];
    for (let docu of propostasSnap.docs) {
      const data = docu.data();
      let userNome = "Usuário";
      let userFoto = "";
      if (data.userId) {
        try {
          const userSnap = await getDocs(
            query(collection(db, "users"), where("uid", "==", data.userId)),
          );
          if (!userSnap.empty) {
            const uData = userSnap.docs[0].data();
            userNome = uData.nome || uData.email || "Usuário";
            userFoto = uData.foto || "";
          }
        } catch {}
      }
      propostasList.push({
        id: docu.id,
        ...data,
        userNome,
        userFoto,
      } as Proposta);
    }
    setPropostas(propostasList);
    setLoading(false);
  }

  async function handleStatus(
    propostaId: string,
    status: "aceita" | "recusada",
  ) {
    setUpdating(propostaId);
    await updateDoc(doc(db, "propostas", propostaId), { status });
    setPropostas((old) =>
      old.map((p) => (p.id === propostaId ? { ...p, status } : p)),
    );
    setUpdating(null);
  }

  return (
    <main className="max-w-3xl mx-auto py-10 px-2 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold text-blue-900 flex items-center gap-2 mb-7">
        <MessageCircle size={28} className="text-orange-500" /> Propostas
        Recebidas
      </h1>
      {loading ? (
        <div className="flex justify-center items-center min-h-[200px] text-blue-700 animate-pulse">
          <Loader2 className="animate-spin mr-2" />
          Carregando propostas...
        </div>
      ) : propostas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          Nenhuma proposta recebida nas suas demandas.
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {propostas.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-xl transition group"
            >
              {/* Usuário */}
              <div className="flex items-center gap-3 min-w-[100px]">
                <img
                  src={p.userFoto || "/user-avatar.png"}
                  alt="Avatar usuário"
                  className="w-14 h-14 rounded-full border-2 border-orange-200 object-cover"
                />
                <div>
                  <div className="font-bold text-blue-900 text-base line-clamp-1">
                    {p.userNome}
                  </div>
                  <Link
                    href={`/perfil-publico/${p.userId}`}
                    className="text-xs text-orange-600 font-bold underline hover:text-orange-800"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
              {/* Mensagem */}
              <div className="flex-1 min-w-0">
                <div className="text-gray-700 text-sm mb-2 line-clamp-3">
                  {p.mensagem}
                </div>
                {p.valor && (
                  <div className="font-bold text-orange-600 text-lg">{`R$ ${p.valor}`}</div>
                )}
              </div>
              {/* Status & Ações */}
              <div className="flex flex-col gap-2 sm:items-end items-start">
                {p.status === "aceita" ? (
                  <div className="flex items-center gap-1 text-green-700 font-bold">
                    <CheckCircle2 size={18} /> Aceita
                  </div>
                ) : p.status === "recusada" ? (
                  <div className="flex items-center gap-1 text-red-700 font-bold">
                    <XCircle size={18} /> Recusada
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      disabled={updating === p.id}
                      onClick={() => handleStatus(p.id, "aceita")}
                      className="px-3 py-1 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition flex gap-1 items-center disabled:opacity-70"
                    >
                      <CheckCircle2 size={16} /> Aceitar
                    </button>
                    <button
                      disabled={updating === p.id}
                      onClick={() => handleStatus(p.id, "recusada")}
                      className="px-3 py-1 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition flex gap-1 items-center disabled:opacity-70"
                    >
                      <XCircle size={16} /> Recusar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  updateDoc,
  doc,
} from "firebase/firestore";

export type Notificacao = {
  id: string;
  userId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lido: boolean;
  createdAt?: any;
  readAt?: any;
};

export function useNotificacoes(max = 20) {
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!u) {
        setItens([]);
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, "notificacoes"),
        where("userId", "==", u.uid),
        orderBy("createdAt", "desc"),
        limit(max),
      );
      const unsub = onSnapshot(q, (snap) => {
        setItens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      });
      return () => unsub();
    });
    return () => unsubAuth();
  }, [max]);

  async function marcarComoLida(id: string) {
    await updateDoc(doc(db, "notificacoes", id), {
      lido: true,
      readAt: new Date(),
    });
  }

  async function marcarTodasComoLidas() {
    const alvos = itens.filter((n) => !n.lido);
    await Promise.all(
      alvos.map((n) =>
        updateDoc(doc(db, "notificacoes", n.id), {
          lido: true,
          readAt: new Date(),
        }),
      ),
    );
  }

  const naoLidas = itens.filter((n) => !n.lido).length;

  return { itens, naoLidas, loading, marcarComoLida, marcarTodasComoLidas };
}

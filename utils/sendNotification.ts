// =============================
// utils/sendNotification.ts
// =============================

import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type NotificationPayload = {
  usuarioId: string;
  titulo: string;
  descricao?: string;
  url?: string;
};

export async function sendNotification({
  usuarioId,
  titulo,
  descricao,
  url,
}: NotificationPayload) {
  await addDoc(collection(db, "notificacoes"), {
    usuarioId,
    titulo,
    descricao: descricao || "",
    url: url || "",
    lida: false,
    data: serverTimestamp(),
  });
}

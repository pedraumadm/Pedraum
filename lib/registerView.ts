// lib/registerView.ts
import { auth, db } from "@/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

/**
 * Gera um ID de dispositivo persistente usando localStorage.
 */
function getDeviceId(): string {
  if (typeof window === "undefined") return "srv";
  const KEY = "pd_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Gera uma chave diária para deduplicar visualizações (YYYY-MM-DD).
 */
function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Registra a visualização de uma demanda no Firestore.
 * - Deduplica por dispositivo + dia (1 view por dia, por demanda, por device).
 * - Opcional: salva UID se usuário estiver logado, mas não usa UID no dedupe.
 */
export async function registerView(demandaId: string) {
  if (!demandaId) return;

  try {
    const user = auth.currentUser;
    const deviceId = getDeviceId();
    const dedupId = `dev_${deviceId}-${dayKey()}`;

    const viewRef = doc(db, "demandas", demandaId, "views", dedupId);
    const demandaRef = doc(db, "demandas", demandaId);

    // cria subdoc de view (falha se já existir → não incrementa de novo)
    await setDoc(
      viewRef,
      {
        uid: user?.uid ?? null,
        deviceId,
        createdAt: serverTimestamp(),
      },
      { merge: false },
    );

    // incrementa contador total
    await updateDoc(demandaRef, {
      visualizacoes: increment(1),
      lastViewedAt: serverTimestamp(),
    });
  } catch (err) {
    // se já existir, não faz nada → evita duplicado
    console.debug("registerView skip/err", err);
  }
}

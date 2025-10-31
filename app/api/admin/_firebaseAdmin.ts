import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Este arquivo inicializa o Firebase Admin SDK de forma segura e reutilizável.
 * Ele é usado nas rotas do admin (ex: set-password, revoke-tokens, etc).
 */

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

// Corrige o formato da chave no Vercel (substitui "\n" literal por quebra real)
const privateKey = privateKeyRaw?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("[Firebase Admin] Variáveis ausentes!");
  throw new Error(
    "Firebase Admin misconfigured: defina FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no ambiente."
  );
}

// Evita inicializar o app mais de uma vez
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

export const adminAuth = getAuth(app);

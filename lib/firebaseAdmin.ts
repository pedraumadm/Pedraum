// lib/firebaseAdmin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth as _getAuth } from "firebase-admin/auth";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";

/**
 * Aceita dois formatos:
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON  -> JSON completo (recomendado no Vercel, cole como "Plaintext")
 * 2) FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (com \n escapado)
 */
function buildCredential() {
  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (json) {
    const svc = JSON.parse(json);
    if (
      typeof svc.private_key === "string" &&
      svc.private_key.includes("\\n")
    ) {
      svc.private_key = svc.private_key.replace(/\\n/g, "\n");
    }
    return svc;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin misconfigured: defina FIREBASE_SERVICE_ACCOUNT_JSON (ou KEY) " +
        "OU FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

function ensureAdmin() {
  if (!getApps().length) {
    const credential = buildCredential();
    initializeApp({ credential: cert(credential as any) });
  }
}

export function getAdmin() {
  ensureAdmin();
  return {
    auth: _getAuth(),
    db: _getFirestore(),
  };
}

// lib/firebaseAdmin.ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth as _getAuth } from "firebase-admin/auth";
import { getFirestore as _getFirestore } from "firebase-admin/firestore";

/**
 * Aceita três formatos:
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON  -> JSON completo (Plaintext) OU Base64 do JSON
 * 2) FIREBASE_SERVICE_ACCOUNT_KEY   -> alias para o item 1 (Plaintext ou Base64)
 * 3) FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (com \n escapado)
 */
function parseServiceAccountJson(raw?: string) {
  if (!raw) return null;

  // Se vier em Base64, decodifica
  const jsonStr = raw.trim().startsWith("{")
    ? raw.trim()
    : (() => {
        try {
          return Buffer.from(raw.trim(), "base64").toString("utf8");
        } catch {
          return raw.trim(); // tenta como JSON mesmo
        }
      })();

  try {
    const svc = JSON.parse(jsonStr);
    // normaliza quebra de linha da chave
    if (typeof svc.private_key === "string" && svc.private_key.includes("\\n")) {
      svc.private_key = svc.private_key.replace(/\\n/g, "\n");
    }
    return svc;
  } catch {
    return null;
  }
}

function buildCredential() {
  // Prioridade: JSON único (Plaintext ou Base64)
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;

  const svcFromJson = parseServiceAccountJson(rawJson);
  if (svcFromJson) return svcFromJson;

  // Fallback: chaves separadas
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey && privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!projectId || !clientEmail || !privateKey) {
    // Ajuda no diagnóstico em produção sem vazar segredos
    const present = {
      hasJson: Boolean(rawJson && rawJson.length > 0),
      hasProjectId: Boolean(projectId),
      hasClientEmail: Boolean(clientEmail),
      hasPrivateKey: Boolean(privateKey),
    };
    throw new Error(
      `Firebase Admin misconfigured: defina FIREBASE_SERVICE_ACCOUNT_JSON (JSON plaintext ou Base64) ` +
        `ou (FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY). ` +
        `Present: ${JSON.stringify(present)}`
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

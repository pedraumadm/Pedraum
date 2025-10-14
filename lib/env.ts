// lib/env.ts
function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`ENV faltando: ${name}`);
  return v;
}

export const ENV = {
  NEXT_PUBLIC_BASE_URL: must("NEXT_PUBLIC_BASE_URL"),
  NEXT_PUBLIC_MP_PUBLIC_KEY: must("NEXT_PUBLIC_MP_PUBLIC_KEY"),

  MP_ACCESS_TOKEN: must("MP_ACCESS_TOKEN"),
  MP_BACKURL_SUCCESS: must("MP_BACKURL_SUCCESS"),
  MP_BACKURL_FAILURE: must("MP_BACKURL_FAILURE"),
  MP_BACKURL_PENDING: must("MP_BACKURL_PENDING"),

  FIREBASE_PROJECT_ID: must("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: must("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: must("FIREBASE_PRIVATE_KEY"),

  // Opcional: se quiser validar assinatura do webhook
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || "",
};

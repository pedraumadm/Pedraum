// lib/mercadopago.ts
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

let _client: MercadoPagoConfig | null = null;

function ensureClient(): MercadoPagoConfig {
  if (_client) return _client;
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    // Só lança quando realmente for usar o SDK
    throw new Error("MP_ACCESS_TOKEN ausente no ambiente (Vercel/.env.local).");
  }
  _client = new MercadoPagoConfig({
    accessToken: token,
    options: { timeout: 8000 },
  });
  return _client;
}

/** Preferência pronta (instanciada na hora) */
export function getPreference() {
  return new Preference(ensureClient());
}

/** Pagamentos pronto (instanciado na hora) */
export function getPayment() {
  return new Payment(ensureClient());
}

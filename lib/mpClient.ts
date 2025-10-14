// lib/mpClient.ts
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { ENV } from "./env"; // só compila no server; no client use process.env.

let mpPromise: Promise<any> | null = null;

export async function getMP() {
  if (!mpPromise) mpPromise = loadMercadoPago();
  const MP = await mpPromise;
  return new MP.MercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
    locale: "pt-BR",
  });
}

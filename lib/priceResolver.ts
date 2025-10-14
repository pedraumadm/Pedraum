// lib/priceResolver.ts
import type { Firestore } from "firebase-admin/firestore";

// onde procurar (ajuste se quiser simplificar ao seu padrão)
const FIELD_CANDIDATES = [
  "precoLead",
  "preco",
  "price",
  "valorLead",
  "valor",
] as const;

const PATHS = {
  LEAD: (leadId: string) => [`leads`, leadId],
  OPP: (leadId: string) => [`oportunidades`, leadId],
  OPP_EN: (leadId: string) => [`opportunities`, leadId],
  DEM_LEAD: (demandaId: string, leadId: string) => [
    `demandas`,
    demandaId,
    `leads`,
    leadId,
  ],
  DEMANDA: (demandaId: string) => [`demandas`, demandaId],
};

async function tryDoc(db: Firestore, parts: string[]) {
  const snap = await db.doc(parts.join("/")).get();
  if (!snap.exists) return null;
  for (const f of FIELD_CANDIDATES) {
    const v = snap.get(f);
    if (typeof v === "number" && isFinite(v) && v > 0)
      return { price: v, path: parts.join("/"), field: f };
  }
  return null;
}

export async function resolvePrice(
  db: Firestore,
  leadId: string,
  demandaId?: string,
  pathHint?: string,
) {
  if (pathHint) {
    const parts = pathHint.split("/").filter(Boolean);
    const hinted = await tryDoc(db, parts);
    if (hinted) return hinted;
  }
  // tenta em ordem
  const tries: (string[] | null)[] = [
    PATHS.LEAD(leadId),
    PATHS.OPP(leadId),
    PATHS.OPP_EN(leadId),
    demandaId ? PATHS.DEM_LEAD(demandaId, leadId) : null,
    demandaId ? PATHS.DEMANDA(demandaId) : null,
  ];

  for (const t of tries) {
    if (!t) continue;
    const r = await tryDoc(db, t);
    if (r) return r;
  }
  return null;
}

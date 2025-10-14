// src/lib/userIndexing.ts
export type CategoriaPair = { categoria: string; subcategoria: string };

export function norm(s?: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Une categorias principais (legado) + pares e retorna sem duplicatas */
export function buildCategoriesAll(
  pairs: CategoriaPair[] = [],
  legacy: string[] = [],
): string[] {
  const set = new Set<string>();
  (legacy || []).forEach((c) => c && set.add(c));
  (pairs || []).forEach((p) => p?.categoria && set.add(p.categoria));
  return Array.from(set);
}

/** Gera tokens normalizados "cat::sub" para consulta com array-contains */
export function buildPairsSearch(pairs: CategoriaPair[] = []): string[] {
  const out: string[] = [];
  for (const p of pairs) {
    if (!p?.categoria || !p?.subcategoria) continue;
    out.push(`${norm(p.categoria)}::${norm(p.subcategoria)}`);
  }
  // sem duplicatas
  return Array.from(new Set(out));
}

/** Lista de UFs em UPPERCASE; inclui "BRASIL" quando atendeBrasil=true */
export function buildUfsSearch(
  atendeBrasil?: boolean,
  ufs: string[] = [],
): string[] {
  const arr = (ufs || []).map((u) => (u || "").toString().trim().toUpperCase());
  if (atendeBrasil && !arr.includes("BRASIL")) arr.push("BRASIL");
  return Array.from(new Set(arr));
}

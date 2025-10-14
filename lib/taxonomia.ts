import type { Categoria, Subcategoria, Taxonomia } from "@/types/taxonomia";

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function normalizeTaxonomia(raw: Taxonomia): Taxonomia {
  return (raw || []).map((cat, i) => ({
    nome: cat.nome,
    slug: cat.slug || slugify(cat.nome),
    ativo: cat.ativo ?? true,
    ordem: cat.ordem ?? i + 1,
    subcategorias: (cat.subcategorias || []).map((sub, j) => ({
      nome: sub.nome,
      slug: sub.slug || slugify(sub.nome),
      ativo: sub.ativo ?? true,
      ordem: sub.ordem ?? j + 1,
    })),
  }));
}

export type TaxonomiaMaps = {
  byCatSlug: Map<string, Categoria>;
  bySubSlug: Map<string, { cat: Categoria; sub: Subcategoria }>;
};

export function buildMaps(tax: Taxonomia): TaxonomiaMaps {
  const byCatSlug = new Map<string, Categoria>();
  const bySubSlug = new Map<string, { cat: Categoria; sub: Subcategoria }>();
  tax.forEach((cat) => {
    byCatSlug.set(cat.slug!, cat);
    cat.subcategorias.forEach((sub) => bySubSlug.set(sub.slug!, { cat, sub }));
  });
  return { byCatSlug, bySubSlug };
}

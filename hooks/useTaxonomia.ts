"use client";

import { useEffect, useState } from "react";
// Firestore opcional — use se quiser no futuro
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/** ===================== Config ===================== */
const USE_ONLY_LOCAL = true;

/** ===================== Tipos ===================== */
export type Item = { nome: string; slug: string };
export type Subcat = { nome: string; slug: string; itens: Item[] };
export type Cat = { nome: string; slug: string; subcategorias: Subcat[] };

/** slug simples e estável */
function slugify(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/** ===================== Constantes de slug ===================== */
const OUTROS_SLUG = slugify("Outros");

/** Normalização robusta: aceita formatos antigos e converte para Cat/Subcat/Item (3 níveis) */
function normalizeCats3(input: any[]): Cat[] {
  const toItem = (v: any): Item => {
    const nome = (v?.nome ?? v?.name ?? v ?? "").toString().trim();
    return { nome, slug: slugify(nome) };
  };

  const toSubcat = (v: any): Subcat => {
    const nome = (v?.nome ?? v?.name ?? "").toString().trim();

    const rawItens = Array.isArray(v?.itens)
      ? v.itens
      : Array.isArray(v?.subitens)
      ? v.subitens
      : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v)
      ? v
      : typeof v === "string"
      ? [v]
      : [];

    let itens: Item[] = [];
    if (Array.isArray(rawItens) && rawItens.length > 0) {
      itens = rawItens.filter(Boolean).map(toItem);
    } else if (Array.isArray(v?.subcategorias)) {
      itens = v.subcategorias.filter(Boolean).map(toItem);
    }

    return { nome, slug: slugify(nome), itens };
  };

  return (input || [])
    .map((c) => {
      const nome = (c?.nome ?? c?.name ?? "").toString().trim();

      const rawSubs = Array.isArray(c?.subcategorias)
        ? c.subcategorias
        : Array.isArray(c?.subs)
        ? c.subs
        : Array.isArray(c?.grupos)
        ? c.grupos
        : Array.isArray(c?.itens)
        ? c.itens
        : [];

      let subcategorias: Subcat[] = [];
      if (rawSubs.every((s: any) => typeof s === "string")) {
        subcategorias = [
          {
            nome: "Geral",
            slug: slugify("Geral"),
            itens: rawSubs.map(toItem),
          },
        ];
      } else {
        subcategorias = rawSubs.filter(Boolean).map((s: any) => {
          if (typeof s === "string") {
            const item = toItem(s);
            return {
              nome: item.nome,
              slug: item.slug,
              itens: [item],
            } as Subcat;
          }
          return toSubcat(s);
        });
      }

      return { nome, slug: slugify(nome), subcategorias } as Cat;
    })
    .filter((c) => c.nome);
}

/** ===================== CATEGORIAS LOCAIS (APENAS NOME) ===================== */
/**
 * Aqui ficam só as CATEGORIAS (sem subcategorias e sem itens).
 * As 3 subcategorias padrão serão aplicadas depois para TODAS,
 * exceto para "Outros", que terá um tratamento especial.
 */
export const TAXONOMIA_LOCAL: Cat[] = [
  { nome: "Britadores", slug: slugify("Britadores"), subcategorias: [] },
  { nome: "Peneiras", slug: slugify("Peneiras"), subcategorias: [] },
  { nome: "Moinhos", slug: slugify("Moinhos"), subcategorias: [] },
  { nome: "Perfuração", slug: slugify("Perfuração"), subcategorias: [] },
  { nome: "Detonação", slug: slugify("Detonação"), subcategorias: [] },
  {
    nome: "Linha Amarela / Fora de Estrada",
    slug: slugify("Linha Amarela / Fora de Estrada"),
    subcategorias: [],
  },
  { nome: "Motores", slug: slugify("Motores"), subcategorias: [] },
  { nome: "Compressores", slug: slugify("Compressores"), subcategorias: [] },
  { nome: "Geradores", slug: slugify("Geradores"), subcategorias: [] },
  {
    nome: "Transformadores",
    slug: slugify("Transformadores"),
    subcategorias: [],
  },
  { nome: "Automação", slug: slugify("Automação"), subcategorias: [] },
  { nome: "Rolamentos", slug: slugify("Rolamentos"), subcategorias: [] },
  {
    nome: "Separadores Magnéticos e Detectores",
    slug: slugify("Separadores Magnéticos e Detectores"),
    subcategorias: [],
  },
  { nome: "Pneus", slug: slugify("Pneus"), subcategorias: [] },
  // NOVA CATEGORIA ESPECIAL
  { nome: "Outros", slug: OUTROS_SLUG, subcategorias: [] },
];

/** ===================== EXTRA_ADICOES (somente novas CATEGORIAS) ===================== */
const EXTRA_ADICOES: Cat[] = [
  {
    nome: "Correias e Transportadores",
    slug: slugify("Correias e Transportadores"),
    subcategorias: [],
  },
];

/** ===================== MERGE PROFUNDO (somente adições, sem duplicar) ===================== */
function deepMergeCats(base: Cat[], extras: Cat[]): Cat[] {
  const baseMap = new Map(base.map((c) => [c.slug, c]));
  for (const ex of extras) {
    const found = baseMap.get(ex.slug);
    if (!found) {
      base.push(ex);
      baseMap.set(ex.slug, ex);
      continue;
    }
    // se já existe a categoria, ignoramos subcategorias extras
  }
  return base;
}

/** ===================== SPLIT DE CATEGORIAS COMPOSTAS ===================== */
/**
 * Mapeia a categoria (por slug) para a lista de novas categorias (nomes).
 */
const SPLIT_CATEGORIES: Record<string, string[]> = {
  [slugify("Separadores Magnéticos e Detectores")]: [
    "Separadores Magnéticos",
    "Detectores de Metais",
  ],
  [slugify("Correias e Transportadores")]: ["Correias", "Tc´s"],
  [slugify("Linha Amarela / Fora de Estrada")]: [
    "Equipamentos Móveis", // renomeado de "Caminhões Linha Amarela"
    "Caminhões Fora de Estrada",
  ],
};

function splitCompoundCategories(cats: Cat[]): Cat[] {
  const result: Cat[] = [];
  for (const c of cats) {
    const targets = SPLIT_CATEGORIES[c.slug];
    if (!targets) {
      result.push(c);
      continue;
    }
    // duplica a estrutura para cada novo nome
    for (const newName of targets) {
      result.push({
        nome: newName,
        slug: slugify(newName),
        subcategorias: [], // será preenchido depois
      });
    }
  }
  // remove duplicatas por slug
  const bySlug = new Map<string, Cat>();
  for (const c of result) {
    if (!bySlug.has(c.slug)) {
      bySlug.set(c.slug, c);
    }
  }
  return Array.from(bySlug.values());
}

/** ===================== DEDUPE GERAL (categorias) ===================== */
function dedupeAll(cats: Cat[]): Cat[] {
  const catSeen = new Set<string>();
  const out: Cat[] = [];
  for (const c of cats) {
    if (catSeen.has(c.slug)) continue;
    catSeen.add(c.slug);
    out.push({ ...c, subcategorias: c.subcategorias || [] });
  }
  return out;
}

/** ===================== APLICA SUBCATEGORIAS ===================== */
/**
 *  - Para TODAS as categorias, exceto "Outros": 3 subcategorias padrão
 *    -> Venda de Produtos, Venda de Peças, Serviços
 *  - Para "Outros": apenas 1 subcategoria:
 *    -> "Descreva o que você precisa" (sem itens)
 */
function buildStandardSubcats(): Subcat[] {
  const baseNames = ["Venda de Produtos", "Venda de Peças", "Serviços"];
  return baseNames.map((nome) => ({
    nome,
    slug: slugify(nome),
    itens: [],
  }));
}

function buildOutrosSubcats(): Subcat[] {
  return [
    {
      nome: "Descreva o que você precisa",
      slug: slugify("Descreva o que você precisa"),
      itens: [],
    },
  ];
}

function applyStandardSubcats(cats: Cat[]): Cat[] {
  const baseSubcats = buildStandardSubcats();
  const outrosSubcats = buildOutrosSubcats();

  return cats.map((c) => {
    // Categoria especial "Outros"
    if (c.slug === OUTROS_SLUG) {
      return {
        ...c,
        subcategorias: outrosSubcats.map((s) => ({
          ...s,
          itens: [],
        })),
      };
    }

    // Demais categorias: 3 subcategorias padrão, SEM itens
    return {
      ...c,
      subcategorias: baseSubcats.map((s) => ({
        ...s,
        itens: [],
      })),
    };
  });
}

/** ===================== Hook ===================== */
export function useTaxonomia() {
  // 1) base + extras
  const merged = deepMergeCats([...TAXONOMIA_LOCAL], EXTRA_ADICOES);
  // 2) dividir categorias compostas
  const splitted = splitCompoundCategories(merged);
  // 3) dedupe geral
  const deduped = dedupeAll(splitted);
  // 4) aplica o modelo de subcategorias
  const initial = applyStandardSubcats(deduped);

  const [categorias, setCategorias] = useState<Cat[]>(initial);
  const [loading, setLoading] = useState<boolean>(!USE_ONLY_LOCAL);

  useEffect(() => {
    if (USE_ONLY_LOCAL) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "taxonomia"));
        if (!alive) return;
        const server = !snap.empty
          ? normalizeCats3(snap.docs.map((d) => d.data()))
          : TAXONOMIA_LOCAL;
        const mergedSrv = deepMergeCats([...server], EXTRA_ADICOES);
        const splittedSrv = splitCompoundCategories(mergedSrv);
        const dedupedSrv = dedupeAll(splittedSrv);
        const clean = applyStandardSubcats(dedupedSrv);
        setCategorias(clean);
      } catch {
        setCategorias(initial);
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { categorias, loading };
}

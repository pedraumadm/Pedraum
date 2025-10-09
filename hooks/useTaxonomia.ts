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

/** Normalização robusta: aceita formatos antigos e converte para Cat/Subcat/Item (3 níveis) */
function normalizeCats3(input: any[]): Cat[] {
  const toItem = (v: any): Item => {
    const nome = (v?.nome ?? v?.name ?? v ?? "").toString().trim();
    return { nome, slug: slugify(nome) };
  };

  const toSubcat = (v: any): Subcat => {
    const nome = (v?.nome ?? v?.name ?? "").toString().trim();

    const rawItens =
      Array.isArray(v?.itens) ? v.itens :
      Array.isArray(v?.subitens) ? v.subitens :
      Array.isArray(v?.items) ? v.items :
      Array.isArray(v) ? v :
      (typeof v === "string" ? [v] : []);

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

      const rawSubs =
        Array.isArray(c?.subcategorias) ? c.subcategorias :
        Array.isArray(c?.subs) ? c.subs :
        Array.isArray(c?.grupos) ? c.grupos :
        Array.isArray(c?.itens) ? c.itens :
        [];

      let subcategorias: Subcat[] = [];
      if (rawSubs.every((s: any) => typeof s === "string")) {
        subcategorias = [{
          nome: "Geral",
          slug: slugify("Geral"),
          itens: rawSubs.map(toItem),
        }];
      } else {
        subcategorias = rawSubs
          .filter(Boolean)
          .map((s: any) => {
            if (typeof s === "string") {
              const item = toItem(s);
              return { nome: item.nome, slug: item.slug, itens: [item] } as Subcat;
            }
            return toSubcat(s);
          });
      }

      return { nome, slug: slugify(nome), subcategorias } as Cat;
    })
    .filter((c) => c.nome);
}

/** ===================== TAXONOMIA LOCAL (3 NÍVEIS) ===================== */
export const TAXONOMIA_LOCAL: Cat[] = normalizeCats3([
  /* 1. Britagem */
  {
    nome: "Britagem",
    subcategorias: [
      {
        nome: "Britadores",
        itens: [
          "Britador de Mandíbulas",
          "Britador Cônico",
          "Britador de Impacto",
          "Britador de Rolos",
          "Rebritador",
          "Britador Giratório",
          "Britador Móvel",
        ],
      },
      {
        nome: "Peças",
        itens: [
          "Mandíbulas",
          "Revestimentos de britador",
          "Barras de impacto",
          "Chapas de desgaste",
          "Engrenagens (Coroa e Pinhão)",
          "Eixos",
          "Buchas de bronze",
          "Polias",
          "Molas",
          "Mancais",
        ],
      },
      { nome: "Serviços", itens: ["Manutenção", "Revisão", "Reformas", "Motores"] },
      {
        nome: "Aluguel",
        itens: [
          "Britador móvel",
          "Planta móvel (Unidade Móvel de Britagem)",
          "Britador",
          "Planta Britagem",
        ],
      },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 2. Peneiramento */
  {
    nome: "Peneiramento",
    subcategorias: [
      {
        nome: "Peneiras",
        itens: [
          "Peneira Vibratória",
          "Peneira Trommel",
          "Peneira Fixa",
          "Peneira Rotativa",
          "Peneira Móvel",
        ],
      },
      {
        nome: "Peças",
        itens: [
          "Telas metálicas",
          "Telas de borracha",
          "Grelhas",
          "Engrenagens",
          "Eixos",
          "Buchas",
          "Mancais",
          "Molas",
          "Motovibrador",
        ],
      },
      { nome: "Serviços", itens: ["Manutenção preventiva e corretiva"] },
      { nome: "Aluguel", itens: ["Peneira móvel"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 3. Moinhos */
  {
    nome: "Moinhos",
    subcategorias: [
      { nome: "Moinhos", itens: ["Moinho de Barra", "Moinho Vertical", "Moinho de Bolas", "Moinho SAG, FAG"] },
      { nome: "Serviços", itens: ["Manutenção", "Reforma", "Revisão"] },
      { nome: "Aluguel", itens: ["Moinhos"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 4. Perfuração */
  {
    nome: "Perfuração",
    subcategorias: [
      {
        nome: "Perfuratrizes",
        itens: [
          "Perfuratriz Rotativa",
          "Perfuratriz Hidráulica",
          "Perfuratriz Pneumática",
          "Perfuratriz Elétrica",
          "Perfuratriz Subterrânea",
          "Rompedor Hidráulico",
          "Rompedor Pneumático",
        ],
      },
      {
        nome: "Peças",
        itens: [
          "Brocas para rochas",
          "Varetas de extensão",
          "Coroas diamantadas",
          "Hastes",
          "Pastilhas de desgaste",
          "Engrenagens",
          "Eixos",
          "Buchas",
          "Mancais",
          "Molas",
          "Pontas",
          "Martelos",
        ],
      },
      { nome: "Serviços", itens: ["Manutenção", "Revisão", "Reforma"] },
      { nome: "Aluguel", itens: ["Perfuratrizes", "Rompedores"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 5. Detonação */
  {
    nome: "Detonação",
    subcategorias: [
      {
        nome: "Produtos",
        itens: [
          "Explosivos Civis",
          "Explosivo Dinamite",
          "Explosivo ANFO",
          "Explosivo Industrial",
          "Detonador Elétrico",
          "Detonador Não Elétrico",
          "Cordéis detonadores",
          "Drop Ball",
          "Esferas",
        ],
      },
    ],
  },

  /* 6. Linha Amarela / Fora de Estrada */
  {
    nome: "Linha Amarela / Fora de Estrada",
    subcategorias: [
      {
        nome: "Máquinas",
        itens: [
          "Carregadeiras",
          "Escavadeiras",
          "Retroescavadeiras",
          "Tratores",
          "Motoniveladoras",
          "Caminhões Fora-de-Estrada",
          "Caminhões de Apoio",
          "Rolo Compactador",
        ],
      },
      {
        nome: "Peças e Componentes",
        itens: [
          "Caçambas",
          "Braços e lanças",
          "Lâminas",
          "Ripper / Subsolador",
          "Cabines",
          "Esteira",
          "Chassis",
          "Tanques",
          "Cilindros hidráulicos",
          "Bombas",
          "Motores",
          "Caixas de câmbio",
          "Caixas de Transmissão",
          "Eixos",
          "Eixos diferenciais",
          "Faróis",
          "Painéis elétricos / ECU",
          "Joysticks",
          "Cabos e chicotes elétricos",
          "Pneus OTR",
          "Rodas",
          "Assentos",
          "Cintos de segurança",
          "Quick couplers e acopladores de implementos",
          "Martelos hidráulicos",
          "Implementos",
        ],
      },
      { nome: "Serviços", itens: ["Manutenção", "Revisão", "Reforma"] },
      { nome: "Aluguel", itens: ["Máquinas de linha amarela"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 7. Motores */
  {
    nome: "Motores",
    subcategorias: [
      {
        nome: "Tipos",
        itens: [
          "Motores Diesel",
          "Motores Elétricos",
          "Motores para exaustores industriais",
          "Motores para planta de britagem",
          "Motores para peneiramento",
        ],
      },
      {
        nome: "Peças de Reposição",
        itens: [
          "Bloco do motor",
          "Cabeçote",
          "Válvulas",
          "Pistões",
          "Kits de pistão e anéis, bielas, bronzinas",
          "Bombas",
          "Injetores e bicos de combustível",
          "Turbo / supercharger",
          "Alternadores e motor de arranque",
          "Correias",
          "Polias",
          "Filtros",
          "Selos",
          "Retentores",
        ],
      },
      {
        nome: "Serviços",
        itens: [
          "Manutenção",
          "Reforma",
          "Revisão",
          "Rebuild",
          "Retífica",
          "Testes e diagnósticos",
        ],
      },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 8. Compressores */
  {
    nome: "Compressores",
    subcategorias: [
      {
        nome: "Compressores",
        itens: [
          "De ar para ferramentas pneumáticas",
          "De ar para perfuratrizes",
          "Compressores de parafuso",
          "Compressores de pistão",
          "Portáteis diesel",
          "Portáteis elétricos",
        ],
      },
      {
        nome: "Peças",
        itens: [
          "Pistões",
          "Bielas",
          "Rolamentos",
          "Válvulas",
          "Selos",
          "Retentores",
          "Correias",
          "Polias",
          "Filtros de ar",
          "Filtros de óleo",
          "Filtros de combustível",
        ],
      },
      {
        nome: "Serviços",
        itens: ["Manutenção", "Rebuild", "Troca de rolamentos", "Lubrificação"],
      },
      { nome: "Aluguel", itens: ["Compressores móveis"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 9. Geradores */
  {
    nome: "Geradores",
    subcategorias: [
      {
        nome: "Tipos",
        itens: ["Diesel estacionários e portáteis", "Elétricos AC / DC", "Grupos geradores (Gensets)"],
      },
      {
        nome: "Peças de reposição",
        itens: [
          "Motor diesel",
          "Alternador",
          "Painel",
          "Conectores",
          "Baterias",
          "Filtros",
          "Correias",
          "Rolamentos",
          "Selos",
        ],
      },
      {
        nome: "Serviços",
        itens: ["Manutenção", "Rebuild", "Teste de carga", "Substituição de baterias"],
      },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 10. Transformadores */
  {
    nome: "Transformadores",
    subcategorias: [
      { nome: "Tipos", itens: ["Potência", "Distribuição a seco", "Distribuição a óleo", "Móveis"] },
      { nome: "Peças", itens: ["Núcleo", "Bobinas", "Buchas", "Conectores", "Radiadores"] },
      { nome: "Consumíveis", itens: ["Óleo isolante", "Graxas", "Líquidos dielétricos"] },
      { nome: "Serviços", itens: ["Instalação", "Manutenção", "Teste de isolamento"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 11. Automação */
  {
    nome: "Automação",
    subcategorias: [
      {
        nome: "Equipamentos",
        itens: [
          "CLP / PLC",
          "SCADA / supervisórios",
          "Sensores",
          "Atuadores",
          "Inversores / VFD",
          "Painéis de comando e proteção",
        ],
      },
      {
        nome: "Peças de reposição",
        itens: [
          "Módulos de CLP",
          "Relés",
          "Contactores",
          "Sensores",
          "Cabos",
          "Displays HMI",
          "Pilhas de memória",
          "Ventoinhas",
        ],
      },
      { nome: "Serviços", itens: ["Programação", "Instalação", "Calibração", "Manutenção", "Revisão", "Reforma"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 12. Rolamentos */
  {
    nome: "Rolamentos",
    subcategorias: [
      {
        nome: "Tipos",
        itens: [
          "Esferas",
          "Rolos cilíndricos, cônicos",
          "Esféricos",
          "Agulhas",
          "Autocompensadores",
          "Cruzados",
          "Alta carga",
          "Selados e blindados",
        ],
      },
      { nome: "Serviços", itens: ["Substituição", "Realinhamento", "Lubrificação", "Inspeção de desgaste"] },
    ],
  },

  /* 13. Separadores Magnéticos e Detectores */
  {
    nome: "Separadores Magnéticos e Detectores",
    subcategorias: [
      {
        nome: "Equipamentos",
        itens: [
          "Separadores de tambor magnético",
          "Overband",
          "Fluxo contínuo",
          "Eletroímãs suspensos",
          "Ímãs permanentes",
          "Detector de metais (manual, industrial, alta frequência)",
          "Transportadores magnéticos",
          "Correias magnéticas",
        ],
      },
      {
        nome: "Peças de reposição",
        itens: ["Bobinas de cobre", "Cabos", "Chicotes", "Placas magnéticas", "Grades", "Rolos"],
      },
      { nome: "Serviços", itens: ["Manutenção", "Reforma", "Revisão", "Troca de componentes"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /* 15. Pneus */
  {
    nome: "Pneus",
    subcategorias: [
      { nome: "Tipos", itens: ["Pneus OTR", "Industriais", "Sólidos", "Radiais e diagonais"] },
      { nome: "Peças de reposição", itens: ["Câmaras de ar", "Válvulas", "Sensores TPMS", "Flanges", "Aros"] },
      {
        nome: "Serviços",
        itens: [
          "Montagem",
          "Balanceamento",
          "Recapagem",
          "Inspeção",
          "Rotação",
          "Substituição de válvulas",
        ],
      },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },
]);

/** ===================== EXTRA_ADICOES (somente ADIÇÕES) ===================== */
const EXTRA_ADICOES: Cat[] = normalizeCats3([
  /** Correias e Transportadores (vai ser dividido depois) */
  {
    nome: "Correias e Transportadores",
    subcategorias: [
      {
        nome: "Transportadores",
        itens: [
          "Transportador de Correia Fixo",
          "Transportador de Correia Móvel",
          "Transportador de Correia",
          "Transportador Radial",
          "Transportador Reversível",
          "Transportador Tubular",
          "Transportador de Correia Magnética",
          "Transportador de Corrente (corrente metálica)",
          "Transportador de Correia sobre roletes",
          "Correia Transportadora Elevatória",
          "Correia de Transferência",
          "Correia de Retorno",
          "Correia de Cauda e Cabeceira",
          "Alimentador de Correia",
          "Alimentador Vibratório",
          "Alimentador de Placas",
          "Calha Vibratória",
        ],
      },
      {
        nome: "Peças",
        itens: [
          "Correias de lona",
          "Correias de aço",
          "Correias de borracha",
          "Roletes de carga",
          "Roletes de retorno",
          "Roletes de impacto",
          "Roletes de limpeza",
          "Tambor de acionamento",
          "Tambor de retorno",
          "Eixos",
          "Mancais",
          "Acoplamentos",
          "Polias",
          "Esticadores de correia",
          "Guias laterais",
          "Raspadores",
          "Bicas e chutes de descarga",
          "Estruturas metálicas",
          "Suportes",
          "Sensores de desalinhamento",
          "Chaves de emergência",
          "Limitadores de velocidade",
          "Sistema de lubrificação",
          "Rolamentos",
          "Buchas",
          "Parafusos",
          "Porcas",
          "Arruelas industriais",
          "Pás e raspadores de limpeza",
        ],
      },
      { nome: "Serviços", itens: ["Montagem", "Manutenção", "Reparo"] },
      { nome: "Outros", itens: ["Caixa para escrever"] },
    ],
  },

  /** Moinhos — Peças + Serviços + Aluguel */
  {
    nome: "Moinhos",
    subcategorias: [
      {
        nome: "Peças",
        itens: [
          "Grelhas",
          "Bolas",
          "Barras",
          "Pinhão",
          "Eixos",
          "Mancais",
          "Buchas",
          "Polias",
          "Correias",
          "Rolamentos",
          "Redutores de velocidade",
          "Acoplamentos elásticos e rígidos",
          "Anéis de vedação",
          "Selos e retentores",
          "Chavetas",
          "Parafusos e porcas de fixação",
          "Tampas de inspeção",
          "Carcaças",
          "Suportes de base",
          "Motor",
          "Redutor",
          "Painel elétrico de controle",
          "Sensores de vibração",
          "Sensores de temperatura",
          "Bombas de lubrificação",
          "Filtros e reservatórios de óleo",
          "Sistema de refrigeração de óleo",
          "Válvulas e conexões hidráulicas",
          "Anéis de desgaste",
          "Grades internas",
          "Telas internas",
          "Revestimentos cerâmicos",
          "Revestimento de borracha",
          "Buchas do tambor",
          "Rolos de apoio",
          "Correntes",
        ],
      },
      {
        nome: "Serviços",
        itens: [
          "Usinagem",
          "Reforma",
          "Balanceamento de rotores e eixos",
          "Manutenção",
          "Alinhamento de eixo e engrenagens",
          "Montagem e desmontagem de moinhos",
          "Troca de revestimentos",
          "Análise de vibração e ruído",
          "Lubrificação e troca de óleo",
          "Retífica de mancais",
        ],
      },
      { nome: "Aluguel", itens: ["Aluguel de moinho"] },
    ],
  },

  /** Separadores Magnéticos e Detectores — novas peças (será dividido depois) */
  {
    nome: "Separadores Magnéticos e Detectores",
    subcategorias: [
      {
        nome: "Peças de reposição",
        itens: [
          "Filtro Magnético",
          "Filtro Eletromagnético",
          "Polia Magnética",
          "Vassoura Magnética",
        ],
      },
    ],
  },
]);

/** ===================== MERGE PROFUNDO (somente adições, sem duplicar) ===================== */
function deepMergeCats(base: Cat[], extras: Cat[]): Cat[] {
  const baseMap = new Map(base.map(c => [c.slug, c]));
  for (const ex of extras) {
    const found = baseMap.get(ex.slug);
    if (!found) {
      base.push(ex);
      baseMap.set(ex.slug, ex);
      continue;
    }
    const subMap = new Map(found.subcategorias.map(s => [s.slug, s]));
    for (const sub of ex.subcategorias) {
      const sFound = subMap.get(sub.slug);
      if (!sFound) {
        found.subcategorias.push(sub);
        subMap.set(sub.slug, sub);
        continue;
      }
      const itemSet = new Set(sFound.itens.map(i => i.slug));
      for (const it of sub.itens) {
        if (!itemSet.has(it.slug)) sFound.itens.push(it);
      }
    }
  }
  return base;
}

/** ===================== SPLIT DE CATEGORIAS COMPOSTAS ===================== */
/**
 * Mapeia a categoria (por slug) para a lista de novas categorias (nomes).
 * Para adicionar um novo split, é só colocar mais uma entrada aqui.
 */
const SPLIT_CATEGORIES: Record<string, string[]> = {
  [slugify("Separadores Magnéticos e Detectores")]: [
    "Separadores Magnéticos",
    "Detectores",
  ],
  [slugify("Correias e Transportadores")]: [
    "Correias",
    "Transportadores",
  ],
  [slugify("Linha Amarela / Fora de Estrada")]: [
    "Linha Amarela",
    "Fora de Estrada",
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
        subcategorias: c.subcategorias.map((s) => ({
          nome: s.nome,
          slug: s.slug, // manter slug das subcats ajuda a mesclar itens depois
          itens: s.itens.map((i) => ({ nome: i.nome, slug: i.slug })),
        })),
      });
    }
  }
  // remove duplicatas por slug (caso já existisse uma das novas no base/extras)
  const bySlug = new Map<string, Cat>();
  for (const c of result) bySlug.set(c.slug, bySlug.get(c.slug) ?? c);
  return Array.from(bySlug.values());
}

/** ===================== DEDUPE GERAL (categorias, subcats, itens) ===================== */
function dedupeAll(cats: Cat[]): Cat[] {
  const catSeen = new Set<string>();
  const out: Cat[] = [];
  for (const c of cats) {
    if (catSeen.has(c.slug)) continue;
    catSeen.add(c.slug);

    const subSeen = new Set<string>();
    const subOut: Subcat[] = [];
    for (const s of c.subcategorias) {
      if (subSeen.has(s.slug)) continue;
      subSeen.add(s.slug);

      const itemSeen = new Set<string>();
      const itensOut: Item[] = [];
      for (const it of s.itens) {
        if (itemSeen.has(it.slug)) continue;
        itemSeen.add(it.slug);
        itensOut.push(it);
      }
      subOut.push({ ...s, itens: itensOut });
    }
    out.push({ ...c, subcategorias: subOut });
  }
  return out;
}

/** ===================== Hook ===================== */
export function useTaxonomia() {
  // 1) base + extras
  const merged = deepMergeCats([...TAXONOMIA_LOCAL], EXTRA_ADICOES);
  // 2) dividir categorias compostas
  const splitted = splitCompoundCategories(merged);
  // 3) dedupe geral (garante 1 ocorrência no select)
  const initial = dedupeAll(splitted);

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
        const server = !snap.empty ? normalizeCats3(snap.docs.map(d => d.data())) : TAXONOMIA_LOCAL;
        const mergedSrv = deepMergeCats([...server], EXTRA_ADICOES);
        const splittedSrv = splitCompoundCategories(mergedSrv);
        const clean = dedupeAll(splittedSrv);
        setCategorias(clean);
      } catch {
        setCategorias(initial);
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { categorias, loading };
}

"use client";

import { useEffect, useState } from "react";
// Firestore opcional — use se quiser no futuro
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/** ===================== Config ===================== */
// true = usa somente a lista local (recomendado agora)
// false = tenta buscar no Firestore (e cai pro local se falhar)
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

    // Detecta possíveis formatos de "itens" no segundo nível
    const rawItens =
      Array.isArray(v?.itens) ? v.itens :
      Array.isArray(v?.subitens) ? v.subitens :
      Array.isArray(v?.items) ? v.items :
      Array.isArray(v) ? v : // se vier como array direto
      // fallback: se vier como strings simples no lugar de itens
      (typeof v === "string" ? [v] : []);

    // Se não houver "itens" mas houver strings diretas, converte
    let itens: Item[] = [];
    if (Array.isArray(rawItens) && rawItens.length > 0) {
      itens = rawItens.filter(Boolean).map(toItem);
    } else if (Array.isArray(v?.subcategorias)) {
      // Caso legado: subcategoria veio com "subcategorias" (strings) — tratamos como itens
      itens = v.subcategorias.filter(Boolean).map(toItem);
    }

    return { nome, slug: slugify(nome), itens };
  };

  return (input || [])
    .map((c) => {
      const nome = (c?.nome ?? c?.name ?? "").toString().trim();

      // Busca o segundo nível em chaves comuns
      const rawSubs =
        Array.isArray(c?.subcategorias) ? c.subcategorias :
        Array.isArray(c?.subs) ? c.subs :
        Array.isArray(c?.grupos) ? c.grupos :
        Array.isArray(c?.itens) ? c.itens : // caso antigo: usaram 'itens' como subcats
        [];

      // Se subcategorias vierem como array de strings, viram itens de um "Outros" automático
      // Mas aqui queremos 3 níveis; então se vier string, encapsulamos em uma subcat genérica.
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
            // Se "s" for string, vira subcat com um item igual
            if (typeof s === "string") {
              const item = toItem(s);
              return {
                nome: item.nome,
                slug: item.slug,
                itens: [item],
              } as Subcat;
            }
            // Se "s" for objeto, normaliza
            return toSubcat(s);
          });
      }

      return { nome, slug: slugify(nome), subcategorias } as Cat;
    })
    .filter((c) => c.nome);
}

/** ===================== TAXONOMIA LOCAL (3 NÍVEIS) ===================== */
/**
 * Estrutura: Categoria → Subcategoria → Itens
 * "Outros (Caixa para escrever)" foi padronizado como:
 * { nome: "Outros", itens: ["Caixa para escrever"] }
 */
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
          "Explosivo Dinamite",
          "Explosivo Civis",
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
          "Motores Eletricos",
          "Motores Para exaustores industriais",
          "Motores Para planta de britagem",
          "Motores Para peneiramento",
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
        itens: ["CLP / PLC", "SCADA / supervisórios", "Sensores", "Atuadores", "Inversores / VFD", "Painéis de comando e proteção"],
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

/** ===================== Hook ===================== */
export function useTaxonomia() {
  // inicia já com o local completo
  const [categorias, setCategorias] = useState<Cat[]>(TAXONOMIA_LOCAL);
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

        if (!snap.empty) {
          const server = snap.docs.map((d) => d.data());
          const norm = normalizeCats3(server);
          if (norm.length > 0) {
            setCategorias(norm);
          } else {
            setCategorias(TAXONOMIA_LOCAL);
          }
        } else {
          setCategorias(TAXONOMIA_LOCAL);
        }
      } catch {
        setCategorias(TAXONOMIA_LOCAL);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { categorias, loading };
}

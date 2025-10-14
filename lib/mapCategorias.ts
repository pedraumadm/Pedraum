// lib/mapCategorias.ts
// Mapeador robusto: 1) equivalência 1:1 (normalizada) → 2) sinônimos/regex → 3) categoria-antiga (defaults) → 4) fuzzy → 5) fallback
// Compatível com sua TAXONOMIA_NOVA (categoria.nome + subcategorias[].nome)

import { TAXONOMIA_NOVA } from "./taxonomiaNova";
import { MIGRATION_MAP as EXTERNAL_MAP } from "./migrationMap"; // pode estar vazio; será mesclado

export type NovaPair = { categoria: string; subcategoria: string };

// ===================== Normalização =====================
function stripAccents(s = "") {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function normalizeSpaces(s = "") {
  return s.replace(/\s+/g, " ").trim();
}
function baseNormalize(s = "") {
  return normalizeSpaces(
    stripAccents(String(s).toLowerCase()).replace(/[^\p{L}\p{N}\s/-]/gu, " "),
  );
}
function tokens(s = "") {
  return baseNormalize(s)
    .split(/[\s/-]+/)
    .filter(Boolean);
}
function bigrams(ts: string[]) {
  const out: string[] = [];
  for (let i = 0; i < ts.length - 1; i++) out.push(ts[i] + " " + ts[i + 1]);
  return out;
}
function jaccard(a: string[], b: string[]) {
  const A = new Set(a),
    B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter === 0 ? 0 : inter / (A.size + B.size - inter);
}
function damerauLevenshtein(a: string, b: string) {
  const al = a.length,
    bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const dp = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[al][bl];
}
function editNorm(a: string, b: string) {
  const x = baseNormalize(a),
    y = baseNormalize(b);
  const d = damerauLevenshtein(x, y);
  const m = Math.max(x.length, y.length) || 1;
  return d / m; // 0 = igual
}

// ===================== Índice da NOVA taxonomia =====================
type SubEntry = {
  categoria: string;
  subcategoria: string;
  canon: string; // subcategoria normalizada inteira
  core: string; // trecho após " - " (ex.: "mandibulas")
  tokens: string[];
  bigrams: string[];
};

const SUBS: SubEntry[] = [];
const CANON_TO_ENTRY: Record<string, SubEntry> = {};
(function buildIndex() {
  for (const cat of TAXONOMIA_NOVA) {
    for (const sub of cat.subcategorias) {
      const canon = baseNormalize(sub.nome);
      const parts = canon.split("-").map((p) => p.trim());
      const core = normalizeSpaces(parts[parts.length - 1] || canon);
      const tks = tokens(core);
      const entry: SubEntry = {
        categoria: cat.nome,
        subcategoria: sub.nome,
        canon,
        core,
        tokens: tks,
        bigrams: bigrams(tks),
      };
      SUBS.push(entry);
      CANON_TO_ENTRY[canon] = entry;
    }
  }
})();

// ===================== Bloco de equivalências (aliases) interno =====================
// Cobre toda a lista antiga que você mandou + variações usuais (singular/plural, pontuação, etc.)

type AliasRow = { aliases: string[]; target: string };
const INTERNAL_ALIASES: AliasRow[] = [
  // 1) Perfuração e Demolição
  {
    aliases: [
      "Perfuratrizes Rotativas",
      "Perfuratriz Rotativa",
      "Rotativas (Perfuratriz)",
    ],
    target: "Perfuratrizes - Rotativas",
  },
  {
    aliases: [
      "Perfuratrizes Pneumáticas",
      "Perfuratriz Pneumática",
      "Pneumaticas (Perfuratriz)",
    ],
    target: "Perfuratrizes - Pneumáticas",
  },
  {
    aliases: [
      "Perfuratrizes Hidráulicas",
      "Perfuratriz Hidráulica",
      "Hidraulicas (Perfuratriz)",
    ],
    target: "Perfuratrizes - Hidráulica",
  },
  {
    aliases: [
      "Martelos Demolidores Hidráulicos",
      "Martelo Demolidor Hidráulico",
      "Rompedor Hidráulico",
      "Rompedores Hidráulicos",
    ],
    target: "Martelos Demolidores - Hidráulicos",
  },
  {
    aliases: [
      "Martelos Demolidores Pneumáticos",
      "Martelo Demolidor Pneumático",
      "Rompedor Pneumático",
      "Rompedores Pneumáticos",
    ],
    target: "Martelos Demolidores - Pneumáticos",
  },
  {
    aliases: ["Brocas para rocha", "Broca para rocha", "Brocas de perfuração"],
    target: "Brocas para Rocha",
  },
  {
    aliases: ["Coroas diamantadas", "Coroa diamantada"],
    target: "Coroas Diamantadas",
  },
  {
    aliases: [
      "Varetas de extensão",
      "Vareta de extensão",
      "Hastes",
      "Haste de perfuração",
    ],
    target: "Varetas de Extensão",
  },
  { aliases: ["Dinamite"], target: "Explosivos - Dinamite" },
  {
    aliases: ["ANFO", "ANFO (Nitrato de Amônio + Óleo Combustível)"],
    target: "Explosivos - ANFO",
  },
  {
    aliases: ["Detonadores elétricos", "Detonador elétrico"],
    target: "Detonadores - Elétricos",
  },
  {
    aliases: [
      "Detonadores não elétricos",
      "Detonador não elétrico",
      "Detonador nao eletrico",
    ],
    target: "Detonadores - Não Elétricos",
  },
  {
    aliases: ["Cordel detonante", "Cordéis detonantes", "Corda detonante"],
    target: "Cordéis Detonantes",
  },

  // 2) Carregamento e Transporte
  {
    aliases: [
      "Escavadeiras hidráulicas",
      "Escavadeira hidráulica",
      "Escavadeiras",
    ],
    target: "Escavadeiras e Miniescavadeiras",
  },
  {
    aliases: ["Pás carregadeiras", "Pá carregadeira", "Pás-Carregadeiras"],
    target: "Pás Carregadeiras",
  },
  {
    aliases: [
      "Caminhões basculantes (fora de estrada)",
      "Caminhão basculante fora de estrada",
      "Caminhões fora de estrada",
    ],
    target: "Caminhões Basculantes e Fora de Estrada",
  },
  {
    aliases: [
      "Caminhões pipa",
      "Caminhão pipa",
      "Caminhões tanque",
      "Caminhao tanque",
      "Caminhão tanque",
    ],
    target: "Caminhões Tanque",
  },
  { aliases: ["Correias transportadoras"], target: "Correias Transportadoras" },
  {
    aliases: ["Alimentadores vibratórios", "Alimentador vibratório"],
    target: "Alimentadores - Vibratórios",
  },
  {
    aliases: ["Esteiras rolantes", "Esteiras transportadoras internas"],
    target: "Esteiras Transportadoras",
  },

  // 3) Britagem e Classificação
  {
    aliases: [
      "Britadores Mandíbulas",
      "Britador de Mandíbulas",
      "Mandíbulas (Britador)",
    ],
    target: "Britadores - Mandíbulas",
  },
  {
    aliases: ["Britadores Cônicos", "Britador Cônico", "Conico (Britador)"],
    target: "Britadores - Cônicos",
  },
  {
    aliases: ["Britadores Impacto", "Britador de Impacto"],
    target: "Britadores - Impacto",
  },
  {
    aliases: ["Britadores Rolos", "Britador de Rolos"],
    target: "Britadores - Rolos",
  },
  { aliases: ["Rebritadores", "Rebritador"], target: "Rebritadores" },
  {
    aliases: ["Peneiras vibratórias", "Peneira vibratória"],
    target: "Peneiras - Vibratórias",
  },
  {
    aliases: [
      "Trommels (peneiras rotativas)",
      "Trommels",
      "Peneiras rotativas",
    ],
    target: "Peneiras - Trommels",
  },
  {
    aliases: ["Hidrociclones", "Hidrociclone"],
    target: "Classificação - Hidrociclones",
  },
  {
    aliases: ["Classificadores", "Classificador"],
    target: "Classificação - Classificadores",
  },
  {
    aliases: ["Moinhos de bolas", "Moinho de bolas"],
    target: "Moinhos - Bolas",
  },
  {
    aliases: ["Moinhos de barras", "Moinho de barras"],
    target: "Moinhos - Barras",
  },
  {
    aliases: [
      "Moinhos verticais (roller mills)",
      "Moinhos verticais",
      "Moinho vertical",
      "roller mills",
    ],
    target: "Moinhos - Verticais (roller mills)",
  },
  {
    aliases: ["Lavadores de areia", "Lavador de areia"],
    target: "Lavadores de Areia",
  },
  { aliases: ["Silos e chutes", "Silos", "Chutes"], target: "Silos e Chutes" },
  {
    aliases: [
      "Carcaças e bases metálicas",
      "Carcaças metálicas",
      "Bases metálicas",
    ],
    target: "Carcaças e Bases Metálicas",
  },

  // 4) Beneficiamento e Processamento Mineral
  {
    aliases: [
      "Separadores Magnéticos - Tambor",
      "Tambor magnético",
      "Separador magnético tambor",
    ],
    target: "Separadores Magnéticos - Tambor",
  },
  {
    aliases: [
      "Separadores Magnéticos - Overband",
      "Overband",
      "Separador magnético overband",
    ],
    target: "Separadores Magnéticos - Overband",
  },
  {
    aliases: ["Flotação - Células", "Células de flotação"],
    target: "Flotação - Células",
  },
  {
    aliases: ["Flotação - Espumantes", "Espumantes de flotação"],
    target: "Flotação - Espumantes",
  },
  {
    aliases: ["Flotação - Coletores", "Coletores de flotação"],
    target: "Flotação - Coletores",
  },
  {
    aliases: [
      "Filtragem e Secagem - Filtros prensa",
      "Filtros prensa",
      "Filtro prensa",
    ],
    target: "Filtragem e Secagem - Filtros Prensa",
  },
  {
    aliases: ["Filtragem e Secagem - Espessadores", "Espessadores"],
    target: "Filtragem e Secagem - Espessadores",
  },
  {
    aliases: [
      "Filtragem e Secagem - Secadores Rotativos",
      "Secadores rotativos",
      "Secador rotativo",
    ],
    target: "Filtragem e Secagem - Secadores Rotativos",
  },

  // 5) Peças e Componentes Industriais
  { aliases: ["Rolamentos", "Rolamento"], target: "Rolamentos" },
  { aliases: ["Engrenagens", "Engrenagem"], target: "Engrenagens" },
  { aliases: ["Polias", "Polia"], target: "Polias" },
  { aliases: ["Eixos", "Eixo"], target: "Eixos" },
  { aliases: ["Mancais", "Mancal"], target: "Mancais" },
  { aliases: ["Buchas", "Bucha"], target: "Buchas" },
  {
    aliases: ["Correntes", "Corrente"],
    target: "Parafusos, Porcas, Arruelas e Fixadores",
  }, // melhor destino disponível
  {
    aliases: ["Correias transportadoras (peças)", "Correias (peças)"],
    target: "Correias Transportadoras e Industriais",
  },
  {
    aliases: ["Esticadores de correia", "Esticador de correia"],
    target: "Esticadores de Correia",
  },
  {
    aliases: [
      "Parafusos e porcas de alta resistência",
      "Parafusos de alta",
      "Porcas de alta",
    ],
    target: "Parafusos e Porcas de Alta Resistência",
  },
  {
    aliases: ["Molas industriais", "Mola industrial"],
    target: "Molas Industriais",
  },

  // 6) Desgaste e Revestimento
  { aliases: ["Mandíbulas", "Mandibulas"], target: "Mandíbulas" },
  { aliases: ["Martelos"], target: "Martelos" },
  {
    aliases: ["Revestimentos de britadores", "Revestimento de britador"],
    target: "Revestimentos de Britadores",
  },
  {
    aliases: ["Chapas de desgaste", "Chapa de desgaste"],
    target: "Chapas de Desgaste",
  },
  {
    aliases: ["Barras de impacto", "Barra de impacto"],
    target: "Barras de Impacto",
  },
  { aliases: ["Grelhas", "Grelha"], target: "Grelhas" },
  { aliases: ["Telas metálicas", "Tela metálica"], target: "Telas Metálicas" },
  {
    aliases: ["Telas em borracha", "Tela em borracha"],
    target: "Telas em Borracha",
  },

  // 7) Automação, Elétrica e Controle
  {
    aliases: ["Motores elétricos", "Motor elétrico"],
    target: "Motores (Automação)",
  },
  {
    aliases: ["Inversores de frequência", "Inversor de frequência"],
    target: "Inversores de Frequência",
  },
  {
    aliases: ["Painéis elétricos", "Painel elétrico"],
    target: "Painéis Elétricos",
  },
  { aliases: ["Controladores ASRi", "ASRi"], target: "Controladores ASRi" },
  { aliases: ["Soft starters", "Soft starter"], target: "Soft Starters" },
  {
    aliases: ["Sensores e detectores", "Sensores", "Detectores"],
    target: "Sensores e Detectores Diversos",
  },
  {
    aliases: ["Detectores de metais", "Detector de metais"],
    target: "Detectores de Metais",
  },
  {
    aliases: ["CLPs e módulos de automação", "CLP", "CLPs"],
    target: "CLPs e Módulos de Automação",
  },

  // 8) Lubrificação e Produtos Químicos
  {
    aliases: ["Óleos lubrificantes", "Óleo lubrificante"],
    target: "Óleos Lubrificantes",
  },
  {
    aliases: ["Graxas industriais", "Graxa industrial"],
    target: "Graxas Industriais",
  },
  {
    aliases: ["Selantes industriais", "Selante industrial"],
    target: "Selantes Industriais",
  },
  { aliases: ["Desengripantes", "Desengripante"], target: "Desengripantes" },
  {
    aliases: ["Produtos químicos para peneiramento"],
    target: "Produtos Químicos para Peneiramento",
  },

  // 9) Equipamentos Auxiliares e Ferramentas
  {
    aliases: [
      "Compressores de Ar - Estacionários",
      "Compressor de ar estacionário",
    ],
    target: "Compressores - Estacionários",
  },
  {
    aliases: [
      "Compressores de Ar - Móveis",
      "Compressor de ar móvel",
      "Compressor portátil",
    ],
    target: "Compressores - Móveis",
  },
  {
    aliases: ["Grupos geradores diesel", "Gerador diesel"],
    target: "Geradores de Energia - Diesel",
  },
  {
    aliases: ["Bombas de água", "Bomba de água (centrífuga, submersível)"],
    target: "Bombas de Água (centrífugas, submersíveis)",
  },
  { aliases: ["Bombas de lama", "Bomba de lama"], target: "Bombas de Lama" },
  {
    aliases: ["Picaretas, marretas e alavancas"],
    target: "Ferramentas Manuais - Picaretas, Marretas, Alavancas",
  },
  {
    aliases: ["Chaves de aperto e ajuste", "Chaves e ajustes"],
    target: "Ferramentas Manuais - Chaves e Ajustes",
  },
  {
    aliases: ["Serra para metais e rochas", "Serras para metais e rochas"],
    target: "Serras para Metais e Rochas",
  },
  {
    aliases: ["Ferramentas Elétricas", "Ferramenta elétrica"],
    target: "Ferramentas Elétricas",
  },
  {
    aliases: ["Mangueiras e Conexões Hidráulicas"],
    target: "Mangueiras e Conexões Hidráulicas",
  },
  { aliases: ["Iluminação Industrial"], target: "Iluminação Industrial" },
  {
    aliases: ["Abraçadeiras e Fixadores", "Abraçadeiras", "Fixadores"],
    target: "Abraçadeiras e Fixadores",
  },
  {
    aliases: ["Soldas e Eletrodos", "Solda", "Eletrodo"],
    target: "Soldas e Eletrodos",
  },
  {
    aliases: ["Equipamentos de Limpeza Industrial"],
    target: "Equipamentos de Limpeza Industrial",
  },

  // 10) EPIs
  { aliases: ["Capacetes com jugular", "Capacete"], target: "EPI - Capacetes" },
  {
    aliases: ["Protetores auriculares", "Protetor auricular"],
    target: "EPI - Protetores Auriculares",
  },
  {
    aliases: [
      "Máscaras contra poeira",
      "Respiradores com filtro PFF2",
      "Respiradores com filtro PFF3",
      "Respirador PFF2",
      "Respirador PFF3",
    ],
    target: "EPI - Respiradores",
  },
  {
    aliases: [
      "Luvas de raspa/couro",
      "Luva de raspa",
      "Luva de couro",
      "Luvas",
    ],
    target: "EPI - Luvas",
  },
  {
    aliases: ["Botas de segurança", "Bota de segurança", "Botas"],
    target: "EPI - Botas",
  },
  {
    aliases: ["Óculos de proteção", "Óculos", "Face shield", "Visor"],
    target: "EPI - Óculos",
  },
  {
    aliases: ["Colete refletivo", "Colete de segurança"],
    target: "EPI - Colete Refletivo",
  },

  // 11) Instrumentos de Medição e Controle
  {
    aliases: ["Inclinômetros", "Inclinômetro"],
    target: "Monitoramento de Estabilidade - Inclinômetros",
  },
  {
    aliases: ["Extensômetros", "Extensômetro"],
    target: "Monitoramento de Estabilidade - Extensômetros",
  },
  {
    aliases: ["Teor de umidade"],
    target: "Análise de Material - Teor de Umidade",
  },
  {
    aliases: ["Granulometria (peneiras de ensaio)", "Granulometria"],
    target: "Análise de Material - Granulometria (peneiras de ensaio)",
  },
  {
    aliases: ["Sensores de nível e vazão", "Sensor de nível e vazão"],
    target: "Sensores de Nível e Vazão",
  },
  {
    aliases: ["Sistemas de controle remoto", "Sistema de controle remoto"],
    target: "Sistemas de Controle Remoto",
  },

  // 12) Manutenção e Serviços
  {
    aliases: ["Filtros de ar e combustível"],
    target: "Filtros de Óleo, Ar e Combustível",
  },
  {
    aliases: ["Óleos hidráulicos e graxas"],
    target: "Lubrificantes, Graxas e Aditivos",
  },
  { aliases: ["Rolamentos e correias"], target: "Rolamentos" }, // (correias cobertas acima)
  { aliases: ["Martelos e mandíbulas para britadores"], target: "Mandíbulas" },
  { aliases: ["Pastilhas de desgaste"], target: "Pastilhas de Desgaste" },
  {
    aliases: ["Manutenção industrial", "Serviços de manutenção"],
    target: "Manutenção de Britadores e Peneiras",
  },
  { aliases: ["Usinagem e caldeiraria"], target: "Usinagem e Caldeiraria" },

  // 13) Veículos e Pneus
  {
    aliases: [
      "Pneus industriais (caminhão, pá carregadeira, empilhadeira)",
      "Pneus industriais",
      "Pneu industrial",
    ],
    target: "Pneus Industriais (Caminhão, Pá Carregadeira, Empilhadeira)",
  },
  { aliases: ["Rodas e aros", "Roda", "Aro"], target: "Rodas e Aros" },
  {
    aliases: ["Recapagens e reformas de pneus", "Recapagem de pneus"],
    target: "Recapagens e Reformas de Pneus",
  },
  {
    aliases: [
      "Serviços de montagem e balanceamento",
      "Montagem e balanceamento de pneus",
    ],
    target: "Serviços de Montagem e Balanceamento",
  },
];

// monta mapa normalizado
const INTERNAL_MAP: Record<string, NovaPair> = (() => {
  const out: Record<string, NovaPair> = {};
  for (const row of INTERNAL_ALIASES) {
    for (const alias of row.aliases) {
      const canonSub = baseNormalize(row.target);
      const e = CANON_TO_ENTRY[canonSub];
      if (!e) continue; // ignora alias que não exista na taxonomia nova
      out[baseNormalize(alias)] = {
        categoria: e.categoria,
        subcategoria: e.subcategoria,
      };
    }
  }
  return out;
})();

// merge com mapa externo se existir
const MIGRATION_MAP: Record<string, NovaPair> = {
  ...(EXTERNAL_MAP || {}),
  ...INTERNAL_MAP,
};

// ===================== Sinônimos via REGEX (subcategorias) =====================
// Array para evitar erro TS de “propriedades duplicadas”
const SUB_REGEX: Array<{ re: RegExp; target: string }> = [
  // Perfuração
  { re: /perfuratriz.*rotativa/i, target: "Perfuratrizes - Rotativas" },
  { re: /perfuratriz.*pneumat/i, target: "Perfuratrizes - Pneumáticas" },
  { re: /perfuratriz.*hidraul/i, target: "Perfuratrizes - Hidráulica" },
  { re: /perfuratriz.*eletric/i, target: "Perfuratrizes - Elétrica" },
  { re: /perfuratriz.*superf/i, target: "Perfuratrizes - Superfície" },
  { re: /perfuratriz.*subterr/i, target: "Perfuratrizes - Subterrânea" },
  {
    re: /martelo.*demol.*hidraul|rompedor.*hidraul/i,
    target: "Martelos Demolidores - Hidráulicos",
  },
  {
    re: /martelo.*demol.*pneumat|rompedor.*pneumat/i,
    target: "Martelos Demolidores - Pneumáticos",
  },
  {
    re: /\bbrocas?\b.*rocha|\brocha\b.*\bbrocas?\b/i,
    target: "Brocas para Rocha",
  },
  { re: /coroas?.*diamant/i, target: "Coroas Diamantadas" },
  { re: /\bvaretas?\b|haste(s)?/i, target: "Varetas de Extensão" },
  { re: /explosivo.*anfo/i, target: "Explosivos - ANFO" },
  { re: /explosivo.*dinamit/i, target: "Explosivos - Dinamite" },
  { re: /detonador.*n[aã]o.*eletric/i, target: "Detonadores - Não Elétricos" },
  { re: /detonador.*eletric/i, target: "Detonadores - Elétricos" },
  { re: /cord(e|eis).*deton/i, target: "Cordéis Detonantes" },

  // Britagem/Peneiramento
  { re: /britador.*mandib/i, target: "Britadores - Mandíbulas" },
  { re: /britador.*(c[oô]nico|conico)/i, target: "Britadores - Cônicos" },
  { re: /britador.*impacto/i, target: "Britadores - Impacto" },
  { re: /britador.*rolo/i, target: "Britadores - Rolos" },
  { re: /rebritador/i, target: "Rebritadores" },
  { re: /peneira.*vibra/i, target: "Peneiras - Vibratórias" },
  { re: /trommel|peneira.*rotativa/i, target: "Peneiras - Trommels" },
  { re: /hidrociclone/i, target: "Classificação - Hidrociclones" },
  { re: /\bclassificador(es)?\b/i, target: "Classificação - Classificadores" },
  { re: /moinho.*bola/i, target: "Moinhos - Bolas" },
  { re: /moinho.*barra/i, target: "Moinhos - Barras" },
  {
    re: /moinho.*vertical|roller\s*mills?/i,
    target: "Moinhos - Verticais (roller mills)",
  },
  { re: /lavador(a)? de areia/i, target: "Lavadores de Areia" },
  { re: /silos?(\s*e\s*chutes?)?|chutes?/i, target: "Silos e Chutes" },
  { re: /carcaca|base(s)? metalic/i, target: "Carcaças e Bases Metálicas" },

  // Linha amarela
  {
    re: /escavadeira|miniescavadeira/i,
    target: "Escavadeiras e Miniescavadeiras",
  },
  { re: /p[aá]s?\s*carregadeira/i, target: "Pás Carregadeiras" },
  { re: /retro(escavadeira)?/i, target: "Retroescavadeiras" },

  // Transporte/Logística
  {
    re: /caminh(ao|oes).*bascul|fora.*estrada/i,
    target: "Caminhões Basculantes e Fora de Estrada",
  },
  { re: /caminh(ao|oes).*(tanque|pipa)/i, target: "Caminhões Tanque" },
  { re: /carreta|reboque/i, target: "Carretas e Reboques" },
  { re: /esteira(s)? transportadora(s)?/i, target: "Esteiras Transportadoras" },
  { re: /correia(s)? transportadora(s)?/i, target: "Correias Transportadoras" },

  // Peças/Desgaste
  { re: /rolamento/i, target: "Rolamentos" },
  { re: /engrenag/i, target: "Engrenagens" },
  { re: /polia/i, target: "Polias" },
  { re: /mancal/i, target: "Mancais" },
  { re: /barras? de impacto/i, target: "Barras de Impacto" },
  { re: /chapas? de desgaste/i, target: "Chapas de Desgaste" },
  { re: /telas? metalic/i, target: "Telas Metálicas" },
  { re: /telas? em borracha/i, target: "Telas em Borracha" },
  { re: /mandibulas?/i, target: "Mandíbulas" },
  { re: /martelos?/i, target: "Martelos" },

  // EPIs
  { re: /capacete/i, target: "EPI - Capacetes" },
  { re: /protet(or|ores).*auricular/i, target: "EPI - Protetores Auriculares" },
  { re: /respirador|pff2|pff3|mascara/i, target: "EPI - Respiradores" },
  { re: /\bluvas?\b/i, target: "EPI - Luvas" },
  { re: /\bbotas?\b/i, target: "EPI - Botas" },
  { re: /oculos|face\s*shield|visor/i, target: "EPI - Óculos" },
  { re: /colete.*refletiv/i, target: "EPI - Colete Refletivo" },
];

// ===================== Defaults por CATEGORIA ANTIGA =====================
const OLD_CATEGORY_DEFAULTS: Record<string, NovaPair[]> = {
  "equipamentos de perfuracao e demolicao": [
    {
      categoria: "Perfuração e Detonação",
      subcategoria: "Perfuratrizes - Pneumáticas",
    },
    {
      categoria: "Perfuração e Detonação",
      subcategoria: "Perfuratrizes - Hidráulica",
    },
    { categoria: "Perfuração e Detonação", subcategoria: "Brocas para Rocha" },
    { categoria: "Perfuração e Detonação", subcategoria: "Coroas Diamantadas" },
    {
      categoria: "Perfuração e Detonação",
      subcategoria: "Detonadores - Não Elétricos",
    },
  ],
  "equipamentos de carregamento e transporte": [
    {
      categoria: "Linha Amarela e Maquinário Pesado",
      subcategoria: "Escavadeiras e Miniescavadeiras",
    },
    {
      categoria: "Linha Amarela e Maquinário Pesado",
      subcategoria: "Pás Carregadeiras",
    },
    {
      categoria: "Transporte Interno e Logística",
      subcategoria: "Caminhões Basculantes e Fora de Estrada",
    },
    {
      categoria: "Transporte Interno e Logística",
      subcategoria: "Caminhões Tanque",
    },
    {
      categoria: "Transporte Interno e Logística",
      subcategoria: "Correias Transportadoras",
    },
  ],
  "britagem e classificacao": [
    {
      categoria: "Britagem e Peneiramento",
      subcategoria: "Britadores - Mandíbulas",
    },
    {
      categoria: "Britagem e Peneiramento",
      subcategoria: "Britadores - Cônicos",
    },
    {
      categoria: "Britagem e Peneiramento",
      subcategoria: "Peneiras - Vibratórias",
    },
    { categoria: "Britagem e Peneiramento", subcategoria: "Moinhos - Bolas" },
    {
      categoria: "Britagem e Peneiramento",
      subcategoria: "Classificação - Hidrociclones",
    },
  ],
  "beneficiamento e processamento mineral": [
    {
      categoria: "Beneficiamento e Processamento Mineral",
      subcategoria: "Flotação - Células",
    },
    {
      categoria: "Beneficiamento e Processamento Mineral",
      subcategoria: "Separadores Magnéticos - Tambor",
    },
    {
      categoria: "Beneficiamento e Processamento Mineral",
      subcategoria: "Filtragem e Secagem - Filtros Prensa",
    },
  ],
  "pecas e componentes industriais": [
    {
      categoria: "Peças, Componentes e Consumíveis",
      subcategoria: "Rolamentos",
    },
    {
      categoria: "Peças, Componentes e Consumíveis",
      subcategoria: "Engrenagens",
    },
    { categoria: "Peças, Componentes e Consumíveis", subcategoria: "Polias" },
    {
      categoria: "Peças, Componentes e Consumíveis",
      subcategoria: "Parafusos e Porcas de Alta Resistência",
    },
  ],
  "desgaste e revestimento": [
    { categoria: "Desgaste e Revestimento", subcategoria: "Mandíbulas" },
    { categoria: "Desgaste e Revestimento", subcategoria: "Martelos" },
    {
      categoria: "Desgaste e Revestimento",
      subcategoria: "Revestimentos de Britadores",
    },
    {
      categoria: "Desgaste e Revestimento",
      subcategoria: "Chapas de Desgaste",
    },
  ],
  "automacao eletrica e controle": [
    {
      categoria: "Automação, Monitoramento e TI",
      subcategoria: "Inversores de Frequência",
    },
    {
      categoria: "Automação, Monitoramento e TI",
      subcategoria: "Painéis Elétricos",
    },
    {
      categoria: "Automação, Monitoramento e TI",
      subcategoria: "CLPs e Módulos de Automação",
    },
  ],
  "lubrificacao e produtos quimicos": [
    {
      categoria: "Lubrificação e Produtos Químicos",
      subcategoria: "Óleos Lubrificantes",
    },
    {
      categoria: "Lubrificação e Produtos Químicos",
      subcategoria: "Graxas Industriais",
    },
    {
      categoria: "Lubrificação e Produtos Químicos",
      subcategoria: "Produtos Químicos para Peneiramento",
    },
  ],
  "equipamentos auxiliares e ferramentas": [
    {
      categoria: "Equipamentos Auxiliares e Ferramentas",
      subcategoria: "Compressores - Estacionários",
    },
    {
      categoria: "Equipamentos Auxiliares e Ferramentas",
      subcategoria: "Compressores - Móveis",
    },
    {
      categoria: "Equipamentos Auxiliares e Ferramentas",
      subcategoria: "Geradores de Energia - Diesel",
    },
    {
      categoria: "Equipamentos Auxiliares e Ferramentas",
      subcategoria: "Ferramentas Elétricas",
    },
  ],
  "epis equipamentos de protecao individual": [
    {
      categoria: "EPIs, Segurança e Sinalização",
      subcategoria: "EPI - Capacetes",
    },
    { categoria: "EPIs, Segurança e Sinalização", subcategoria: "EPI - Luvas" },
    {
      categoria: "EPIs, Segurança e Sinalização",
      subcategoria: "EPI - Óculos",
    },
    {
      categoria: "EPIs, Segurança e Sinalização",
      subcategoria: "EPI - Respiradores",
    },
  ],
  "instrumentos de medicao e controle": [
    {
      categoria: "Instrumentos de Medição e Controle",
      subcategoria: "Monitoramento de Estabilidade - Inclinômetros",
    },
    {
      categoria: "Instrumentos de Medição e Controle",
      subcategoria: "Análise de Material - Granulometria (peneiras de ensaio)",
    },
  ],
  "manutencao e servicos industriais": [
    {
      categoria: "Serviços e Manutenção",
      subcategoria: "Manutenção de Britadores e Peneiras",
    },
    {
      categoria: "Serviços e Manutenção",
      subcategoria: "Usinagem e Caldeiraria",
    },
  ],
  "veiculos e pneus": [
    {
      categoria: "Veículos e Pneus",
      subcategoria:
        "Pneus Industriais (Caminhão, Pá Carregadeira, Empilhadeira)",
    },
    {
      categoria: "Veículos e Pneus",
      subcategoria: "Recapagens e Reformas de Pneus",
    },
  ],
};

// ===================== Utilidades =====================
function dedupPairs(list: NovaPair[]) {
  const m = new Map<string, NovaPair>();
  for (const p of list)
    m.set(`${baseNormalize(p.categoria)}::${baseNormalize(p.subcategoria)}`, p);
  return Array.from(m.values());
}

const UNMAPPED = new Set<string>();
export function dumpUnmapped(): string[] {
  return Array.from(UNMAPPED.values());
}

// score para fuzzy
function scoreSub(legacy: string, entry: SubEntry): number {
  const s = baseNormalize(legacy);
  const lt = tokens(s),
    lb = bigrams(lt);
  let sc = 0;
  if (s === entry.canon) sc += 10;
  if (s.includes(entry.core) || entry.core.includes(s)) sc += 4.5;
  sc += jaccard(lt, entry.tokens) * 8;
  sc += jaccard(lb, entry.bigrams) * 5;
  const ed = editNorm(s, entry.canon);
  if (ed <= 0.25) sc += 8;
  else if (ed <= 0.35) sc += 4;
  return sc;
}

// ===================== API =====================
export function mapAntigoParaNovoDebug(rotuloAntigo: string): {
  pair: NovaPair;
  confidence: number;
  matchedBy: "dict" | "regex" | "oldcat" | "fuzzy" | "fallback";
} {
  const raw = String(rotuloAntigo || "").trim();
  const norm = baseNormalize(raw);
  if (!norm)
    return {
      pair: { categoria: "Outros", subcategoria: "Diversos" },
      confidence: 0,
      matchedBy: "fallback",
    };

  // 1) equivalência 1:1 (normalizada)
  const d1 = MIGRATION_MAP[norm];
  if (d1) return { pair: d1, confidence: 10, matchedBy: "dict" };

  // 2) sinônimos por regex
  for (const { re, target } of SUB_REGEX) {
    if (re.test(norm)) {
      const e = CANON_TO_ENTRY[baseNormalize(target)];
      if (e)
        return {
          pair: { categoria: e.categoria, subcategoria: e.subcategoria },
          confidence: 10,
          matchedBy: "regex",
        };
    }
  }

  // 3) categoria antiga → pacote default (quando o rótulo é macro)
  for (const [oldCat, defaults] of Object.entries(OLD_CATEGORY_DEFAULTS)) {
    if (norm.includes(oldCat)) {
      return { pair: defaults[0], confidence: 9, matchedBy: "oldcat" }; // uma principal; use Many p/ trazer todas
    }
  }

  // 4) fuzzy reforçado
  let best: SubEntry | null = null,
    bestScore = -1;
  for (const e of SUBS) {
    const sc = scoreSub(norm, e);
    if (sc > bestScore) {
      bestScore = sc;
      best = e;
    }
  }
  if (best && bestScore >= 7.0) {
    return {
      pair: { categoria: best.categoria, subcategoria: best.subcategoria },
      confidence: bestScore,
      matchedBy: "fuzzy",
    };
  }

  // 5) fallback
  UNMAPPED.add(norm);
  return {
    pair: { categoria: "Outros", subcategoria: "Diversos" },
    confidence: bestScore < 0 ? 0 : bestScore,
    matchedBy: "fallback",
  };
}

export function mapAntigoParaNovo(rotuloAntigo: string): NovaPair {
  return mapAntigoParaNovoDebug(rotuloAntigo).pair;
}

// Recebe vários rótulos: aplica todas as camadas e devolve pares deduplicados.
// Se encontrar uma categoria antiga, adiciona o pacote completo (várias subcats).
export function mapAntigosParaNovosMany(rotulosAntigos: string[]): NovaPair[] {
  const out: NovaPair[] = [];
  for (const raw of rotulosAntigos || []) {
    const norm = baseNormalize(String(raw || ""));
    if (!norm) continue;

    // 1) dict
    const d1 = MIGRATION_MAP[norm];
    if (d1) {
      out.push(d1);
      continue;
    }

    // 2) regex
    let matched = false;
    for (const { re, target } of SUB_REGEX) {
      if (re.test(norm)) {
        const e = CANON_TO_ENTRY[baseNormalize(target)];
        if (e)
          out.push({ categoria: e.categoria, subcategoria: e.subcategoria });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 3) categoria antiga (adiciona pacote inteiro)
    for (const [oldCat, defaults] of Object.entries(OLD_CATEGORY_DEFAULTS)) {
      if (norm.includes(oldCat)) {
        out.push(...defaults);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 4) fuzzy
    let best: SubEntry | null = null,
      bestScore = -1;
    for (const e of SUBS) {
      const sc = scoreSub(norm, e);
      if (sc > bestScore) {
        bestScore = sc;
        best = e;
      }
    }
    if (best && bestScore >= 7.0)
      out.push({ categoria: best.categoria, subcategoria: best.subcategoria });
    else out.push({ categoria: "Outros", subcategoria: "Diversos" });
  }

  return dedupPairs(out);
}

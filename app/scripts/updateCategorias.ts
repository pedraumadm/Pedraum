/* scripts/updateCategorias.ts
 * Uso:
 *   npx ts-node scripts/updateCategorias.ts                 # Dry-run (não altera nada)
 *   npx ts-node scripts/updateCategorias.ts --commit        # Aplica alterações
 *
 * Suposições:
 *   - Coleção: "usuarios"
 *   - Campo de categorias: "categorias" (array<string>)
 *   - Backup do valor antigo: "categoriasAntigas"
 *
 * Requisitos:
 *   - Node 18+
 *   - npm i -D ts-node typescript
 *   - npm i firebase-admin
 *   - export GOOGLE_APPLICATION_CREDENTIALS="/caminho/serviceAccount.json"
 */

import admin from "firebase-admin";

/* ===================== CONFIG ===================== */
const SHOULD_COMMIT = process.argv.includes("--commit");
const USUARIOS_COLLECTION = "usuarios";
const CATEGORIAS_FIELD = "categorias";
const BACKUP_FIELD = "categoriasAntigas";

/* ===================== FIREBASE ADMIN ===================== */
/* ===================== FIREBASE ADMIN ===================== */
import * as fs from "fs";
import * as path from "path";

function initAdmin() {
  // 1) Se a variável estiver setada, usa applicationDefault()
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    return;
  }

  // 2) Fallback: tenta carregar ./serviceAccount.json na raiz do projeto
  const saPath = path.resolve(process.cwd(), "serviceAccount.json");
  if (!fs.existsSync(saPath)) {
    throw new Error(
      `Credencial não encontrada. Defina GOOGLE_APPLICATION_CREDENTIALS ou coloque serviceAccount.json em: ${saPath}`,
    );
  }

  const raw = fs.readFileSync(saPath, "utf8");
  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id, // ajuda em alguns ambientes
  });
}

if (!admin.apps.length) initAdmin();
const db = admin.firestore();

/* ===================== TAXONOMIA NOVA (IDÊNTICA À SUA) ===================== */
/* Mantive o mesmo conteúdo da sua TAXONOMIA_LOCAL para não depender do React */
type Subcat = { nome: string };
type Cat = { nome: string; subcategorias: (string | Subcat)[] };

const TAXONOMIA_NOVA: Cat[] = [
  {
    nome: "Britagem e Peneiramento",
    subcategorias: [
      "Britadores - Mandíbulas",
      "Britadores - Cônicos",
      "Britadores - Impacto",
      "Britadores - Giratório",
      "Britadores - Portátil/Móvel",
      "Trituradores Secundários e Terciários",
      "Peneiras - Vibratórias",
      "Peneiras - Rotativas",
      "Peneiras - De Tambor",
      "Peneiras - Móveis",
      "Peneiras - Fixas",
      "Peneiras - Finas",
      "Alimentadores - Vibratórios",
      "Alimentadores - Hidráulicos",
      "Alimentadores - Magnéticos",
      "Transportadores - Esteiras",
      "Transportadores - Correias",
      "Transportadores - Elevadores de Caçamba",
      "Moinhos - Bolas",
      "Moinhos - SAG",
      "Trituradores - Rocha Fina",
      "Telas",
      "Telas de Borracha",
    ],
  },
  {
    nome: "Perfuração e Detonação",
    subcategorias: [
      "Perfuratrizes - Hidráulica",
      "Perfuratrizes - Elétrica",
      "Perfuratrizes - Superfície",
      "Perfuratrizes - Subterrânea",
      "Brocas e Hastes",
      "Explosivos - Civis",
      "Explosivos - Industriais",
      "Detonadores - Elétricos",
      "Detonadores - Não Elétricos",
      "Cordéis Detonantes",
      "Sistemas de Controle de Detonação",
      "Drop ball",
      "Esferas",
    ],
  },
  {
    nome: "Transporte Interno e Logística",
    subcategorias: [
      "Caminhões Basculantes e Fora de Estrada",
      "Carretas e Reboques",
      "Caminhões Tanque",
      "Veículos Utilitários e Tratores Industriais",
      "Guinchos e Guindastes Móveis",
      "Esteiras Transportadoras",
      "Correias Transportadoras",
      "Trenes Internos de Minério",
    ],
  },
  {
    nome: "Linha Amarela e Maquinário Pesado",
    subcategorias: [
      "Escavadeiras e Miniescavadeiras",
      "Pás Carregadeiras",
      "Retroescavadeiras",
      "Motoniveladoras",
      "Rolo Compactador",
      "Carregadeiras de Esteira",
      "Empilhadeiras Industriais",
      "Plataformas de Manutenção e Acesso",
    ],
  },
  {
    nome: "Motores, Compressores e Sistemas Hidráulicos",
    subcategorias: [
      "Motores Elétricos e Diesel",
      "Compressores Industriais e Portáteis",
      "Bombas Hidráulicas e Peças",
      "Turbinas e Ventiladores Industriais",
      "Geradores Elétricos",
      "Sistemas de Ar Comprimido",
      "Sistemas Hidráulicos Completos",
    ],
  },
  {
    nome: "Peças, Componentes e Consumíveis",
    subcategorias: [
      "Correias, Polias, Engrenagens, Rolamentos, Fixadores",
      "Filtros de Óleo, Ar e Combustível",
      "Cilindros e Mangueiras Hidráulicas",
      "Ferramentas Especializadas",
      "Lubrificantes, Graxas e Aditivos",
      "Componentes de Britadores, Peneiras e Perfuratrizes",
      "Cabos Elétricos e Conectores Industriais",
      "Kits de Reparo Hidráulico",
    ],
  },
  {
    nome: "Aluguel e Locação de Equipamentos",
    subcategorias: [
      "Britadores Móveis",
      "Peneiras Móveis",
      "Perfuratrizes",
      "Linha Amarela",
      "Caminhões e Guindastes",
      "Geradores e Compressores Portáteis",
      "Plataformas de Carregamento e Manutenção",
    ],
  },
  {
    nome: "Materiais e Insumos",
    subcategorias: [
      "Minérios e Agregados",
      "Produtos Químicos para Beneficiamento",
      "Lubrificantes e Óleos Industriais",
      "Explosivos",
      "Combustíveis",
      "Água Industrial",
      "Areia, Cascalho, Brita",
      "Reagentes Químicos",
      "Graxas e Aditivos",
    ],
  },
  {
    nome: "Serviços e Manutenção",
    subcategorias: [
      "Manutenção de Britadores e Peneiras",
      "Revisão de Perfuratrizes",
      "Troca de Correias Transportadoras",
      "Manutenção de Linha Amarela",
      "Revisão Elétrica e Hidráulica",
      "Transporte de Equipamentos",
      "Consultoria de Processos",
      "Planejamento de Pedreiras",
      "Treinamento de Operadores",
      "Instalação de Equipamentos",
      "Inspeção de Segurança Industrial",
    ],
  },
  {
    nome: "Segurança e Sinalização",
    subcategorias: [
      "EPI - Capacetes",
      "EPI - Luvas",
      "EPI - Botas",
      "EPI - Óculos",
      "EPI - Respiradores",
      "EPI - Protetores Auriculares",
      "Sinalização - Placas",
      "Sinalização - Barreiras Físicas",
      "Sinalização - Alarmes Sonoros e Visuais",
      "Sistemas de Combate a Incêndio - Extintores",
      "Sistemas de Combate a Incêndio - Hidrantes",
      "Sistemas de Combate a Incêndio - Mangueiras",
      "Monitoramento de Gases e Riscos",
      "Barreiras de Contenção de Áreas de Risco",
    ],
  },
  {
    nome: "Infraestrutura e Armazenamento",
    subcategorias: [
      "Silos de Minério",
      "Depósitos de Agregados",
      "Armazéns e Galpões Industriais",
      "Tanques de Combustíveis e Químicos",
      "Pátios de Estocagem",
      "Estruturas Metálicas e Civis",
      "Plataformas de Carregamento",
      "Sistemas de Drenagem e Contenção de Resíduos",
      "Estradas Internas e Ramais Ferroviários",
    ],
  },
  {
    nome: "Laboratório e Controle de Qualidade",
    subcategorias: [
      "Análise de Minérios",
      "Ensaios Físicos e Químicos",
      "Granulometria",
      "Testes de Abrasividade e Dureza",
      "Análise de Umidade",
      "Pesagem e Amostragem",
      "Equipamentos de Calibração",
      "Testes de Densidade e Composição Química",
    ],
  },
  {
    nome: "Energia e Utilidades",
    subcategorias: [
      "Geradores e Transformadores",
      "Painéis Elétricos e Sistemas de Distribuição",
      "Sistemas de Água Industrial",
      "Ar Comprimido e Compressores",
      "Sistemas de Drenagem e Esgoto Industrial",
      "Iluminação Industrial",
      "Sistemas de Ventilação e Exaustão",
    ],
  },
  {
    nome: "Automação, Monitoramento e TI",
    subcategorias: [
      "Sistemas SCADA",
      "Sensores de Nível, Fluxo e Pressão",
      "Câmeras de Monitoramento",
      "Rádios e Comunicação Industrial",
      "Softwares de Planejamento de Produção",
      "IoT e Telemetria para Máquinas",
      "Drones para Inspeção",
    ],
  },
  {
    nome: "Meio Ambiente e Sustentabilidade",
    subcategorias: [
      "Estações de Tratamento de Água e Efluentes",
      "Contenção de Rejeitos e Barragens",
      "Monitoramento de Poeira e Ruído",
      "Reaproveitamento de Materiais",
      "Gestão Ambiental e Licenciamento",
      "Sistemas de Reciclagem de Água e Lama",
    ],
  },
  {
    nome: "Transporte Externo",
    subcategorias: [
      "Caminhões e Carretas de Transporte de Minério",
      "Vagões Ferroviários",
      "Equipamentos de Carga e Descarga",
      "Transporte Especializado de Explosivos e Químicos",
    ],
  },
  {
    nome: "Equipamentos Auxiliares",
    subcategorias: [
      "Gruas e Guindastes Fixos",
      "Plataformas de Acesso e Manutenção",
      "Balanças Industriais",
      "Equipamentos de Pesagem de Caminhões",
      "Equipamentos de Limpeza Industrial",
      "Kits de Ferramentas Manuais",
    ],
  },
  {
    nome: "Outros",
    subcategorias: ["Diversos"],
  },
];

/* ========== Flatten p/ "Categoria > Sub" e set normalizado ========== */
function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9 >-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FLATTENED_TAXONOMY: string[] = (() => {
  const out: string[] = [];
  for (const cat of TAXONOMIA_NOVA) {
    for (const raw of cat.subcategorias) {
      const sub = typeof raw === "string" ? raw : raw?.nome || "";
      if (sub) out.push(`${cat.nome} > ${sub}`.trim());
    }
    // também aceitamos a categoria-mãe sozinha, caso exista assim no banco
    out.push(cat.nome);
  }
  // garante inclusão explícita de "Outros"
  if (!out.includes("Outros")) out.push("Outros");
  return Array.from(new Set(out));
})();
const TAX_SET = new Set(FLATTENED_TAXONOMY.map(normalize));

/* ===================== Sinônimos & mapeamento rápido ===================== */
const SYNONYMS: Record<string, string> = {
  epi: "Segurança e Sinalização > EPI - Capacetes", // cai na primeira de EPI
  epis: "Segurança e Sinalização > EPI - Capacetes",
  lubrificacao:
    "Peças, Componentes e Consumíveis > Lubrificantes, Graxas e Aditivos",
  lubrificação:
    "Peças, Componentes e Consumíveis > Lubrificantes, Graxas e Aditivos",
  britadores: "Britagem e Peneiramento > Britadores - Mandíbulas",
  peneiras: "Britagem e Peneiramento > Peneiras - Vibratórias",
  alimentadores: "Britagem e Peneiramento > Alimentadores - Vibratórios",
  transportadores: "Britagem e Peneiramento > Transportadores - Esteiras",
  moinhos: "Britagem e Peneiramento > Moinhos - Bolas",
  perfuratriz: "Perfuração e Detonação > Perfuratrizes - Superfície",
  perfuratrizes: "Perfuração e Detonação > Perfuratrizes - Superfície",
  rompedor: "Perfuração e Detonação > Drop ball",
  rompedores: "Perfuração e Detonação > Drop ball",
  pecas:
    "Peças, Componentes e Consumíveis > Componentes de Britadores, Peneiras e Perfuratrizes",
  peças:
    "Peças, Componentes e Consumíveis > Componentes de Britadores, Peneiras e Perfuratrizes",
  servico: "Serviços e Manutenção > Manutenção de Britadores e Peneiras",
  serviços: "Serviços e Manutenção > Manutenção de Britadores e Peneiras",
  telas: "Britagem e Peneiramento > Telas",
  "telas de borracha": "Britagem e Peneiramento > Telas de Borracha",
  // --- acrescentar ---
  "automacao, eletrica e controle": "Automação, Monitoramento e TI",
  "automação, elétrica e controle": "Automação, Monitoramento e TI",

  "equipamentos de carregamento e transporte": "Transporte Interno e Logística",
  "equipamentos de perfuracao e demolicao": "Perfuração e Detonação",
  "equipamentos de perfuração e demolição": "Perfuração e Detonação",

  "lubrificacao e produtos quimicos":
    "Peças, Componentes e Consumíveis > Lubrificantes, Graxas e Aditivos",
  "lubrificação e produtos químicos":
    "Peças, Componentes e Consumíveis > Lubrificantes, Graxas e Aditivos",

  "desgaste e revestimento": "Peças, Componentes e Consumíveis", // mãe (genérico)

  "veiculos e pneus": "Transporte Interno e Logística",
  "veículos e pneus": "Transporte Interno e Logística",

  "instrumentos de medicao e controle":
    "Automação, Monitoramento e TI > Sensores de Nível, Fluxo e Pressão",
  "instrumentos de medição e controle":
    "Automação, Monitoramento e TI > Sensores de Nível, Fluxo e Pressão",
};

/* ===================== Similaridade (Levenshtein + Jaccard) ===================== */
function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}
function jaccardTokens(a: string, b: string): number {
  const A = new Set(a.split(" "));
  const B = new Set(b.split(" "));
  const inter = new Set([...A].filter((x) => B.has(x)));
  const uni = new Set([...A, ...B]);
  return uni.size === 0 ? 0 : inter.size / uni.size;
}
function scoreSimilarity(oldRaw: string, candidateRaw: string): number {
  const oldN = normalize(oldRaw);
  const candN = normalize(candidateRaw);
  const lev = levenshtein(oldN, candN);
  const jac = jaccardTokens(oldN, candN);
  return jac * 2 - lev / Math.max(oldN.length, 1);
}
function bestMatch(
  oldCat: string,
  candidates: string[],
): { match: string; score: number } | null {
  let best: { match: string; score: number } | null = null;
  for (const cand of candidates) {
    const s = scoreSimilarity(oldCat, cand);
    if (!best || s > best.score) best = { match: cand, score: s };
  }
  return best;
}

/* ===================== Execução ===================== */
async function main() {
  console.log(`\n🛠  Atualização automática de categorias`);
  console.log(
    `• Modo: ${SHOULD_COMMIT ? "COMMIT (aplicando mudanças)" : "DRY-RUN (simulação)"}`,
  );
  console.log(`• Itens na nova taxonomia: ${FLATTENED_TAXONOMY.length}\n`);

  const snap = await db.collection(USUARIOS_COLLECTION).get();
  console.log(`🔎 Usuários encontrados: ${snap.size}\n`);

  let totalComCategorias = 0;
  let totalAlterados = 0;
  let totalSemMapeamento = 0;

  const exemplosNaoMap = new Set<string>();
  const exemplosMapeios: Array<{ old: string; newV: string; score: number }> =
    [];

  for (const doc of snap.docs) {
    const data = doc.data() as any;

    // Aceita string única, string separada por vírgula, ou array<string>
    let arr: string[] = [];
    const raw = data?.[CATEGORIAS_FIELD];
    if (Array.isArray(raw)) {
      arr = raw.filter(Boolean).map((x: any) => String(x));
    } else if (typeof raw === "string") {
      arr = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (!arr.length) continue;
    totalComCategorias++;

    const novas: string[] = [];

    for (const old of arr) {
      const oldN = normalize(old);

      // 1) Sinônimo
      if (SYNONYMS[oldN]) {
        const target = SYNONYMS[oldN];
        novas.push(target);
        exemplosMapeios.push({ old, newV: target, score: 999 });
        continue;
      }

      // 2) Match exato (com normalização)
      if (TAX_SET.has(oldN)) {
        const original = FLATTENED_TAXONOMY.find((x) => normalize(x) === oldN)!;
        novas.push(original);
        exemplosMapeios.push({ old, newV: original, score: 1000 });
        continue;
      }

      // 3) Similaridade
      const b = bestMatch(old, FLATTENED_TAXONOMY);
      if (b && b.score > 0.2) {
        novas.push(b.match);
        exemplosMapeios.push({ old, newV: b.match, score: b.score });
      } else {
        novas.push("Outros");
        totalSemMapeamento++;
        exemplosNaoMap.add(old);
      }
    }

    // Dedup (mantendo a ordem da primeira ocorrência)
    const novasDedup = Array.from(new Set(novas));

    // Mudança real (ignora ordem para comparar)
    const mudou =
      JSON.stringify(novasDedup.slice().sort()) !==
      JSON.stringify(arr.slice().sort());

    if (mudou) {
      totalAlterados++;
      if (SHOULD_COMMIT) {
        await doc.ref.update({
          [BACKUP_FIELD]: admin.firestore.FieldValue.arrayUnion(...arr),
          [CATEGORIAS_FIELD]: novasDedup,
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(
          `✅ Atualizado: ${doc.id} | ${arr.join(", ")} -> ${novasDedup.join(", ")}`,
        );
      } else {
        console.log(
          `ℹ️  Simular: ${doc.id} | ${arr.join(", ")} -> ${novasDedup.join(", ")}`,
        );
      }
    }
  }

  // ======= RELATÓRIO =======
  console.log(`\n📊 RELATÓRIO`);
  console.log(`Usuários com categorias: ${totalComCategorias}`);
  console.log(`Usuários com alterações: ${totalAlterados}`);
  console.log(
    `Rótulos sem mapeamento (foram para "Outros"): ${totalSemMapeamento}`,
  );

  const exNao = Array.from(exemplosNaoMap).slice(0, 20);
  if (exNao.length) {
    console.log(`\nExemplos NÃO mapeados (até 20):`);
    exNao.forEach((x) => console.log("  -", x));
  }

  exemplosMapeios.sort((a, b) => b.score - a.score);
  const topEx = exemplosMapeios.slice(0, 20);
  if (topEx.length) {
    console.log(`\nExemplos de mapeamentos (até 20):`);
    topEx.forEach((x) =>
      console.log(
        `  - "${x.old}" -> "${x.newV}" (score=${x.score.toFixed(3)})`,
      ),
    );
  }

  console.log(
    `\n${SHOULD_COMMIT ? "✅ Concluído (alterações aplicadas)." : "🔎 Dry-run concluído (nada foi alterado)."}\n`,
  );
}

main().catch((err) => {
  console.error("❌ Erro ao atualizar categorias:", err);
  process.exit(1);
});

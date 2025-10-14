// lib/migrationMap.ts
// Mapa de equivalências 1:1 (antigo -> NOVA taxonomia)
// Chave *normalizada* (sem acento, minúscula, sem pontuação), para ficar à prova de variações.

export type NovaPair = { categoria: string; subcategoria: string };

function stripAccents(s = "") {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function normalizeSpaces(s = "") {
  return s.replace(/\s+/g, " ").trim();
}
function normKey(s = "") {
  return normalizeSpaces(
    stripAccents(String(s).toLowerCase()).replace(/[^\p{L}\p{N}\s/-]/gu, " "),
  );
}

const map = new Map<string, NovaPair>();
function add(
  aliases: string[] | string,
  categoria: string,
  subcategoria: string,
) {
  const list = Array.isArray(aliases) ? aliases : [aliases];
  for (const a of list) map.set(normKey(a), { categoria, subcategoria });
}

/* =========================
 * 1) Equipamentos de Perfuração e Demolição
 * ========================= */
add(
  [
    "Perfuratrizes Rotativas",
    "Perfuratriz Rotativa",
    "Perfuratriz - Rotativa",
    "Rotativas (Perfuratriz)",
  ],
  "Perfuração e Detonação",
  "Perfuratrizes - Rotativas",
);
add(
  [
    "Perfuratrizes Pneumáticas",
    "Perfuratriz Pneumática",
    "Perfuratriz - Pneumática",
    "Pneumáticas (Perfuratriz)",
  ],
  "Perfuração e Detonação",
  "Perfuratrizes - Pneumáticas",
);
add(
  [
    "Perfuratrizes Hidráulicas",
    "Perfuratriz Hidráulica",
    "Perfuratriz - Hidráulica",
    "Hidráulicas (Perfuratriz)",
  ],
  "Perfuração e Detonação",
  "Perfuratrizes - Hidráulica",
);

add(
  [
    "Martelos Demolidores Hidráulicos",
    "Martelo Demolidor Hidráulico",
    "Rompedor Hidráulico",
    "Rompedores Hidráulicos",
  ],
  "Perfuração e Detonação",
  "Martelos Demolidores - Hidráulicos",
);
add(
  [
    "Martelos Demolidores Pneumáticos",
    "Martelo Demolidor Pneumático",
    "Rompedor Pneumático",
    "Rompedores Pneumáticos",
  ],
  "Perfuração e Detonação",
  "Martelos Demolidores - Pneumáticos",
);

add(
  [
    "Brocas para rocha",
    "Broca para rocha",
    "Brocas de Perfuração",
    "Brocas p/ Rocha",
  ],
  "Perfuração e Detonação",
  "Brocas para Rocha",
);
add(
  ["Coroas diamantadas", "Coroa diamantada", "Coroas de Perfuração (Diamante)"],
  "Perfuração e Detonação",
  "Coroas Diamantadas",
);
add(
  [
    "Varetas de extensão",
    "Vareta de extensão",
    "Hastes",
    "Haste de perfuração",
  ],
  "Perfuração e Detonação",
  "Varetas de Extensão",
);

add(["Dinamite"], "Perfuração e Detonação", "Explosivos - Dinamite");
add(
  ["ANFO", "ANFO (Nitrato de Amônio + Óleo Combustível)"],
  "Perfuração e Detonação",
  "Explosivos - ANFO",
);
add(
  ["Detonadores elétricos", "Detonador elétrico"],
  "Perfuração e Detonação",
  "Detonadores - Elétricos",
);
add(
  [
    "Detonadores não elétricos",
    "Detonador não elétrico",
    "Detonador nao eletrico",
  ],
  "Perfuração e Detonação",
  "Detonadores - Não Elétricos",
);
add(
  ["Cordel detonante", "Cordéis detonantes", "Corda detonante"],
  "Perfuração e Detonação",
  "Cordéis Detonantes",
);

/* =========================
 * 2) Carregamento e Transporte
 * ========================= */
add(
  ["Escavadeiras hidráulicas", "Escavadeira hidráulica", "Escavadeiras"],
  "Linha Amarela e Maquinário Pesado",
  "Escavadeiras e Miniescavadeiras",
);
add(
  ["Pás carregadeiras", "Pá carregadeira", "Pás-Carregadeiras"],
  "Linha Amarela e Maquinário Pesado",
  "Pás Carregadeiras",
);

add(
  [
    "Caminhões basculantes (fora de estrada)",
    "Caminhões Fora-de-Estrada",
    "Caminhão fora de estrada",
    "Caminhão basculante fora de estrada",
  ],
  "Transporte Interno e Logística",
  "Caminhões Basculantes e Fora de Estrada",
);
add(
  [
    "Caminhões pipa",
    "Caminhão pipa",
    "Caminhões tanque",
    "Caminhão tanque (água/combustível)",
  ],
  "Transporte Interno e Logística",
  "Caminhões Tanque",
);

add(
  [
    "Correias transportadoras",
    "Correia transportadora",
    "Transportadores Contínuos - Correias",
  ],
  "Transporte Interno e Logística",
  "Correias Transportadoras",
);
add(
  ["Alimentadores vibratórios", "Alimentador vibratório"],
  "Britagem e Peneiramento",
  "Alimentadores - Vibratórios",
);
add(
  [
    "Esteiras rolantes",
    "Transportadores de esteira",
    "Esteiras transportadoras internas",
  ],
  "Transporte Interno e Logística",
  "Esteiras Transportadoras",
);

/* =========================
 * 3) Britagem e Classificação
 * ========================= */
add(
  ["Britadores Mandíbulas", "Britador de Mandíbulas", "Mandíbulas (Britador)"],
  "Britagem e Peneiramento",
  "Britadores - Mandíbulas",
);
add(
  ["Britadores Cônicos", "Britador Cônico", "Cônicos (Britador)"],
  "Britagem e Peneiramento",
  "Britadores - Cônicos",
);
add(
  ["Britadores Impacto", "Britador de Impacto", "Impacto (Britador)"],
  "Britagem e Peneiramento",
  "Britadores - Impacto",
);
add(
  ["Britadores Rolos", "Britador de Rolos", "Rolos (Britador)"],
  "Britagem e Peneiramento",
  "Britadores - Rolos",
);
add(["Rebritadores", "Rebritador"], "Britagem e Peneiramento", "Rebritadores");

add(
  ["Peneiras vibratórias", "Peneira Vibratória"],
  "Britagem e Peneiramento",
  "Peneiras - Vibratórias",
);
add(
  ["Trommels (peneiras rotativas)", "Trommels", "Peneiras rotativas"],
  "Britagem e Peneiramento",
  "Peneiras - Trommels",
);
add(
  ["Hidrociclones", "Hidrociclone"],
  "Britagem e Peneiramento",
  "Classificação - Hidrociclones",
);
add(
  ["Classificadores", "Classificador"],
  "Britagem e Peneiramento",
  "Classificação - Classificadores",
);

add(
  ["Moinhos de bolas", "Moinho de bolas"],
  "Britagem e Peneiramento",
  "Moinhos - Bolas",
);
add(
  ["Moinhos de barras", "Moinho de barras"],
  "Britagem e Peneiramento",
  "Moinhos - Barras",
);
add(
  [
    "Moinhos verticais (roller mills)",
    "Moinhos verticais",
    "Moinho vertical",
    "roller mills",
  ],
  "Britagem e Peneiramento",
  "Moinhos - Verticais (roller mills)",
);

add(
  ["Lavadores de areia", "Lavador de areia"],
  "Britagem e Peneiramento",
  "Lavadores de Areia",
);
add(
  ["Silos e chutes", "Silos", "Chutes"],
  "Britagem e Peneiramento",
  "Silos e Chutes",
);
add(
  ["Carcaças e bases metálicas", "Carcaças metálicas", "Bases metálicas"],
  "Britagem e Peneiramento",
  "Carcaças e Bases Metálicas",
);

/* =========================
 * 4) Beneficiamento e Processamento Mineral
 * ========================= */
add(
  [
    "Separadores Magnéticos - Tambor",
    "Tambor magnético",
    "Separador magnético tambor",
  ],
  "Beneficiamento e Processamento Mineral",
  "Separadores Magnéticos - Tambor",
);
add(
  [
    "Separadores Magnéticos - Overband",
    "Overband",
    "Separador magnético overband",
  ],
  "Beneficiamento e Processamento Mineral",
  "Separadores Magnéticos - Overband",
);

add(
  ["Flotação - Células", "Células de flotação"],
  "Beneficiamento e Processamento Mineral",
  "Flotação - Células",
);
add(
  ["Flotação - Espumantes", "Espumantes de flotação"],
  "Beneficiamento e Processamento Mineral",
  "Flotação - Espumantes",
);
add(
  ["Flotação - Coletores", "Coletores de flotação"],
  "Beneficiamento e Processamento Mineral",
  "Flotação - Coletores",
);

add(
  ["Filtragem e Secagem - Filtros prensa", "Filtros prensa", "Filtro prensa"],
  "Beneficiamento e Processamento Mineral",
  "Filtragem e Secagem - Filtros Prensa",
);
add(
  ["Filtragem e Secagem - Espessadores", "Espessadores"],
  "Beneficiamento e Processamento Mineral",
  "Filtragem e Secagem - Espessadores",
);
add(
  [
    "Filtragem e Secagem - Secadores Rotativos",
    "Secadores rotativos",
    "Secador rotativo",
  ],
  "Beneficiamento e Processamento Mineral",
  "Filtragem e Secagem - Secadores Rotativos",
);

/* =========================
 * 5) Peças e Componentes Industriais
 * ========================= */
add(
  ["Rolamentos", "Rolamento"],
  "Peças, Componentes e Consumíveis",
  "Rolamentos",
);
add(
  ["Engrenagens", "Engrenagem"],
  "Peças, Componentes e Consumíveis",
  "Engrenagens",
);
add(["Polias", "Polia"], "Peças, Componentes e Consumíveis", "Polias");
add(["Eixos", "Eixo"], "Peças, Componentes e Consumíveis", "Eixos");
add(["Mancais", "Mancal"], "Peças, Componentes e Consumíveis", "Mancais");
add(["Buchas", "Bucha"], "Peças, Componentes e Consumíveis", "Buchas");
add(
  ["Correntes", "Corrente"],
  "Peças, Componentes e Consumíveis",
  "Parafusos, Porcas, Arruelas e Fixadores",
); // melhor destino disponível
add(
  ["Correias transportadoras (peças)", "Correias (peças)"],
  "Peças, Componentes e Consumíveis",
  "Correias Transportadoras e Industriais",
);
add(
  ["Esticadores de correia", "Esticador de correia"],
  "Peças, Componentes e Consumíveis",
  "Esticadores de Correia",
);
add(
  [
    "Parafusos e porcas de alta resistência",
    "Parafusos de alta",
    "Porcas de alta",
  ],
  "Peças, Componentes e Consumíveis",
  "Parafusos e Porcas de Alta Resistência",
);
add(
  ["Molas industriais", "Mola industrial"],
  "Peças, Componentes e Consumíveis",
  "Molas Industriais",
);

/* =========================
 * 6) Desgaste e Revestimento
 * ========================= */
add(["Mandíbulas", "Mandibulas"], "Desgaste e Revestimento", "Mandíbulas");
add(["Martelos"], "Desgaste e Revestimento", "Martelos");
add(
  ["Revestimentos de britadores", "Revestimento de britador"],
  "Desgaste e Revestimento",
  "Revestimentos de Britadores",
);
add(
  ["Chapas de desgaste", "Chapa de desgaste"],
  "Desgaste e Revestimento",
  "Chapas de Desgaste",
);
add(
  ["Barras de impacto", "Barra de impacto"],
  "Desgaste e Revestimento",
  "Barras de Impacto",
);
add(["Grelhas", "Grelha"], "Desgaste e Revestimento", "Grelhas");
add(
  ["Telas metálicas", "Tela metálica"],
  "Desgaste e Revestimento",
  "Telas Metálicas",
);
add(
  ["Telas em borracha", "Tela em borracha"],
  "Desgaste e Revestimento",
  "Telas em Borracha",
);

/* =========================
 * 7) Automação, Elétrica e Controle
 * ========================= */
add(
  ["Motores elétricos", "Motor elétrico"],
  "Automação, Monitoramento e TI",
  "Motores (Automação)",
);
add(
  ["Inversores de frequência", "Inversor de frequência"],
  "Automação, Monitoramento e TI",
  "Inversores de Frequência",
);
add(
  ["Painéis elétricos", "Painel elétrico"],
  "Automação, Monitoramento e TI",
  "Painéis Elétricos",
);
add(
  ["Controladores ASRi", "ASRi"],
  "Automação, Monitoramento e TI",
  "Controladores ASRi",
);
add(
  ["Soft starters", "Soft starter"],
  "Automação, Monitoramento e TI",
  "Soft Starters",
);
add(
  ["Sensores e detectores", "Sensores", "Detectores"],
  "Automação, Monitoramento e TI",
  "Sensores e Detectores Diversos",
);
add(
  ["Detectores de metais", "Detector de metais"],
  "Automação, Monitoramento e TI",
  "Detectores de Metais",
);
add(
  ["CLPs e módulos de automação", "CLP", "CLPs"],
  "Automação, Monitoramento e TI",
  "CLPs e Módulos de Automação",
);

/* =========================
 * 8) Lubrificação e Produtos Químicos
 * ========================= */
add(
  ["Óleos lubrificantes", "Óleo lubrificante"],
  "Lubrificação e Produtos Químicos",
  "Óleos Lubrificantes",
);
add(
  ["Graxas industriais", "Graxa industrial"],
  "Lubrificação e Produtos Químicos",
  "Graxas Industriais",
);
add(
  ["Selantes industriais", "Selante industrial"],
  "Lubrificação e Produtos Químicos",
  "Selantes Industriais",
);
add(
  ["Desengripantes", "Desengripante"],
  "Lubrificação e Produtos Químicos",
  "Desengripantes",
);
add(
  ["Produtos químicos para peneiramento"],
  "Lubrificação e Produtos Químicos",
  "Produtos Químicos para Peneiramento",
);

/* =========================
 * 9) Equipamentos Auxiliares e Ferramentas
 * ========================= */
add(
  ["Compressores de Ar - Estacionários", "Compressor de ar estacionário"],
  "Equipamentos Auxiliares e Ferramentas",
  "Compressores - Estacionários",
);
add(
  [
    "Compressores de Ar - Móveis",
    "Compressor de ar móvel",
    "Compressor portátil",
  ],
  "Equipamentos Auxiliares e Ferramentas",
  "Compressores - Móveis",
);
add(
  ["Grupos geradores diesel", "Gerador diesel"],
  "Equipamentos Auxiliares e Ferramentas",
  "Geradores de Energia - Diesel",
);

add(
  ["Bombas de água", "Bomba de água (centrífuga/submersível)"],
  "Motores, Compressores e Sistemas Hidráulicos",
  "Bombas de Água (centrífugas, submersíveis)",
);
add(
  ["Bombas de lama", "Bomba de lama"],
  "Motores, Compressores e Sistemas Hidráulicos",
  "Bombas de Lama",
);

add(
  ["Picaretas, marretas e alavancas"],
  "Equipamentos Auxiliares e Ferramentas",
  "Ferramentas Manuais - Picaretas, Marretas, Alavancas",
);
add(
  ["Chaves de aperto e ajuste", "Chaves e ajustes"],
  "Equipamentos Auxiliares e Ferramentas",
  "Ferramentas Manuais - Chaves e Ajustes",
);
add(
  ["Serra para metais e rochas", "Serras para metais e rochas"],
  "Equipamentos Auxiliares e Ferramentas",
  "Serras para Metais e Rochas",
);
add(
  ["Ferramentas Elétricas", "Ferramenta elétrica"],
  "Equipamentos Auxiliares e Ferramentas",
  "Ferramentas Elétricas",
);

add(
  ["Mangueiras e Conexões Hidráulicas"],
  "Equipamentos Auxiliares e Ferramentas",
  "Mangueiras e Conexões Hidráulicas",
);
add(
  ["Iluminação Industrial"],
  "Equipamentos Auxiliares e Ferramentas",
  "Iluminação Industrial",
);
add(
  ["Abraçadeiras e Fixadores", "Abraçadeiras", "Fixadores"],
  "Equipamentos Auxiliares e Ferramentas",
  "Abraçadeiras e Fixadores",
);
add(
  ["Soldas e Eletrodos", "Solda", "Eletrodo"],
  "Equipamentos Auxiliares e Ferramentas",
  "Soldas e Eletrodos",
);
add(
  ["Equipamentos de Limpeza Industrial"],
  "Equipamentos Auxiliares e Ferramentas",
  "Equipamentos de Limpeza Industrial",
);

/* =========================
 * 10) EPIs (Equipamentos de Proteção Individual)
 * ========================= */
add(
  ["Capacetes com jugular", "Capacete"],
  "EPIs, Segurança e Sinalização",
  "EPI - Capacetes",
);
add(
  ["Protetores auriculares", "Protetor auricular"],
  "EPIs, Segurança e Sinalização",
  "EPI - Protetores Auriculares",
);
add(
  [
    "Máscaras contra poeira",
    "Máscara contra poeira",
    "Respiradores com filtro PFF2",
    "Respiradores com filtro PFF3",
    "Respirador PFF2",
    "Respirador PFF3",
  ],
  "EPIs, Segurança e Sinalização",
  "EPI - Respiradores",
);
add(
  ["Luvas de raspa/couro", "Luva de raspa", "Luva de couro", "Luvas"],
  "EPIs, Segurança e Sinalização",
  "EPI - Luvas",
);
add(
  ["Botas de segurança", "Bota de segurança", "Botas"],
  "EPIs, Segurança e Sinalização",
  "EPI - Botas",
);
add(
  ["Óculos de proteção", "Óculos"],
  "EPIs, Segurança e Sinalização",
  "EPI - Óculos",
);
add(
  ["Colete refletivo", "Colete de segurança"],
  "EPIs, Segurança e Sinalização",
  "EPI - Colete Refletivo",
);

/* =========================
 * 11) Instrumentos de Medição e Controle
 * ========================= */
add(
  ["Inclinômetros", "Inclinômetro"],
  "Instrumentos de Medição e Controle",
  "Monitoramento de Estabilidade - Inclinômetros",
);
add(
  ["Extensômetros", "Extensômetro"],
  "Instrumentos de Medição e Controle",
  "Monitoramento de Estabilidade - Extensômetros",
);

add(
  ["Teor de umidade"],
  "Instrumentos de Medição e Controle",
  "Análise de Material - Teor de Umidade",
);
add(
  ["Granulometria (peneiras de ensaio)", "Granulometria"],
  "Instrumentos de Medição e Controle",
  "Análise de Material - Granulometria (peneiras de ensaio)",
);

add(
  ["Sensores de nível e vazão", "Sensor de nível e vazão"],
  "Instrumentos de Medição e Controle",
  "Sensores de Nível e Vazão",
);
add(
  ["Sistemas de controle remoto", "Sistema de controle remoto"],
  "Automação, Monitoramento e TI",
  "Sistemas de Controle Remoto",
);

/* =========================
 * 12) Manutenção e Serviços Industriais
 * ========================= */
// Itens de consumo -> subcategorias novas correspondentes
add(
  ["Filtros de ar e combustível"],
  "Peças, Componentes e Consumíveis",
  "Filtros de Óleo, Ar e Combustível",
);
add(
  ["Óleos hidráulicos e graxas"],
  "Peças, Componentes e Consumíveis",
  "Lubrificantes, Graxas e Aditivos",
);
add(
  ["Rolamentos e correias"],
  "Peças, Componentes e Consumíveis",
  "Rolamentos",
);
add(
  ["Martelos e mandíbulas para britadores"],
  "Desgaste e Revestimento",
  "Mandíbulas",
);
add(
  ["Pastilhas de desgaste"],
  "Desgaste e Revestimento",
  "Pastilhas de Desgaste",
);

// Serviços
add(
  ["Manutenção industrial", "Serviços de manutenção"],
  "Serviços e Manutenção",
  "Manutenção de Britadores e Peneiras",
);
add(
  ["Usinagem e caldeiraria"],
  "Serviços e Manutenção",
  "Usinagem e Caldeiraria",
);

/* =========================
 * 13) Veículos e Pneus
 * ========================= */
add(
  [
    "Pneus industriais (caminhão, pá carregadeira, empilhadeira)",
    "Pneus industriais",
    "Pneu industrial",
  ],
  "Veículos e Pneus",
  "Pneus Industriais (Caminhão, Pá Carregadeira, Empilhadeira)",
);
add(["Rodas e aros", "Roda", "Aro"], "Veículos e Pneus", "Rodas e Aros");
add(
  ["Recapagens e reformas de pneus", "Recapagem de pneus"],
  "Veículos e Pneus",
  "Recapagens e Reformas de Pneus",
);
add(
  ["Serviços de montagem e balanceamento", "Montagem e balanceamento de pneus"],
  "Veículos e Pneus",
  "Serviços de Montagem e Balanceamento",
);

/* =========================
 * Export
 * ========================= */
export const MIGRATION_MAP: Record<string, NovaPair> = Object.fromEntries(
  map.entries(),
);

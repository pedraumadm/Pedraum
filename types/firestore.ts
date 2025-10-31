// types/firestore.ts
export type DemandStatus = "pending" | "approved" | "rejected" | "open" | "in_progress" | "closed";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  cpf_cnpj?: string;
  bio?: string;
  avatar?: string;
  tipo?: "Usuário" | "Admin" | "Seller" | string;

  prestaServicos: boolean;
  vendeProdutos: boolean;

  atuacaoBasica: {
    categoria: string;
    vendaProdutos: { ativo: boolean; obs: string };
    vendaPecas: { ativo: boolean; obs: string };
    servicos: { ativo: boolean; obs: string };
  }[];

  categoriasAtuacao?: string[];
  categoriasLocked?: boolean;

  atendeBrasil: boolean;
  ufsAtendidas: string[];
  leadPreferencias: {
    categorias: string[];
    ufs: string[];
    ticketMin?: number | null;
    ticketMax?: number | null;
  };

  portfolioImagens: string[];
  portfolioPDFs?: string[];
  portfolioPdfUrl?: string | null;
  portfolioVideos: string[];

  isPatrocinador?: boolean;
  patrocinadorDesde?: any;
  patrocinadorAte?: any;

  mpConnected?: boolean;
  mpStatus?: string;

  status?: "ativo" | "suspenso" | "banido";
  verificado?: boolean;
  role?: "user" | "seller" | "admin";

  financeiro?: {
    plano?: string;
    situacao?: "pago" | "pendente";
    valor?: number | null;
    proxRenovacao?: any;
  };

  limites?: {
    leadsDia?: number | null;
    prioridade?: number | null;
    bloquearUFs?: string[];
    bloquearCategorias?: string[];
  };

  observacoesInternas?: string;
  requirePasswordChange?: boolean;
  categoryLimit?: number | null;
}

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string;
  status: DemandStatus;
  categoria?: string;
  subcategoria?: string;
  uf?: string;
  cidade?: string;
  createdAt?: any;
  updatedAt?: any;
  // campos privados podem ir numa subcoleção /privado
}

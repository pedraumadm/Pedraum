// lib/fs-converters.ts
import { FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";
import { Usuario, Demanda } from "@/types/firestore";

export const usuarioConverter: FirestoreDataConverter<Usuario> = {
  toFirestore(u: Usuario) {
    return u as any;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Usuario {
    const data = snapshot.data(options) as any;
    return {
      id: snapshot.id,
      nome: data.nome ?? "",
      email: data.email ?? "",
      telefone: data.telefone ?? "",
      cidade: data.cidade ?? "",
      estado: data.estado ?? "",
      cpf_cnpj: data.cpf_cnpj ?? data.cpfCnpj ?? "",
      bio: data.bio ?? "",
      avatar: data.avatar ?? "",
      tipo: (data.tipo as any) ?? "Usuário",

      prestaServicos: !!data.prestaServicos,
      vendeProdutos: !!data.vendeProdutos,

      atuacaoBasica: Array.isArray(data.atuacaoBasica) ? data.atuacaoBasica : [],

      categoriasAtuacao: Array.isArray(data.categoriasAtuacao) ? data.categoriasAtuacao : [],
      categoriasLocked: !!data.categoriasLocked,

      atendeBrasil: !!data.atendeBrasil,
      ufsAtendidas: Array.isArray(data.ufsAtendidas) ? data.ufsAtendidas : [],
      leadPreferencias: {
        categorias: data.leadPreferencias?.categorias ?? [],
        ufs: data.leadPreferencias?.ufs ?? [],
        ticketMin: data.leadPreferencias?.ticketMin ?? null,
        ticketMax: data.leadPreferencias?.ticketMax ?? null,
      },

      portfolioImagens: Array.isArray(data.portfolioImagens) ? data.portfolioImagens : [],
      portfolioPDFs: Array.isArray(data.portfolioPDFs) ? data.portfolioPDFs : [],
      portfolioPdfUrl: data.portfolioPdfUrl ?? null,
      portfolioVideos: Array.isArray(data.portfolioVideos) ? data.portfolioVideos : [],

      isPatrocinador: !!data.isPatrocinador,
      patrocinadorDesde: data.patrocinadorDesde ?? null,
      patrocinadorAte: data.patrocinadorAte ?? null,

      mpConnected: !!data.mpConnected,
      mpStatus: data.mpStatus ?? "desconectado",

      status: (data.status as any) ?? "ativo",
      verificado: !!data.verificado,
      role: (data.role as any) ?? "user",

      financeiro: data.financeiro ?? {},
      limites: data.limites ?? {},
      observacoesInternas: data.observacoesInternas ?? "",
      requirePasswordChange: !!data.requirePasswordChange,
      categoryLimit: typeof data.categoryLimit === "number" ? data.categoryLimit : null,
    };
  },
};

export const demandaConverter: FirestoreDataConverter<Demanda> = {
  toFirestore(d: Demanda) {
    return d as any;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options: SnapshotOptions): Demanda {
    const d = snap.data(options) as any;
    return {
      id: snap.id,
      titulo: d.titulo ?? "",
      descricao: d.descricao ?? "",
      status: (d.status as Demanda["status"]) ?? "pending",
      categoria: d.categoria ?? "",
      subcategoria: d.subcategoria ?? "",
      uf: d.uf ?? "",
      cidade: d.cidade ?? "",
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  },
};

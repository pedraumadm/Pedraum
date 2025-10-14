// =============================
// types/user.d.ts
// =============================

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo?: "admin" | "vendedor" | "comprador";
  imagem?: string;
}

export type Subcategoria = {
  nome: string;
  slug?: string;
  ativo?: boolean;
  ordem?: number;
};
export type Categoria = {
  nome: string;
  slug?: string;
  ativo?: boolean;
  ordem?: number;
  subcategorias: Subcategoria[];
};
export type Taxonomia = Categoria[];

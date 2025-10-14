// app/create-produto/layout.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";

export default function CreateProdutoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth
      title="Produto"
      description="Faça login para visualizar os detalhes do produto."
    >
      {children}
    </RequireAuth>
  );
}

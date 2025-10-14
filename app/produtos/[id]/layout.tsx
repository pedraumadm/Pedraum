export default function ProdutosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sem wrappers ou cards globais
  return <>{children}</>;
}

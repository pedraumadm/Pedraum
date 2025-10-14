// /app/services/layout.tsx
export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove qualquer container/card aqui. Deixe apenas os children.
  return <>{children}</>;
}

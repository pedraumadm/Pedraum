// =============================
// components/EmptyState.tsx
// =============================

"use client";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

export default function EmptyState({
  title = "Nenhum resultado encontrado",
  subtitle = "Tente ajustar os filtros ou cadastre algo novo.",
}: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="text-3xl font-bold text-[#023047] mb-2">{title}</div>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

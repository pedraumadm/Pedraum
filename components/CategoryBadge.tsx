// =============================
// components/CategoryBadge.tsx
// =============================

"use client";

interface CategoryBadgeProps {
  categoria: string;
}

const cores: Record<string, string> = {
  Britagem: "bg-blue-100 text-blue-700",
  Transporte: "bg-green-100 text-green-700",
  Peneiramento: "bg-yellow-100 text-yellow-700",
  Equipamento: "bg-purple-100 text-purple-700",
};

export default function CategoryBadge({ categoria }: CategoryBadgeProps) {
  const cor = cores[categoria] || "bg-gray-100 text-gray-700";

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${cor}`}>
      {categoria}
    </span>
  );
}

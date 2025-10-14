// =============================
// components/DemandCard.tsx
// =============================

"use client";

interface DemandCardProps {
  id: string;
  categoria: string;
  descricao: string;
}

export default function DemandCard({
  id,
  categoria,
  descricao,
}: DemandCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow hover:shadow-md transition-all p-6">
      <h3 className="text-lg font-bold text-[#023047] mb-1">{categoria}</h3>
      <p className="text-gray-700 text-sm whitespace-pre-line mb-2">
        {descricao}
      </p>
      <p className="text-xs text-gray-400">ID: {id}</p>
    </div>
  );
}

// =============================
// components/EvaluationCard.tsx
// =============================

"use client";

interface EvaluationCardProps {
  id: string;
  autor: string;
  nota: number;
  comentario: string;
}

export default function EvaluationCard({
  id,
  autor,
  nota,
  comentario,
}: EvaluationCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-[#023047]">{autor}</h3>
        <span className="text-yellow-500 font-bold text-sm">
          Nota: {nota}/5
        </span>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-line">{comentario}</p>
    </div>
  );
}

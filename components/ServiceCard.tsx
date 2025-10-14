// =============================
// components/ServiceCard.tsx
// =============================

"use client";

interface ServiceCardProps {
  id: string;
  titulo: string;
  descricao: string;
  imagem?: string;
}

export default function ServiceCard({
  id,
  titulo,
  descricao,
  imagem,
}: ServiceCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow hover:shadow-md transition-all overflow-hidden">
      {imagem && (
        <img src={imagem} alt={titulo} className="w-full h-40 object-cover" />
      )}
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-bold text-[#023047]">{titulo}</h3>
        <p className="text-sm text-gray-700 whitespace-pre-line">{descricao}</p>
        <p className="text-xs text-gray-400">ID: {id}</p>
      </div>
    </div>
  );
}

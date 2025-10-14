// =============================
// components/PartnerCard.tsx
// =============================

"use client";

interface PartnerCardProps {
  id: string;
  nome: string;
  descricao: string;
  logo: string;
  site?: string;
}

export default function PartnerCard({
  id,
  nome,
  descricao,
  logo,
  site,
}: PartnerCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow p-6 flex flex-col items-center text-center">
      <img src={logo} alt={nome} className="w-20 h-20 object-contain mb-4" />
      <h3 className="text-lg font-bold text-[#023047] mb-1">{nome}</h3>
      <p className="text-sm text-gray-700 mb-2">{descricao}</p>
      {site && (
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#219EBC] hover:underline"
        >
          Visitar site
        </a>
      )}
    </div>
  );
}

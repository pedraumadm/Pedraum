// =============================
// components/ProfileCard.tsx
// =============================

"use client";

interface ProfileCardProps {
  nome: string;
  email: string;
  imagem?: string;
  tipo?: string;
}

export default function ProfileCard({
  nome,
  email,
  imagem,
  tipo,
}: ProfileCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 p-6 flex items-center gap-4">
      <img
        src={imagem || "/avatar.png"}
        alt={nome}
        className="w-16 h-16 rounded-full object-cover border"
      />
      <div>
        <h3 className="text-lg font-bold text-[#023047]">{nome}</h3>
        <p className="text-sm text-gray-600">{email}</p>
        {tipo && <p className="text-xs text-gray-400 mt-1">{tipo}</p>}
      </div>
    </div>
  );
}

// =============================
// components/MessageCard.tsx
// =============================

"use client";

interface MessageCardProps {
  id: string;
  nome: string;
  ultimaMensagem: string;
  onClick?: () => void;
}

export default function MessageCard({
  id,
  nome,
  ultimaMensagem,
  onClick,
}: MessageCardProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer p-4 bg-white rounded-2xl shadow hover:shadow-md border border-gray-200 transition-all"
    >
      <h3 className="text-lg font-semibold text-[#023047]">{nome}</h3>
      <p className="text-sm text-gray-600 truncate">{ultimaMensagem}</p>
    </div>
  );
}

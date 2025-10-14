// =============================
// components/NotificationCard.tsx
// =============================

"use client";

interface NotificationCardProps {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
}

export default function NotificationCard({
  id,
  titulo,
  mensagem,
  data,
}: NotificationCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-lg font-bold text-[#023047]">{titulo}</h3>
        <span className="text-xs text-gray-400">{data}</span>
      </div>
      <p className="text-sm text-gray-700">{mensagem}</p>
    </div>
  );
}

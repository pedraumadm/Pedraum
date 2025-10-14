"use client";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { Bell } from "lucide-react";
import { useState } from "react";

export default function NotificationBell() {
  const { itens, naoLidas, loading, marcarComoLida, marcarTodasComoLidas } =
    useNotificacoes(15);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 border hover:bg-gray-50"
        title="Notificações"
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <b className="text-sm">Notificações</b>
            <button
              onClick={marcarTodasComoLidas}
              className="text-xs underline text-gray-500 hover:text-gray-700"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-80 overflow-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Carregando…</div>
            ) : itens.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Sem notificações.</div>
            ) : (
              itens.map((n) => (
                <button
                  key={n.id}
                  onClick={() => marcarComoLida(n.id)}
                  className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 ${!n.lido ? "bg-amber-50" : ""}`}
                >
                  <div className="text-[13px] font-bold">{n.titulo}</div>
                  <div className="text-[12px] text-gray-600">{n.mensagem}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

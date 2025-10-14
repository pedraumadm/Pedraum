// /components/MPCheckoutButton.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  kind: "lead" | "produto" | "servico" | "demanda";
  refId: string;
  title: string;
  unitPriceCents: number;
  quantity?: number;
  userId?: string | null; // se quiser mandar o usuário atual
  className?: string;
};

export default function MPCheckoutButton({
  kind,
  refId,
  title,
  unitPriceCents,
  quantity = 1,
  userId = null,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          refId,
          title,
          unitPriceCents,
          quantity,
          userId,
        }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || "Erro ao iniciar pagamento");
      }
      const data = await res.json();
      const url = data.init_point || data.sandbox_init_point;
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message || "Falha ao iniciar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70 ${className ?? ""}`}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      <span>Pagar com Mercado Pago</span>
    </button>
  );
}

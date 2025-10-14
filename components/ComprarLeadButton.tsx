"use client";
import { useEffect, useRef, useState } from "react";
import { getMP } from "@/lib/mpClient";

type Props = {
  userId: string;
  leadId: string;
  demandaId?: string;
  title?: string;
  mode?: "brick" | "redirect";
  pathHint?: string; // opcional
};

export default function ComprarLeadButton({
  userId,
  leadId,
  demandaId,
  title = "Contato",
  mode = "brick",
  pathHint,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pref, setPref] = useState<{
    preferenceId: string;
    init_point: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  async function createPreference() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, leadId, demandaId, title, pathHint }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.message || data?.error || "Falha ao criar preferência",
        );
      setPref(data);
      return data;
    } catch (e: any) {
      setError(e.message || "Erro ao iniciar pagamento");
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!pref?.preferenceId || mode !== "brick" || !containerRef.current)
      return;
    (async () => {
      try {
        const mp = await getMP();
        const bricks = mp.bricks();
        await bricks.create("wallet", "mp-wallet", {
          initialization: { preferenceId: pref.preferenceId },
          customization: { texts: { valueProp: "security_details" } },
        });
      } catch (e: any) {
        // Fallback: redireciona se o brick falhar
        if (pref?.init_point) window.location.href = pref.init_point;
      }
    })();
  }, [pref, mode]);

  const handleClick = async () => {
    const p = pref || (await createPreference());
    if (!p) return;
    if (mode === "redirect" && p.init_point)
      window.location.href = p.init_point;
  };

  return (
    <div className="space-y-2">
      {mode === "brick" && <div id="mp-wallet" ref={containerRef} />}
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
      >
        {loading
          ? "Carregando…"
          : mode === "brick"
            ? "Escolher forma de pagamento"
            : "Pagar com Mercado Pago"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

import { NextResponse } from "next/server";
import { getPreference } from "@/lib/mercadopago";

/** Cria preferência no Mercado Pago */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      id = "item-001",
      title = "Produto ou Lead",
      quantity = 1,
      currency_id = "BRL",

      // preço em centavos (preferível)
      unitPriceCents,
      // fallback em reais
      unit_price: unitPriceReais,

      // metadados opcionais para rastreio
      kind = "lead",
      refId,
      metadata,
    } = body ?? {};

    // Normaliza preço para REAIS (o SDK espera em reais)
    const priceCents =
      typeof unitPriceCents === "number"
        ? Math.round(unitPriceCents)
        : Math.round(Number(unitPriceReais ?? 0) * 100);

    if (!title || !priceCents || priceCents <= 0) {
      return NextResponse.json(
        { error: "Parâmetros inválidos." },
        { status: 400 },
      );
    }

    const unit_price = Number((priceCents / 100).toFixed(2));

    // Garante URLs absolutas mesmo sem BASE_URL na Vercel
    const { protocol, host } = new URL(req.url);
    const baseUrl = process.env.BASE_URL ?? `${protocol}//${host}`;

    const pref = await getPreference().create({
      body: {
        items: [{ id, title, quantity, currency_id, unit_price }],
        back_urls: {
          success: `${baseUrl}/checkout/success`,
          failure: `${baseUrl}/checkout/failure`,
          pending: `${baseUrl}/checkout/pending`,
        },
        auto_return: "approved",
        binary_mode: true,
        external_reference: [kind, refId].filter(Boolean).join(":"), // "lead:abc123", p.ex.
        metadata: { ...metadata, priceCents, kind, refId },
      },
    });

    return NextResponse.json({
      preferenceId: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
    });
  } catch (e: any) {
    console.error("create-preference error:", e?.message || e);
    return NextResponse.json(
      {
        error: "Falha ao criar preferência.",
        details: String(e?.message || e),
      },
      { status: 500 },
    );
  }
}

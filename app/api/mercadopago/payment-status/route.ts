import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";

const mpPayment = new Payment(
  new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
  }),
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get("payment_id");
    if (!pid)
      return NextResponse.json(
        { error: "missing payment_id" },
        { status: 400 },
      );

    const p: any = await mpPayment.get({ id: Number(pid) });
    const status = p.status as string;
    const external_reference = p.external_reference as string | undefined;
    return NextResponse.json({ status, external_reference });
  } catch (e: any) {
    console.error("payment-status error:", e?.message || e);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
}

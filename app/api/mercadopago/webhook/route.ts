// app/api/mercadopago/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/mercadopago";
import { getOrder, updateOrderStatus } from "@/lib/orders";

const SECRET = process.env.MP_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const headerSecret = req.headers.get("x-mp-webhook-secret");
    if (SECRET && headerSecret !== SECRET) {
      return NextResponse.json(
        { ok: true, ignored: true, reason: "secret_mismatch" },
        { status: 200 },
      );
    }

    const payload = (await req.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string };
    };
    const type =
      payload.type ??
      (payload.action?.startsWith("payment") ? "payment" : undefined);
    const paymentId = payload.data?.id;

    if (!type || type !== "payment" || !paymentId) {
      return NextResponse.json(
        { ignored: true, reason: "not_payment_or_missing_id" },
        { status: 200 },
      );
    }

    const payment: any = await getPayment().get({ id: String(paymentId) });
    const raw = (payment?.status ?? "pending") as
      | "pending"
      | "approved"
      | "rejected"
      | "cancelled"
      | "in_process"
      | "refunded"
      | "charged_back";

    // mapeie se seu tipo interno não incluir refunded/charged_back
    const status =
      raw === "refunded" || raw === "charged_back" ? "rejected" : raw;

    const extRef = payment?.external_reference as string | undefined;
    if (!extRef)
      return NextResponse.json(
        { ignored: true, reason: "no_external_reference" },
        { status: 200 },
      );

    const match = /^pedraum:pedido:([^:]+)$/.exec(extRef);
    const orderId = match?.[1];
    if (!orderId)
      return NextResponse.json(
        { ignored: true, reason: "bad_external_reference" },
        { status: 200 },
      );

    const order = await getOrder(orderId);
    if (!order)
      return NextResponse.json(
        { ok: true, orderMissing: true },
        { status: 200 },
      );

    if (order.status !== status) {
      await updateOrderStatus(orderId, { status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("webhook error:", e?.message || e);
    return NextResponse.json({ ok: true, handled: false }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

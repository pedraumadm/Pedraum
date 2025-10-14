import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@/firebaseConfig";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const { demandId, supplierId } = await req.json();
    if (!demandId || !supplierId)
      return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const aRef = doc(db, "demandAssignments", `${demandId}_${supplierId}`);
    const dRef = doc(db, "demands", demandId);
    const [aSnap, dSnap] = await Promise.all([getDoc(aRef), getDoc(dRef)]);
    if (!aSnap.exists())
      return NextResponse.json(
        { error: "Assignment não encontrado" },
        { status: 404 },
      );
    if (!dSnap.exists())
      return NextResponse.json(
        { error: "Demanda não encontrada" },
        { status: 404 },
      );

    const a: any = aSnap.data();
    const d: any = dSnap.data();
    const price = (a?.pricing?.amount ?? 1990) / 100;
    const exclusive = !!a?.pricing?.exclusive;
    const cap = a?.pricing?.cap ?? 3;
    const sold = d?.soldCount ?? 0;

    if ((exclusive && sold >= 1) || (!exclusive && sold >= cap)) {
      return NextResponse.json(
        { error: "Indisponível (limite atingido)" },
        { status: 409 },
      );
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    });
    const preference = new Preference(client);
    const external_reference = `${demandId}_${supplierId}`;

    const body: any = {
      items: [
        {
          id: external_reference,
          title: `Desbloqueio de demanda: ${d.title}`,
          quantity: 1,
          unit_price: Number(price.toFixed(2)),
          currency_id: "BRL",
          description: `${d.city}/${d.uf} • ${d.category}`,
        },
      ],
      external_reference,
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mp/webhook`,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/oportunidades/${demandId}?status=success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/oportunidades/${demandId}?status=failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/oportunidades/${demandId}?status=pending`,
      },
      auto_return: "approved",
      statement_descriptor: "PEDRAUM",
    };

    const prefRes = await preference.create({ body });
    await updateDoc(aRef, {
      updatedAt: serverTimestamp(),
      status: a.status === "unlocked" ? "unlocked" : "viewed",
    });

    return NextResponse.json({
      init_point:
        (prefRes as any).init_point || (prefRes as any).sandbox_init_point,
      id: (prefRes as any).id,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message || "Erro ao criar checkout" },
      { status: 500 },
    );
  }
}

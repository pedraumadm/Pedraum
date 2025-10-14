import { NextResponse } from "next/server";
import { db } from "@/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  const { leadId, leadTitle, price } = await req.json();

  // Credenciais fixas (suas, conforme enviado)
  const accessToken =
    "APP_USR-1225380117007706-062313-a9a9bd76d4128ac10d0e97cb79933222-150213449";
  const siteUrl = "http://localhost:3000"; // Se quiser para produção, troque aqui pelo domínio real

  // Validação básica
  if (!leadId || !leadTitle || !price) {
    return NextResponse.json(
      { error: "Dados obrigatórios faltando." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              title: `Lead: ${leadTitle}`,
              quantity: 1,
              unit_price: Number(price),
              currency_id: "BRL",
            },
          ],
          back_urls: {
            success: `${siteUrl}/pagamento/sucesso`,
            failure: `${siteUrl}/pagamento/falha`,
            pending: `${siteUrl}/pagamento/pendente`,
          },
          notification_url: `${siteUrl}/api/mercadopago/webhook`,
          external_reference: leadId,
        }),
      },
    );

    const data = await response.json();

    if (!data.init_point) {
      console.error("Erro Mercado Pago:", data);
      return NextResponse.json(
        { error: "Erro ao criar preferência no Mercado Pago." },
        { status: 500 },
      );
    }

    // Atualiza Firestore com link do pagamento
    const leadRef = doc(db, "leads", leadId);
    await updateDoc(leadRef, {
      paymentLink: data.init_point,
    });

    return NextResponse.json({ paymentLink: data.init_point });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    return NextResponse.json(
      { error: "Erro ao criar pagamento" },
      { status: 500 },
    );
  }
}

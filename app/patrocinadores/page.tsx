"use client";
import Link from "next/link";

const PLAN_ID = process.env.NEXT_PUBLIC_MP_PREAPPROVAL_PLAN_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

// link oficial do checkout de assinatura (preapproval)
const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${PLAN_ID}&back_url=${encodeURIComponent(APP_URL + "/patrocinador/sucesso")}&reason=Patrocinador%20Pedraum`;

export default function PatrocinadorPage() {
  return (
    <main className="min-h-screen bg-[#f9fafb]">
      <section className="max-w-5xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-black text-[#023047] -tracking-[0.02em]">
          Seja Patrocinador do Pedraum
        </h1>
        <p className="text-[#475569] font-semibold mt-2">
          Acesse <b>todas as demandas</b> com <b>contatos liberados</b> e fale
          direto com quem compra.
        </p>

        {/* Benefícios */}
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {[
            ["Acesso total às demandas", "Veja tudo sem restrição."],
            ["Contatos liberados", "Telefone e e‑mail do comprador."],
            ["Prioridade", "Fique na frente quando surgirem novas demandas."],
          ].map(([t, s]) => (
            <div key={t} className="bg-white rounded-2xl p-6 border shadow-sm">
              <div className="font-extrabold text-[#023047]">{t}</div>
              <div className="text-sm text-[#64748b] mt-1">{s}</div>
            </div>
          ))}
        </div>

        {/* Preço & CTA */}
        <div className="bg-white rounded-2xl p-6 border shadow-sm mt-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-2xl font-black text-[#023047]">
                Plano Mensal
              </div>
              <div className="text-[#64748b] font-semibold">
                Cancele quando quiser
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-black text-[#023047]">R$ 297</div>
              <div className="text-sm text-[#64748b] mb-1">/mês</div>
            </div>
          </div>

          <a
            href={checkoutUrl}
            className="inline-flex items-center justify-center mt-6 px-6 py-3 rounded-xl font-black text-white"
            style={{
              background: "linear-gradient(90deg,#fb8500,#fb8500)",
              boxShadow: "0 6px 18px #fb850033",
            }}
          >
            Assinar agora
          </a>

          <div className="text-xs text-[#94a3b8] mt-3">
            Ao clicar, você será redirecionado para o Mercado Pago para concluir
            a assinatura.
          </div>
        </div>

        <div className="mt-8">
          <Link href="/painel" className="text-[#2563eb] font-bold underline">
            Voltar ao painel
          </Link>
        </div>
      </section>
    </main>
  );
}

"use client";
import Link from "next/link";
import {
  ChevronLeft,
  LifeBuoy,
  Mail,
  HelpCircle,
  MessageCircle,
  Phone,
} from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    pergunta: "Como funciona a venda de máquinas na plataforma?",
    resposta:
      "Você cadastra seus equipamentos, recebe leads qualificados e negocia diretamente pelo chat seguro da plataforma. O pagamento e envio são realizados fora da plataforma.",
  },
  {
    pergunta: "Preciso pagar alguma taxa para anunciar?",
    resposta:
      "O cadastro e o anúncio dos produtos são gratuitos. Só há cobrança quando você recebe um lead interessado.",
  },
  {
    pergunta: "Como funciona o pagamento de leads?",
    resposta:
      "Ao receber um contato interessado, você libera o acesso ao lead realizando o pagamento pela plataforma. Após confirmado, recebe todos os dados do potencial comprador.",
  },
  {
    pergunta: "Como buscar suporte técnico?",
    resposta:
      "Basta abrir um chamado na central de ajuda ou entrar em contato pelo WhatsApp. Nossa equipe responderá o mais rápido possível.",
  },
];

export default function AjudaPage() {
  const [faqAtivo, setFaqAtivo] = useState<number | null>(null);

  return (
    <section
      style={{ maxWidth: 850, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <Link
        href="/painel-vendedor"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.1px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "7px 30px",
            background: "#f3f6fa",
            color: "#023047",
            borderRadius: "12px",
            boxShadow: "0 2px 12px #0001",
            fontWeight: 800,
            fontSize: "2rem",
          }}
        >
          Central de Ajuda
        </span>
        <LifeBuoy size={38} color="#059669" style={{ marginLeft: 10 }} />
      </h1>
      <div className="text-[#5B6476] mb-7" style={{ fontSize: 18 }}>
        Tire suas dúvidas, acesse perguntas frequentes, suporte técnico e canais
        de atendimento.
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 44 }}>
        <h2 className="text-xl font-bold text-[#023047] mb-2">
          Perguntas Frequentes
        </h2>
        <div
          style={{
            borderRadius: 14,
            boxShadow: "0 2px 16px #0001",
            background: "#fff",
            border: "1.5px solid #e4e8ef",
          }}
        >
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                borderBottom:
                  i < FAQS.length - 1 ? "1px solid #ececec" : undefined,
              }}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-5 text-lg font-semibold text-left transition hover:bg-[#f8fafc]"
                onClick={() => setFaqAtivo(faqAtivo === i ? null : i)}
                style={{ color: "#2563eb", fontWeight: 700, fontSize: 18 }}
              >
                <span>{faq.pergunta}</span>
                <HelpCircle
                  size={22}
                  className={`ml-2 transition ${faqAtivo === i ? "rotate-180" : ""}`}
                />
              </button>
              <div
                style={{
                  maxHeight: faqAtivo === i ? 400 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.3s cubic-bezier(.4,0,.2,1)",
                  background: "#f8fafc",
                  padding: faqAtivo === i ? "0 26px 15px 26px" : "0 26px",
                  color: "#444",
                  fontSize: 17,
                  fontWeight: 500,
                }}
              >
                {faqAtivo === i && <div>{faq.resposta}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canais de atendimento */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-7"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 30,
          marginBottom: 48,
        }}
      >
        <div
          style={{
            borderRadius: 13,
            boxShadow: "0 2px 13px #0001",
            background: "#fff",
            border: "1.3px solid #e5ecf2",
            padding: "24px 20px 18px 24px",
            minHeight: 122,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Mail size={32} color="#2563eb" />
          <div>
            <div className="font-bold text-[#023047] text-lg">
              Suporte por E-mail
            </div>
            <div className="text-[#495668] mb-1">
              Envie suas dúvidas ou relatos para:
            </div>
            <div className="text-[#2563eb] font-bold text-base">
              contato@pedraum.com.br
            </div>
          </div>
        </div>
        <div
          style={{
            borderRadius: 13,
            boxShadow: "0 2px 13px #0001",
            background: "#fff",
            border: "1.3px solid #e5ecf2",
            padding: "24px 20px 18px 24px",
            minHeight: 122,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <Phone size={32} color="#FB8500" />
          <div>
            <div className="font-bold text-[#023047] text-lg">
              WhatsApp e Telefone
            </div>
            <div className="text-[#495668] mb-1">
              Atendimento rápido via WhatsApp:
            </div>
            <div className="text-[#FB8500] font-bold text-base">
              +55 31 99090-3613
            </div>
          </div>
        </div>
      </div>

      {/* Abrir chamado/suporte */}
      <div
        style={{
          borderRadius: 16,
          boxShadow: "0 2px 13px #0001",
          background: "#f3f6fa",
          border: "1.2px solid #e4e8ef",
          padding: "30px 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <MessageCircle size={36} color="#2563eb" />
        <div className="font-bold text-[#023047] text-lg mb-2">
          Precisa de atendimento?
        </div>
        <div
          className="text-[#495668] mb-2 text-center"
          style={{ fontSize: 16 }}
        >
          Se não encontrou resposta acima, <b>abra um chamado</b> para nosso
          time de suporte.
        </div>
        <Link
          href="mailto:suporte@pedraum.com.br?subject=Ajuda via Plataforma"
          className="bg-[#FB8500] text-white font-bold rounded-xl px-8 py-3 mt-1 shadow-md hover:opacity-90 transition"
        >
          Abrir chamado de suporte
        </Link>
      </div>
    </section>
  );
}

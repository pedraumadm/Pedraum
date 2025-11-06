"use client";

import Link from "next/link";
import {
  ChevronLeft,
  LifeBuoy,
  Mail,
  HelpCircle,
  MessageCircle,
  Phone,
  MessageSquare,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/firebaseConfig";
import { usePathname } from "next/navigation";

/** Use apenas dígitos no número do WhatsApp (DDI+DDD+Número) */
const WHATSAPP_NUMBER = "5531990903613"; // +55 31 99090-3613

const FAQS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Como funciona a venda de máquinas na plataforma?",
    resposta:
      "Você cadastra seus equipamentos/serviços, recebe leads qualificados e negocia diretamente com o comprador. O pagamento e a logística ocorrem fora da plataforma, conforme combinado entre as partes.",
  },
  {
    pergunta: "Preciso pagar alguma taxa para anunciar?",
    resposta:
      "O cadastro e o anúncio são gratuitos. A cobrança acontece apenas quando você recebe um lead interessado (modelo de pay-per-lead).",
  },
  {
    pergunta: "Como funciona o pagamento de leads?",
    resposta:
      "Quando um interessado aparece, você realiza o pagamento do lead na plataforma e, em seguida, tem acesso aos dados completos do contato para negociação.",
  },
  {
    pergunta: "Como buscar suporte técnico?",
    resposta:
      "Você pode abrir um chamado direto pelo WhatsApp (resposta mais rápida) ou enviar e-mail para nossa equipe.",
  },

  // Novas FAQs
  {
    pergunta: "Quais são os requisitos para anunciar um produto ou serviço?",
    resposta:
      "Informe nome, descrição clara, categoria correta, fotos (até 5) e, se possível, um PDF técnico. Para serviços, detalhe escopo, abrangência e condições.",
  },
  {
    pergunta: "Quanto tempo meu anúncio fica ativo?",
    resposta:
      "Por padrão, anúncios de produtos ficam visíveis por 45 dias a partir da data de criação (renováveis). Serviços permanecem ativos enquanto você desejar.",
  },
  {
    pergunta: "Posso editar ou remover meu anúncio?",
    resposta:
      "Sim. Acesse o seu Painel > Meus Produtos/Meus Serviços para editar, pausar ou excluir um anúncio a qualquer momento.",
  },
  {
    pergunta: "Como aumentar minhas chances de venda?",
    resposta:
      "Use fotos nítidas, inclua ficha técnica (PDF), escolha a categoria certa e descreva estado/garantia. Responda aos leads rapidamente.",
  },
  {
    pergunta: "O Pedraum intermedia pagamento ou entrega?",
    resposta:
      "Não. Somos uma plataforma de conexão entre compradores e vendedores/prestadores. Pagamentos e logística são acordados entre as partes.",
  },
];

function buildWhatsAppUrl({
  email,
  page,
  assunto,
  corpo,
}: {
  email?: string;
  page?: string;
  assunto: string;
  corpo?: string;
}) {
  const intro =
    `*${assunto}*` +
    `\n\nOlá, preciso de ajuda via plataforma Pedraum.` +
    (email ? `\nEmail: ${email}` : "") +
    (page ? `\nPágina: ${page}` : "");

  const extra = corpo ? `\n\n${corpo}` : "";
  const text = encodeURIComponent(intro + extra);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export default function AjudaPage() {
  const pathname = usePathname();
  const [faqAtivo, setFaqAtivo] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserEmail(u?.email || undefined));
    return () => unsub();
  }, []);

  const whatsChamadoHref = useMemo(
    () =>
      buildWhatsAppUrl({
        email: userEmail,
        page: typeof window !== "undefined" ? window.location.href : pathname,
        assunto: "Abertura de chamado",
        corpo:
          "Descreva brevemente seu problema:\n- Qual página?\n- O que deveria acontecer?\n- O que aconteceu?\n- Prints/erros (se houver).",
      }),
    [userEmail, pathname]
  );

  const whatsContatoHref = useMemo(
    () =>
      buildWhatsAppUrl({
        email: userEmail,
        page: typeof window !== "undefined" ? window.location.href : pathname,
        assunto: "Contato de suporte",
      }),
    [userEmail, pathname]
  );

  return (
    <section style={{ maxWidth: 850, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      {/* Voltar ao Painel */}
      <Link
        href="/painel"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
          gap: 6,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>

      {/* Título */}
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
        Tire suas dúvidas, acesse perguntas frequentes, suporte técnico e canais de atendimento.
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 44 }}>
        <h2 className="text-xl font-bold text-[#023047] mb-2">Perguntas Frequentes</h2>
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
                borderBottom: i < FAQS.length - 1 ? "1px solid #ececec" : undefined,
              }}
            >
              <button
                type="button"
                aria-expanded={faqAtivo === i}
                aria-controls={`faq-panel-${i}`}
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
                id={`faq-panel-${i}`}
                style={{
                  maxHeight: faqAtivo === i ? 500 : 0,
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
        {/* E-mail */}
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
            <div className="font-bold text-[#023047] text-lg">Suporte por E-mail</div>
            <div className="text-[#495668] mb-1">Envie suas dúvidas ou relatos para:</div>
            <a
              href={`mailto:contato@pedraum.com.br?subject=Suporte%20Pedraum&body=${encodeURIComponent(
                `Olá! Preciso de ajuda.\n\nEmail: ${userEmail || "-"}\nPágina: ${
                  typeof window !== "undefined" ? window.location.href : pathname
                }\n\nDescreva seu caso: `
              )}`}
              className="text-[#2563eb] font-bold text-base hover:underline"
            >
              contato@pedraum.com.br
            </a>
          </div>
        </div>

        {/* WhatsApp */}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="font-bold text-[#023047] text-lg">WhatsApp e Telefone</div>
            <div className="text-[#495668]">Atendimento rápido via WhatsApp:</div>
            <a
              href={whatsContatoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-6 text-[#FB8500] font-bold text-base hover:underline"
              title="Falar no WhatsApp"
            >
              +55 31 99090-3613
              <MessageSquare size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Abrir chamado (vai para WhatsApp) */}
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
        <div className="font-bold text-[#023047] text-lg mb-2">Precisa de atendimento?</div>
        <div className="text-[#495668] mb-2 text-center" style={{ fontSize: 16 }}>
          Se não encontrou resposta acima, <b>abra um chamado</b> no WhatsApp. A mensagem já vai
          com seu e-mail (se logado) e a página atual.
        </div>

        <a
          href={whatsChamadoHref}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white font-bold rounded-xl px-8 py-3 mt-1 shadow-md hover:opacity-90 transition inline-flex items-center gap-2"
          title="Abrir chamado via WhatsApp"
        >
          <MessageSquare size={20} />
          Abrir chamado no WhatsApp
        </a>
      </div>
    </section>
  );
}

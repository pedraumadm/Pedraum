"use client";
import Link from "next/link";
import { ClipboardList, MessagesSquare, Handshake } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <ClipboardList size={22} color="#fff" />,
      pill: "Comece por aqui",
      title: "1. Publique sua demanda",
      desc: "Descreva o que precisa — produto, peça ou serviço — e onde precisa. Leva menos de 2 minutos.",
    },
    {
      icon: <MessagesSquare size={22} color="#fff" />,
      pill: "Respostas rápidas",
      title: "2. Receba propostas",
      desc: "Fornecedores qualificados entram em contato rapidamente com orçamentos, prazos e condições.",
    },
    {
      icon: <Handshake size={22} color="#fff" />,
      pill: "Decisão com confiança",
      title: "3. Feche negócio com segurança",
      desc: "Compare opções, avalie reputação e conclua a compra direto com o fornecedor — sem intermediários.",
    },
  ];

  return (
    <section className="howitworks-wrap" aria-labelledby="howitworks-title">
      <div className="container">
        {/* Título */}
        <div className="head">
          <h2 id="howitworks-title">
            Como o <span className="accent">Pedraum</span> funciona?
          </h2>
          <p className="sub">
            Compra facilitada para mineração e britagem: <b>você precisa</b>,{" "}
            <b>nós encontramos</b>.
          </p>
        </div>

        {/* Cards */}
        <div className="grid">
          {steps.map((s, i) => (
            <article key={i} className="card" role="listitem">
              <div className="pills">
                <span className="pill">{s.pill}</span>
                <span className="icon">{s.icon}</span>
              </div>
              <h3 className="title">{s.title}</h3>
              <p className="desc">{s.desc}</p>
              <span className="bar" />
            </article>
          ))}
        </div>

        {/* CTA (padrão do Header) */}

        <div className="cta">
          <Link href="/create-demanda" className="btn-cta">
            Cadastrar Demanda
          </Link>
          <p className="cta-hint">É grátis e leva menos de 2 minutos.</p>
        </div>
      </div>

      {/* ======= ESTILOS ======= */}
      <style jsx>{`
        .howitworks-wrap {
          width: 100%;
          background: #fff;
          padding: 48px 0 64px;
        }
        .container {
          max-width: 1220px;
          margin: 0 auto;
          padding: 0 2vw;
        }

        .head {
          text-align: center;
          margin-bottom: 18px;
        }
        .head h2 {
          color: #023047;
          font-weight: 900;
          letter-spacing: -0.5px;
          font-size: clamp(1.6rem, 3.2vw, 2rem);
          margin: 0 0 6px 0;
          font-family: "Poppins", "Inter", sans-serif;
        }
        .head .accent {
          color: #fb8500;
        }
        .head .sub {
          color: #64748b;
          font-size: 0.98rem;
          max-width: 720px;
          margin: 0 auto;
        }

        .grid {
          display: grid;
          gap: 14px;
          margin-top: 16px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        .card {
          background: #f6f9fa;
          border: 1.5px solid #ececec;
          border-radius: 18px;
          box-shadow: 0 4px 18px #0001;
          padding: 18px;
          display: flex;
          flex-direction: column;
          transition:
            box-shadow 0.16s,
            transform 0.12s;
        }
        .card:hover {
          box-shadow: 0 10px 26px rgba(2, 48, 71, 0.1);
          transform: translateY(-1px);
        }

        .pills {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap; /* evita quebrar layout no mobile */
        }
        .pill {
          background: #fb8500;
          color: #fff;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 6px 10px;
          letter-spacing: 0.02em;
          display: inline-block;
        }
        .icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #fb8500;
          box-shadow: 0 4px 14px rgba(251, 133, 0, 0.25);
        }

        .title {
          color: #023047;
          font-weight: 800;
          font-size: 1.06rem;
          margin: 2px 0 6px 0;
        }
        .desc {
          color: #5b6476;
          font-size: 0.98rem;
          line-height: 1.5;
        }
        .bar {
          display: block;
          width: 46px;
          height: 2px;
          background: #fb8500;
          border-radius: 2px;
          margin-top: 14px;
        }

        /* Ajustes finos no mobile */
        @media (max-width: 640px) {
          .card {
            padding: 14px 14px 16px;
            border-radius: 16px;
          }
          .title {
            font-size: 1rem;
          }
          .desc {
            font-size: 0.95rem;
          }
          .bar {
            width: 40px;
          }
        }

        .cta {
          text-align: center;
          margin-top: 22px;
          padding: 0 4px;
        }
        .btn-cta {
          background: #fb8500;
          color: #fff;
          font-weight: 700;
          font-size: 1.01rem;
          border-radius: 15px;
          padding: 10px 22px;
          box-shadow: 0 4px 14px #0001;
          display: inline-block;
          text-decoration: none;
          transition: background 0.15s;
        }
        .btn-cta:hover {
          background: #e17000;
        }
        .cta-hint {
          color: #94a3b8;
          font-size: 0.86rem;
          margin-top: 6px;
        }

        /* Botão 100% no mobile */
        @media (max-width: 640px) {
          .btn-cta {
            width: 100%;
            max-width: 520px;
          }
        }
        input[type="email"] {
          max-width: 100% !important;
          min-width: 0 !important;
        }
        button[type="submit"] {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
    </section>
  );
}

"use client";
import Link from "next/link";

type Props = {
  primaryHref?: string; // rota para cadastrar produto/serviço
  secondaryHref?: string; // rota para ver demandas ativas
  imgSrc?: string; // imagem ilustrativa do fornecedor
};

export default function SuppliersServices({
  primaryHref = "/vitrine", // ajuste para a rota real de cadastro
  secondaryHref = "/demandas",
  imgSrc = "/banners/fornecedor.jpg",
}: Props) {
  return (
    <section className="ss-wrap" aria-labelledby="ss-title">
      <div className="ss-container">
        {/* Coluna da imagem */}
        <div className="ss-media" aria-hidden="true">
          <div className="ss-media-inner">
            <img src={imgSrc} alt="" draggable={false} className="ss-img" />
          </div>
        </div>

        {/* Coluna de conteúdo */}
        <div className="ss-content">
          <h2 id="ss-title" className="ss-title">
            É Fornecedor? Conecte seus produtos e serviços às mineradoras que
            precisam de você
          </h2>

          <p className="ss-desc">
            No <b>Pedraum</b>, você ganha visibilidade no setor de britagem e
            mineração. Cadastre seus produtos e serviços em poucos minutos e
            comece a receber
            <b> demandas reais</b> de empresas em busca de fornecedores
            qualificados.
          </p>

          <ul className="ss-benefits" role="list">
            <li>
              <span className="dot" /> <b>Mais clientes, menos esforço:</b>{" "}
              esteja na vitrine e seja encontrado por mineradoras de todo o
              Brasil.
            </li>
            <li>
              <span className="dot" /> <b>Atenda demandas ativas:</b> receba
              solicitações diretas de quem precisa, sem perder tempo com
              prospecção.
            </li>
            <li>
              <span className="dot" /> <b>Leads qualificados:</b> contatos e
              propostas chegam direto pela plataforma.
            </li>
            <li>
              <span className="dot" /> <b>Negócios com segurança:</b> conectamos
              você a compradores reais e verificados.
            </li>
          </ul>

          {/* Ações – estilo idêntico ao Hero */}
          <div
            className="ss-actions"
            style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
          >
            <Link href={primaryHref} passHref legacyBehavior>
              <a
                style={{
                  background: "#FB8500",
                  color: "#fff",
                  fontSize: "1.06rem",
                  fontWeight: 800,
                  borderRadius: 18,
                  padding: "14px 22px",
                  boxShadow: "0 10px 24px #0003",
                  textDecoration: "none",
                  minWidth: 170,
                  textAlign: "center",
                  letterSpacing: ".01em",
                  transition: "background .15s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e17000")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#FB8500")
                }
              >
                Cadastrar Produto ou Serviço
              </a>
            </Link>

            <Link href={secondaryHref} passHref legacyBehavior>
              <a
                style={{
                  background: "rgba(255,255,255,.92)",
                  color: "#023047",
                  fontSize: "1.06rem",
                  fontWeight: 800,
                  borderRadius: 18,
                  padding: "14px 22px",
                  boxShadow: "0 10px 24px #0000001f",
                  textDecoration: "none",
                  minWidth: 180,
                  textAlign: "center",
                  letterSpacing: ".01em",
                  transition: "background .15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#fff")}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,.92)")
                }
              >
                Ver Demandas Ativas
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* ======= ESTILOS ======= */}
      <style jsx>{`
        .ss-wrap {
          width: 100%;
          background: #fff;
          padding: 46px 0 56px;
          border-top: 1px solid #f1f5f9;
        }
        .ss-container {
          max-width: 1220px;
          margin: 0 auto;
          padding: 0 2vw;
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          align-items: center;
        }
        @media (min-width: 960px) {
          .ss-container {
            grid-template-columns: 1.1fr 1fr;
            gap: 24px;
          }
        }

        /* Imagem */
        .ss-media {
          order: -1;
        }
        @media (min-width: 960px) {
          .ss-media {
            order: 0;
          }
        }

        .ss-media-inner {
          background: #e7edf5;
          border: 1.5px solid #ececec;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 4px 18px #0001;
          min-height: 260px;
        }
        .ss-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          user-select: none;
          filter: saturate(1.02) contrast(1.02);
        }

        /* Conteúdo */
        .ss-content {
          padding: 4px 2px;
        }
        .ss-title {
          color: #023047;
          font-weight: 900;
          letter-spacing: -0.5px;
          font-size: clamp(1.35rem, 2.7vw, 1.9rem);
          margin: 0 0 8px 0;
          font-family: "Poppins", "Inter", sans-serif;
        }
        .ss-desc {
          color: #5b6476;
          font-size: 1rem;
          line-height: 1.55;
          margin: 6px 0 14px;
          max-width: 740px;
        }
        .ss-benefits {
          list-style: none;
          padding: 0;
          margin: 0 0 18px 0;
          color: #5b6476;
          display: grid;
          gap: 10px;
        }
        .ss-benefits li {
          font-size: 0.98rem;
          line-height: 1.5;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #fb8500;
          margin-top: 8px;
          flex: 0 0 8px;
        }

        /* Ações (layout) */
        .ss-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 10px;
        }

        /* === BOTÕES NO ESTILO DO HERO === */
        /* Primário laranja */
        .btn-hero-primary {
          background: #fb8500;
          color: #fff;
          font-weight: 700;
          font-size: 1.09rem; /* igual ao hero */
          border-radius: 18px; /* igual ao hero */
          padding: 14px 28px; /* igual ao hero */
          box-shadow: 0 4px 20px #0003; /* igual ao hero */
          text-decoration: none;
          transition:
            background 0.15s,
            transform 0.13s;
          display: inline-block;
          letter-spacing: -0.5px;
        }
        .btn-hero-primary:hover {
          background: #e17000;
          transform: translateY(-1px);
        }

        /* Secundário branco (borda + leve sombra) */
        .btn-hero-secondary {
          background: #fff;
          color: #023047;
          font-weight: 700;
          font-size: 1.09rem; /* igual ao hero */
          border-radius: 18px; /* igual ao hero */
          padding: 14px 24px; /* igual ao hero */
          box-shadow: 0 4px 20px #0001; /* igual ao hero */
          border: 1.5px solid #e6e6e6; /* igual ao hero */
          text-decoration: none;
          transition:
            background 0.15s,
            transform 0.13s,
            border-color 0.15s;
          display: inline-block;
          letter-spacing: -0.5px;
        }
        .btn-hero-secondary:hover {
          background: #f8fafc;
          border-color: #dfe3e8;
          transform: translateY(-1px);
        }

        /* Mobile: botões 100% */
        @media (max-width: 640px) {
          .btn-hero-primary,
          .btn-hero-secondary {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            text-align: center;
          }
        }
      `}</style>
    </section>
  );
}

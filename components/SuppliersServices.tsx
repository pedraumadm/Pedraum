"use client";
import Link from "next/link";

type Props = {
  primaryHref?: string;   // rota para criar conta / acessar painel e responder demandas
  secondaryHref?: string; // rota para ver demandas ativas
  imgSrc?: string;        // imagem ilustrativa (fornecedor respondendo demanda)
};

export default function SuppliersServices({
  primaryHref = "/auth/register",
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
            É fornecedor? Responda demandas reais e feche negócios com
            mineradoras de todo o Brasil
          </h2>

          <p className="ss-desc">
            No <b>Pedraum</b>, as oportunidades nascem a partir das{" "}
            <b>demandas publicadas</b> por quem precisa comprar. Você acompanha
            o fluxo de demandas do seu segmento, envia propostas em poucos
            cliques e transforma necessidade em contrato – sem depender de
            vitrine de produtos.
          </p>

          <ul className="ss-benefits" role="list">
            <li>
              <span className="dot" />{" "}
              <b>Foque em quem já está comprando:</b> visualize apenas demandas
              reais do seu nicho, prontas para receber orçamento.
            </li>
            <li>
              <span className="dot" />{" "}
              <b>Envie propostas diretas:</b> responda as demandas pela
              plataforma, apresente suas soluções e negocie com o decisor.
            </li>
            <li>
              <span className="dot" />{" "}
              <b>Organize oportunidades:</b> acompanhe demandas respondidas,
              contatos e status em um único lugar.
            </li>
            <li>
              <span className="dot" />{" "}
              <b>Negócios com segurança:</b> conectamos você a compradores{" "}
              <b>verificados</b>, reduzindo ruído e perda de tempo.
            </li>
          </ul>

          {/* Ações – estilo idêntico ao Hero (agora voltadas a demandas) */}
          <div
            className="ss-actions"
            style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
          >
            {/* CTA principal: criar conta para responder demandas */}
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
                  minWidth: 210,
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
                Criar conta para responder demandas
              </a>
            </Link>

            {/* CTA secundário: ver lista de demandas */}
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
                  minWidth: 190,
                  textAlign: "center",
                  letterSpacing: ".01em",
                  transition: "background .15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#fff")}
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,.92)")
                }
              >
                Ver demandas publicadas
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

        .ss-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 10px;
        }

        @media (max-width: 640px) {
          .ss-actions a {
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

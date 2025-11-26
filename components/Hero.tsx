import Link from "next/link";
import { useEffect, useRef } from "react";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    containerRef.current?.classList.add("animate-hero-fade");
  }, []);

  return (
    <section
      className="hero-premium"
      style={{
        backgroundImage: "url('/hero-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "420px",
        height: "clamp(420px, 60vw, 650px)",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        marginBottom: 0,
      }}
    >
      {/* Overlay escuro */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,0.65)",
          zIndex: 1,
        }}
      />
      {/* Degradê suave na base */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "120px",
          zIndex: 2,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 10%, #f6f9fa 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Conteúdo */}
      <div
        ref={containerRef}
        className="hero-content"
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          maxWidth: "760px",
          width: "100%",
          padding: "40px 24px 48px 24px",
        }}
        tabIndex={-1}
      >
        <span
          style={{
            background: "rgba(255,255,255,.18)",
            padding: "7px 12px",
            borderRadius: 999,
            display: "inline-block",
            fontSize: 12.5,
            letterSpacing: ".02em",
            marginBottom: 12,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          Fornecedores qualificados • retorno médio algumas horas
        </span>

        <h1
          style={{
            color: "#fff",
            fontSize: "clamp(2.2rem, 6.2vw, 3.4rem)",
            fontWeight: 900,
            lineHeight: 1.08,
            marginBottom: 16,
            textShadow: "0 4px 24px #2226, 0 1px 0 #0003",
            letterSpacing: "-1.2px",
            fontFamily: "'Poppins','Inter',sans-serif",
          }}
        >
          Encontre a <span style={{ color: "#FFB703" }}>Oportunidade Ideal</span>{" "}
          para sua Mineradora, em Minutos
        </h1>

        <p
          style={{
            color: "#fff",
            fontSize: "1.08rem",
            lineHeight: 1.52,
            marginBottom: 26,
            textShadow: "0 2px 12px #0008",
            maxWidth: 640,
            opacity: 0.95,
            fontWeight: 500,
          }}
        >
          Conectamos suas demandas a fornecedores <b>qualificados</b> de
          produtos e serviços para britagem e mineração. <b>Mais opções</b>,{" "}
          <b>menos risco</b> e zero complicação.
        </p>

        <div
          className="hero-buttons"
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "flex-start",
          }}
        >
          <Link href="/create-demanda" passHref legacyBehavior>
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
                transition: "background .15s, transform .15s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#e17000")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#FB8500")}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "translateY(1px)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              Cadastrar Demanda
            </a>
          </Link>

          <Link href="/demandas" passHref legacyBehavior>
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
                transition: "background .15s, transform .15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#fff")}
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,.92)")
              }
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "translateY(1px)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              Ver Demandas
            </a>
          </Link>
        </div>

        {/* Seta animada */}
        <div
          style={{
            marginTop: 34,
            display: "flex",
            justifyContent: "center",
            width: "100%",
            minHeight: 32,
          }}
        >
          <span
            style={{
              display: "block",
              width: 32,
              height: 32,
              opacity: 0.35,
              animation: "hero-bounce 1.5s infinite",
              filter: "drop-shadow(0 2px 6px #0007)",
            }}
            aria-hidden
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 7v18M16 25l-7-7m7 7l7-7"
                stroke="#fff"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>

      {/* CSS Animations + responsividade */}
      <style>{`
        /* ====== TABLET (<= 900px) ====== */
        @media (max-width: 900px) {
          .hero-premium {
            height: clamp(420px, 70vh, 620px) !important;
          }
          .hero-content {
            align-items: center !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            max-width: 100% !important;
            text-align: center !important;
          }
          .hero-content h1,
          .hero-content p {
            text-align: center !important;
            width: 100% !important;
          }
          .hero-buttons {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: center !important;
            width: 100% !important;
            margin-bottom: 2px !important;
          }
          .hero-buttons a {
            width: min(92vw, 360px) !important;
            min-width: 0 !important;
            font-size: 1.04rem !important;
            padding: 14px 0 !important;
          }
        }

        /* ====== MOBILE (<= 600px) ====== */
        @media (max-width: 600px) {
          .hero-premium {
            min-height: 480px !important;
            height: clamp(520px, 88vh, 640px) !important;
            background-position: 50% 35% !important; /* sobe um pouco a imagem */
          }
          .hero-content {
            padding-left: max(12px, env(safe-area-inset-left)) !important;
            padding-right: max(12px, env(safe-area-inset-right)) !important;
            padding-top: max(14px, env(safe-area-inset-top)) !important;
            padding-bottom: 12px !important;
            max-width: 100vw !important;
          }
          .hero-content h1 {
            font-size: clamp(1.56rem, 6.5vw, 1.9rem) !important;
            line-height: 1.18 !important;
            letter-spacing: -0.4px !important;
            margin-bottom: 14px !important;
          }
          .hero-content p {
            font-size: 0.98rem !important;
            line-height: 1.46 !important;
            margin-bottom: 16px !important;
            padding: 0 2px !important;
          }
          .hero-buttons a {
            font-size: 1rem !important;
            padding: 13px 0 !important;
            width: min(92vw, 380px) !important;
            border-radius: 16px !important;
          }
        }

        /* ====== VERY SMALL (<= 360px) ====== */
        @media (max-width: 360px) {
          .hero-premium {
            min-height: 520px !important;
            height: 95vh !important;
          }
          .hero-content h1 {
            font-size: 1.42rem !important;
          }
          .hero-buttons a {
            width: 94vw !important;
          }
        }

        /* Motion */
        @keyframes hero-bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(15px); }
        }
        .animate-hero-fade {
          animation: fadeinhero 1.0s cubic-bezier(.28,.79,.66,1.14);
        }
        @keyframes fadeinhero {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Acessibilidade: reduz animação para usuários que preferem menos movimento */
        @media (prefers-reduced-motion: reduce) {
          .animate-hero-fade { animation: none !important; }
          .hero-bounce { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

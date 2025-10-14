"use client";
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
        position: "relative",
        width: "100%",
        minHeight: "400px",
        height: "clamp(420px, 60vw, 650px)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // cor de fundo para as “barras” (quando a imagem não ocupa tudo)
        backgroundColor: "#0f2747",
        marginBottom: 0,
      }}
    >
      {/* Imagem estática — aparece INTEIRA */}
      <img
        src="/banners/banner1.jpg"
        alt="Carregadeira em operação na mina"
        draggable={false}
        className="hero-img"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          // garante que a imagem nunca corte
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />

      {/* Overlay escuro para contraste do texto */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(rgba(0,0,0,.58), rgba(0,0,0,.42))",
          zIndex: 1,
        }}
      />

      {/* Degradê na base para casar com o fundo da página */}
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
          +200 fornecedores qualificados • retorno médio ~24h
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
          Encontre o <span style={{ color: "#FFB703" }}>Fornecedor Ideal</span>{" "}
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
          <Link href="/demandas" passHref legacyBehavior>
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
              onMouseOut={(e) => (e.currentTarget.style.background = "#FB8500")}
            >
              Cadastrar Demanda
            </a>
          </Link>

          <Link href="/vitrine" passHref legacyBehavior>
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
              Ver Fornecedores
            </a>
          </Link>

          <span style={{ color: "rgba(255,255,255,.88)", fontSize: 13 }}>
            Grátis e rápido
          </span>
        </div>
      </div>

      {/* Responsividade + animações */}
      <style>{`
        @media (max-width: 900px) {
          .hero-content {
            align-items: center !important;
            padding: 24px 10px 32px 10px !important;
            max-width: 100% !important;
          }
          .hero-content h1,
          .hero-content p { text-align: center !important; }
          .hero-buttons { flex-direction: column; align-items: center; }
          .hero-buttons a { width: 75vw; max-width: 330px; }
        }
        @media (max-width: 600px) {
          .hero-content h1 { font-size: 1.7rem !important; line-height: 1.18 !important; }
          .hero-content p { font-size: 1.02rem !important; }
          .hero-buttons a { max-width: 92vw; }
        }
        .animate-hero-fade { animation: fadeinhero 1s cubic-bezier(.28,.79,.66,1.14); }
        @keyframes fadeinhero {
          0% { opacity: 0; transform: translateY(22px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

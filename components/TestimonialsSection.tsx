"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

// ARRAY DE DEPOIMENTOS
const testimonials = [
  {
    nome: "Carlos Souza",
    texto:
      "A Pedraum facilitou demais a venda do meu britador! Atendimento rápido, plataforma simples e direta. Recomendo muito!",
  },
  {
    nome: "Luciana Mendes",
    texto:
      "Tive dúvidas sobre as máquinas e o suporte foi excelente. Encontrei exatamente o que precisava para minha obra.",
  },
  {
    nome: "João Pedro Silveira",
    texto:
      "Ótima experiência! Negociei direto com o vendedor, sem enrolação. Preço justo e entrega rápida.",
  },
  {
    nome: "Sueli Amaral",
    texto:
      "Nunca pensei que seria tão fácil alugar equipamentos. O Pedraum superou minhas expectativas.",
  },
  {
    nome: "Anderson Ribeiro",
    texto:
      "O site é super intuitivo, consegui vender meu equipamento em poucos dias.",
  },
  {
    nome: "Renata Dias",
    texto: "Muito fácil de usar, ótimos contatos! Recomendo para todo setor.",
  },
  {
    nome: "Fernanda Silva",
    texto:
      "A plataforma conectou minha empresa com vários compradores em potencial rapidamente.",
  },
];

export default function TestimonialsSection() {
  const slider = useRef<HTMLDivElement>(null);

  // Funções para deslizar no desktop
  const scroll = (dir: "left" | "right") => {
    if (slider.current) {
      const { clientWidth } = slider.current;
      slider.current.scrollBy({
        left: dir === "left" ? -clientWidth : clientWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <section
      style={{
        width: "100%",
        background: "linear-gradient(90deg,#fff 60%,#F6F9FA 100%)",
        padding: "0 0 48px 0",
        margin: "0 auto",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "36px 3vw 0 3vw",
        }}
      >
        <h2
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#023047",
            letterSpacing: "-1px",
            textAlign: "center",
            marginBottom: 9,
            fontFamily: "'Poppins','Inter',sans-serif",
          }}
        >
          O que dizem sobre o <span style={{ color: "#fb8500" }}>Pedraum</span>
        </h2>

        <div style={{ position: "relative" }}>
          {/* Setas desktop */}
          <button
            aria-label="Ver depoimentos anteriores"
            onClick={() => scroll("left")}
            className="testimonial-arrow testimonial-arrow-left"
          >
            <ChevronLeft size={33} />
          </button>
          <button
            aria-label="Ver próximos depoimentos"
            onClick={() => scroll("right")}
            className="testimonial-arrow testimonial-arrow-right"
          >
            <ChevronRight size={33} />
          </button>

          {/* Carrossel */}
          <div
            className="testimonials-slider"
            ref={slider}
            style={{
              display: "flex",
              gap: 28,
              overflowX: "auto",
              padding: "16px 2px 8px 2px",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              scrollbarWidth: "thin",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {testimonials.map((t, i) => (
              <div
                key={t.nome + i}
                className="testimonial-card"
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  boxShadow: "0 6px 32px #02304712",
                  padding: "26px 22px 18px 22px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  minWidth: 310,
                  maxWidth: 370,
                  border: "1.2px solid #f6e9dc",
                  scrollSnapAlign: "start",
                  transition: "transform .15s, box-shadow .15s",
                  position: "relative",
                  flex: "0 0 350px",
                  marginBottom: 7,
                }}
              >
                <div
                  style={{
                    minHeight: 70,
                    marginBottom: 10,
                    color: "#333",
                    fontSize: 17,
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}
                >
                  "{t.texto}"
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "auto",
                    gap: 7,
                    fontWeight: 800,
                    color: "#fb8500",
                    fontSize: 15.7,
                    letterSpacing: "-0.4px",
                    fontFamily: "'Poppins','Inter',sans-serif",
                  }}
                >
                  <span>{t.nome}</span>
                  <span style={{ display: "flex", gap: 1, marginLeft: 7 }}>
                    {[...Array(5)].map((_, s) => (
                      <Star
                        key={s}
                        size={16}
                        fill="#fb8500"
                        color="#fb8500"
                        style={{ opacity: 0.9 }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS RESPONSIVO */}
      <style jsx>{`
        .testimonials-slider::-webkit-scrollbar {
          height: 8px;
        }
        .testimonials-slider::-webkit-scrollbar-thumb {
          background: #ffe5be;
          border-radius: 8px;
        }
        .testimonial-arrow {
          position: absolute;
          top: 46%;
          transform: translateY(-50%);
          z-index: 2;
          background: #fff;
          border: 1.7px solid #fb8500;
          color: #fb8500;
          border-radius: 99px;
          width: 46px;
          height: 46px;
          box-shadow: 0 4px 22px #fb850025;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition:
            background 0.14s,
            color 0.14s,
            border 0.14s;
        }
        .testimonial-arrow-left {
          left: -23px;
        }
        .testimonial-arrow-right {
          right: -23px;
        }
        .testimonial-arrow:hover,
        .testimonial-arrow:focus {
          background: #fb8500;
          color: #fff;
          border-color: #fb8500;
        }
        @media (max-width: 1100px) {
          .testimonial-arrow {
            width: 41px;
            height: 41px;
            left: -11px;
            right: -11px;
          }
        }
        @media (max-width: 750px) {
          .testimonial-arrow {
            display: none !important;
          }
          .testimonial-card {
            min-width: 88vw !important;
            max-width: 94vw !important;
            flex: 0 0 94vw !important;
          }
        }
        @media (max-width: 500px) {
          .testimonial-card {
            min-width: 99vw !important;
            max-width: 101vw !important;
            flex: 0 0 99vw !important;
          }
        }
      `}</style>
    </section>
  );
}

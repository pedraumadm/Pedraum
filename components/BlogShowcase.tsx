"use client";
import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const posts = [
  {
    id: "1",
    imagem: "/blog1.jpg",
    titulo: "Como avaliar um britador antes de comprar",
    resumo:
      "Descubra os principais critérios para não errar na hora de investir em equipamentos de britagem para sua obra ou empresa.",
    data: "02/06/2025",
    url: "/blog/como-avaliar-britador",
  },
  {
    id: "2",
    imagem: "/blog2.jpg",
    titulo: "Tendências em locação de máquinas",
    resumo:
      "O mercado está mudando: veja as vantagens de alugar versus comprar equipamentos pesados para mineração e construção.",
    data: "30/05/2025",
    url: "/blog/tendencias-locacao-maquinas",
  },
  {
    id: "3",
    imagem: "/blog3.jpg",
    titulo: "Dicas para prolongar a vida útil do seu maquinário",
    resumo:
      "Cuidados simples podem aumentar (muito!) a durabilidade dos seus equipamentos. Veja as melhores práticas.",
    data: "28/05/2025",
    url: "/blog/dicas-vida-util-maquinario",
  },
  {
    id: "4",
    imagem: "/blog4.jpg",
    titulo: "Case de sucesso: venda rápida no Pedraum",
    resumo:
      "Veja como um vendedor conseguiu negociar seu equipamento em menos de 7 dias usando nossa plataforma.",
    data: "25/05/2025",
    url: "/blog/case-sucesso-venda-rapida",
  },
];

export default function BlogShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollLeft() {
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: -350, behavior: "smooth" });
  }
  function scrollRight() {
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: 350, behavior: "smooth" });
  }

  return (
    <section
      className="blogshowcase-bg"
      style={{
        background: "#F6F9FA",
        padding: "64px 0 68px 0",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          padding: "0 2vw",
        }}
      >
        {/* Título e resumo */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-1px",
              marginBottom: 7,
              fontFamily: "'Poppins','Inter',sans-serif",
            }}
          >
            Blog do <span style={{ color: "#FB8500" }}>Pedraum</span>
          </h2>
          <div
            style={{
              color: "#7687A3",
              fontSize: 18,
              fontWeight: 500,
              maxWidth: 540,
              margin: "0 auto 14px auto",
              lineHeight: 1.55,
            }}
          >
            Conteúdos e dicas sobre equipamentos, negócios e o mercado de
            mineração para você se destacar no setor.
          </div>
        </div>

        {/* Link "Ver todas" */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link
            href="/blog"
            style={{
              color: "#FB8500",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              letterSpacing: ".01em",
              transition: "color .18s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#e17000")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#FB8500")}
          >
            Ver todas &rarr;
          </Link>
        </div>

        {/* Carrossel com setas */}
        <div
          className="blogshowcase-carousel-row"
          style={{
            position: "relative",
            width: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Seta esquerda */}
          <button
            className="carousel-arrow-left"
            style={{
              position: "absolute",
              left: -24,
              zIndex: 2,
              background: "#fff",
              border: "1.5px solid #eee",
              boxShadow: "0 6px 28px #0001",
              borderRadius: 99,
              width: 50,
              height: 50,
              display: "none", // some no mobile, aparece no desktop pelo CSS
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background .13s, box-shadow .15s",
            }}
            onClick={scrollLeft}
            aria-label="Anterior"
            type="button"
          >
            <ChevronLeft size={30} color="#FB8500" />
          </button>

          {/* Carrossel de posts */}
          <div
            ref={scrollRef}
            className="blogshowcase-carousel"
            style={{
              display: "flex",
              gap: 30,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 10,
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              minHeight: 350,
              margin: "0 auto",
              width: "100%",
            }}
          >
            {posts.map((post) => (
              <div
                key={post.id}
                className="blogshowcase-card"
                style={{
                  minWidth: 295,
                  maxWidth: 328,
                  background: "#fff",
                  borderRadius: 20,
                  boxShadow: "0 4px 18px #2222",
                  border: "1.2px solid #ececec",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  scrollSnapAlign: "start",
                  transition: "box-shadow .18s, transform .17s",
                  flex: "0 0 295px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 170,
                    overflow: "hidden",
                    borderRadius: "20px 20px 0 0",
                  }}
                >
                  <img
                    src={post.imagem}
                    alt={post.titulo}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      userSelect: "none",
                    }}
                    draggable={false}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "18px 22px 14px 22px",
                    gap: 7,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12.8,
                      color: "#FB8500",
                      fontWeight: 700,
                      letterSpacing: ".01em",
                    }}
                  >
                    {post.data}
                  </span>
                  <h3
                    style={{
                      fontWeight: 800,
                      fontSize: 17.5,
                      margin: 0,
                      color: "#023047",
                    }}
                  >
                    {post.titulo}
                  </h3>
                  <p
                    style={{
                      fontSize: 14.6,
                      color: "#354150",
                      margin: "4px 0 9px 0",
                      lineHeight: 1.35,
                      flex: 1,
                    }}
                  >
                    {post.resumo}
                  </p>
                  <Link
                    href={post.url}
                    style={{
                      marginTop: "auto",
                      color: "#FB8500",
                      fontWeight: 700,
                      fontSize: 15,
                      textDecoration: "none",
                      transition: "color .13s",
                      letterSpacing: ".01em",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.color = "#e17000")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.color = "#FB8500")
                    }
                  >
                    Ler post &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Seta direita */}
          <button
            className="carousel-arrow-right"
            style={{
              position: "absolute",
              right: -24,
              zIndex: 2,
              background: "#fff",
              border: "1.5px solid #eee",
              boxShadow: "0 6px 28px #0001",
              borderRadius: 99,
              width: 50,
              height: 50,
              display: "none", // desktop apenas
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background .13s, box-shadow .15s",
            }}
            onClick={scrollRight}
            aria-label="Próximo"
            type="button"
          >
            <ChevronRight size={30} color="#FB8500" />
          </button>
        </div>
      </div>
      {/* CSS responsivo */}
      <style jsx>{`
        .blogshowcase-carousel::-webkit-scrollbar {
          display: none;
        }
        .blogshowcase-carousel {
          scrollbar-width: none;
        }
        @media (min-width: 900px) {
          .blogshowcase-carousel {
            gap: 38px !important;
          }
          .carousel-arrow-left,
          .carousel-arrow-right {
            display: flex !important;
          }
        }
        @media (max-width: 900px) {
          .blogshowcase-carousel {
            gap: 16px !important;
            padding-bottom: 10px !important;
          }
          .carousel-arrow-left,
          .carousel-arrow-right {
            display: none !important;
          }
          .blogshowcase-card {
            min-width: 82vw !important;
            max-width: 96vw !important;
            padding: 0 !important;
          }
        }
        @media (max-width: 600px) {
          .blogshowcase-bg {
            padding: 39px 0 33px 0 !important;
          }
        }
      `}</style>
    </section>
  );
}

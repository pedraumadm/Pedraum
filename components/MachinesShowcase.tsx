"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

// Unificação dos tipos (agora aceita máquinas, produtos e serviços)
type VitrineItem = {
  id: string;
  tipo: "machines" | "produtos" | "services";
  nome?: string;
  titulo?: string;
  preco?: number;
  imagens?: string[];
  imagem?: string;
  local?: string;
  estado?: string;
  ano?: string | number;
  categoria?: string;
  destaque?: boolean;
};

export default function MachinesShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<VitrineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      // Busca das 3 coleções
      const colecoes = [
        { nome: "machines", tipo: "machines" },
        { nome: "produtos", tipo: "produtos" },
        { nome: "services", tipo: "services" },
      ];

      let todos: VitrineItem[] = [];

      for (const col of colecoes) {
        const q = query(
          collection(db, col.nome),
          orderBy("createdAt", "desc"),
          limit(8),
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((doc) => {
          const d = doc.data();
          todos.push({
            id: doc.id,
            tipo: col.tipo as "machines" | "produtos" | "services",
            nome: d.nome,
            titulo: d.titulo,
            preco: d.preco,
            imagens: d.imagens,
            imagem: d.imagem,
            local: d.local || d.cidade,
            estado: d.estado,
            ano: d.ano,
            categoria: d.categoria,
            destaque: d.destaque,
          });
        });
      }

      // Opcional: embaralhar para dar variedade, ou só ordenar por data (caso datas sejam parecidas)
      todos.sort((a, b) => Number(b.preco || 0) - Number(a.preco || 0)); // Exemplo, pode trocar para ordenar por data se quiser
      setItems(todos.slice(0, 8)); // Pega os 8 mais recentes no geral
      setLoading(false);
    }
    fetchAll();
  }, []);

  function scrollLeft() {
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: -340, behavior: "smooth" });
  }
  function scrollRight() {
    if (scrollRef.current)
      scrollRef.current.scrollBy({ left: 340, behavior: "smooth" });
  }

  // Função para pegar o título correto
  const getItemTitle = (item: VitrineItem) =>
    item.nome || item.titulo || "Produto";
  // Função para pegar imagem
  const getItemImage = (item: VitrineItem) => {
    if (Array.isArray(item.imagens) && item.imagens[0]) return item.imagens[0];
    if (typeof item.imagem === "string" && item.imagem) return item.imagem;
    return "/machines/placeholder.jpg";
  };
  // Função para pegar link correto
  const getItemLink = (item: VitrineItem) => `/${item.tipo}/${item.id}`;

  return (
    <section
      className="machines-bg"
      style={{ background: "#fff", padding: "64px 0 74px 0", width: "100%" }}
    >
      <div style={{ maxWidth: 1220, margin: "0 auto", padding: "0 2vw" }}>
        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#023047",
              letterSpacing: "-1px",
              marginBottom: 8,
              fontFamily: "'Poppins','Inter',sans-serif",
            }}
          >
            Vitrine de{" "}
            <span style={{ color: "#FB8500" }}>Produtos & Serviços</span>
          </h2>
          <div
            style={{
              color: "#7687A3",
              fontSize: 17,
              fontWeight: 500,
              maxWidth: 510,
              margin: "0 auto 14px auto",
              lineHeight: 1.5,
            }}
          >
            Confira as melhores oportunidades em máquinas, produtos e serviços
            do setor de mineração e construção.
          </div>
        </div>

        {/* Link "Ver todos" */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link
            href="/vitrine"
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
            Ver todos &rarr;
          </Link>
        </div>

        {/* Carrossel */}
        <div
          className="machines-carousel-row"
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
              left: -22,
              zIndex: 2,
              background: "#fff",
              border: "1.5px solid #eee",
              boxShadow: "0 6px 28px #0001",
              borderRadius: 99,
              width: 46,
              height: 46,
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background .13s, box-shadow .15s",
            }}
            onClick={scrollLeft}
            aria-label="Anterior"
            type="button"
          >
            <ChevronLeft size={27} color="#FB8500" />
          </button>

          {/* Carrossel */}
          <div
            ref={scrollRef}
            className="machines-carousel"
            style={{
              display: "flex",
              gap: 26,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 12,
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              minHeight: 300,
              margin: "0 auto",
              width: "100%",
            }}
          >
            {loading ? (
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  color: "#219ebc",
                  fontWeight: 700,
                  fontSize: 22,
                  padding: 50,
                }}
              >
                Carregando oportunidades...
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  color: "#5B6476",
                  fontWeight: 700,
                  fontSize: 19,
                  padding: 42,
                }}
              >
                Nenhum produto ou serviço cadastrado ainda.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="machines-card"
                  style={{
                    minWidth: 266,
                    maxWidth: 296,
                    background: "#fff",
                    borderRadius: 18,
                    boxShadow: "0 4px 18px #2222",
                    border: "1.1px solid #e8e8e8",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    scrollSnapAlign: "start",
                    transition: "box-shadow .16s, transform .15s",
                    flex: "0 0 266px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 140,
                      overflow: "hidden",
                      borderRadius: "18px 18px 0 0",
                      background: "#F6F9FA",
                    }}
                  >
                    <img
                      src={getItemImage(item)}
                      alt={getItemTitle(item)}
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
                      padding: "15px 18px 10px 18px",
                      gap: 7,
                      flex: 1,
                    }}
                  >
                    <h3
                      style={{
                        fontWeight: 700,
                        fontSize: 17.3,
                        margin: "2px 0 1px 0",
                        color: "#023047",
                        lineHeight: 1.23,
                      }}
                    >
                      {getItemTitle(item)}
                    </h3>
                    <span
                      style={{
                        fontSize: 15.7,
                        color: "#FB8500",
                        fontWeight: 800,
                        letterSpacing: ".01em",
                        marginBottom: 2,
                      }}
                    >
                      {item.preco
                        ? `R$ ${Number(item.preco).toLocaleString("pt-BR")}`
                        : "A Consultar"}
                    </span>
                    <div
                      style={{
                        fontSize: 13.4,
                        color: "#7687A3",
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      {item.local || item.estado || "Localização não informada"}{" "}
                      {item.ano ? `• ${item.ano}` : ""}
                    </div>
                    <Link
                      href={getItemLink(item)}
                      style={{
                        marginTop: "auto",
                        color: "#FB8500",
                        fontWeight: 700,
                        fontSize: 14.7,
                        textDecoration: "none",
                        transition: "color .13s",
                        letterSpacing: ".01em",
                        border: "none",
                        outline: "none",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.color = "#e17000")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.color = "#FB8500")
                      }
                    >
                      Ver detalhes &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Seta direita */}
          <button
            className="carousel-arrow-right"
            style={{
              position: "absolute",
              right: -22,
              zIndex: 2,
              background: "#fff",
              border: "1.5px solid #eee",
              boxShadow: "0 6px 28px #0001",
              borderRadius: 99,
              width: 46,
              height: 46,
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background .13s, box-shadow .15s",
            }}
            onClick={scrollRight}
            aria-label="Próximo"
            type="button"
          >
            <ChevronRight size={27} color="#FB8500" />
          </button>
        </div>
      </div>
      {/* CSS responsivo */}
      <style jsx>{`
        .machines-carousel::-webkit-scrollbar {
          display: none;
        }
        .machines-carousel {
          scrollbar-width: none;
        }
        @media (min-width: 900px) {
          .machines-carousel {
            gap: 36px !important;
          }
          .carousel-arrow-left,
          .carousel-arrow-right {
            display: flex !important;
          }
        }
        @media (max-width: 900px) {
          .machines-carousel {
            gap: 11px !important;
            padding-bottom: 10px !important;
          }
          .carousel-arrow-left,
          .carousel-arrow-right {
            display: none !important;
          }
          .machines-card {
            min-width: 88vw !important;
            max-width: 96vw !important;
            padding: 0 !important;
          }
        }
        @media (max-width: 600px) {
          .machines-bg {
            padding: 38px 0 29px 0 !important;
          }
        }
      `}</style>
    </section>
  );
}

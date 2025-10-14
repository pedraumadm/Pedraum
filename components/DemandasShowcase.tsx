"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  limit as fsLimit,
  query as fsQuery,
  DocumentData,
} from "firebase/firestore";

type Demand = {
  id: string;
  title?: string;
  descricao?: string;
  city?: string;
  state?: string;
  createdAt?: any;
};

function formatDate(ts?: any) {
  try {
    if (!ts) return "";
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
}

export default function DemandsShowcase() {
  const rowRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Demand[] | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const q = fsQuery(
      collection(db, "demandas"),
      orderBy("createdAt", "desc"),
      fsLimit(12),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Demand[] = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          title: data?.title || data?.titulo || "Demanda",
          descricao:
            data?.descricao ||
            data?.description ||
            data?.resumo ||
            "Sem descrição.",
          city: data?.city || data?.cidade || "",
          state: data?.state || data?.estado || "",
          createdAt: data?.createdAt,
        };
      });
      setItems(list);
      setTimeout(updateArrows, 0);
    });
    return () => unsub();
  }, []);

  const demands = useMemo(() => items ?? [], [items]);
  const loading = items === null;

  function updateArrows() {
    const el = rowRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 0);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  function scrollByCards(dir: "left" | "right") {
    const el = rowRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".demands-card");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
    setTimeout(updateArrows, 250);
  }

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateArrows();
    const onScroll = () => updateArrows();
    const onResize = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section
      style={{
        background: "#F6F9FA",
        padding: 0,
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          padding: "0 2vw",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 10,
            paddingTop: 36,
            paddingBottom: 14,
          }}
        >
          <h2
            style={{
              color: "#023047",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.8px",
              fontFamily: "'Poppins','Inter',sans-serif",
              margin: 0,
              lineHeight: 1.13,
            }}
          >
            Demandas Recentes
          </h2>
          <Link
            href="/demandas"
            style={{
              color: "#FB8500",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Ver todas <ChevronRight size={21} strokeWidth={2.1} />
          </Link>
        </div>

        {/* Botões de navegação */}
        {canPrev && (
          <button
            aria-label="Anterior"
            onClick={() => scrollByCards("left")}
            className="nav-btn left"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {canNext && (
          <button
            aria-label="Próximo"
            onClick={() => scrollByCards("right")}
            className="nav-btn right"
          >
            <ChevronRight size={22} />
          </button>
        )}

        {/* Row */}
        <div ref={rowRef} className="demands-showcase-row no-scrollbar">
          {/* skeletons */}
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`s-${i}`} className="demands-card skeleton">
                <div className="sk sk-title" />
                <div className="sk sk-date" />
                <div className="sk sk-text" />
                <div className="sk-row">
                  <div className="sk sk-city" />
                  <div className="sk sk-btn" />
                </div>
              </div>
            ))}

          {/* vazia */}
          {!loading && demands.length === 0 && (
            <div className="demands-card">
              <div
                style={{ color: "#023047", fontWeight: 700, marginBottom: 8 }}
              >
                Ainda não há demandas públicas para exibir
              </div>
              <div style={{ color: "#444", fontSize: 14 }}>
                Volte mais tarde ou{" "}
                <Link
                  href="/create-demanda"
                  style={{ color: "#FB8500", fontWeight: 700 }}
                >
                  cadastre uma demanda
                </Link>
                .
              </div>
            </div>
          )}

          {/* cards reais */}
          {demands.map((d) => {
            const url = `/demandas/${d.id}`;
            const cityFull = [d.city, d.state].filter(Boolean).join(" - ");
            return (
              <div key={d.id} className="demands-card">
                <div>
                  <div className="title">{d.title}</div>
                  <div className="date">{formatDate(d.createdAt)}</div>
                  <div className="desc">{d.descricao}</div>
                </div>
                <div className="card-footer">
                  <span className="city">{cityFull || "—"}</span>
                  {/* FORÇA 100% LARANJA */}
                  <Link
                    href={url}
                    className="cta"
                    style={{
                      background: "#FB8500",
                      color: "#fff",
                      textDecoration: "none",
                      borderRadius: 999,
                      padding: "6px 28px",
                      fontWeight: 700,
                      fontSize: 14.5,
                      letterSpacing: ".01em",
                      boxShadow: "0 2px 9px rgba(251,133,0,0.21)",
                      display: "inline-block",
                    }}
                  >
                    Atender
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .demands-showcase-row {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 18px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .demands-card {
          min-width: 260px;
          max-width: 280px;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 6px 32px #0001;
          padding: 20px 18px 16px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          scroll-snap-align: start;
          border: 1.5px solid #f0eaea;
          flex: 0 0 auto;
        }
        .title {
          font-size: 15.7px;
          font-weight: 700;
          color: #023047;
          margin-bottom: 2px;
          font-family: "Poppins", sans-serif;
        }
        .date {
          font-size: 13.5px;
          color: #fb8500;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .desc {
          font-size: 14.2px;
          color: #232323;
          margin-bottom: 10px;
          font-weight: 500;
          min-height: 40px;
        }
        .card-footer {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
        }
        .city {
          color: #7a7a7a;
          font-size: 14px;
        }

        /* Reforço extra contra CSS global */
        .demands-card :global(a.cta) {
          color: #fff !important;
          text-decoration: none !important;
          background: #fb8500 !important;
          border-radius: 999px;
        }
        .demands-card :global(a.cta:hover) {
          background: #e17000 !important;
        }

        /* skeleton */
        .skeleton {
          animation: pulse 1.2s ease-in-out infinite;
        }
        .sk {
          background: #f1f1f1;
          border-radius: 8px;
        }
        .sk-title {
          height: 22px;
        }
        .sk-date {
          height: 16px;
          width: 90px;
          margin-top: 8px;
        }
        .sk-text {
          height: 40px;
          margin-top: 10px;
        }
        .sk-row {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          align-items: center;
        }
        .sk-city {
          height: 16px;
          width: 80px;
        }
        .sk-btn {
          height: 32px;
          width: 110px;
          border-radius: 99px;
          background: #ffd7b0;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        /* Botões navegação — laranja */
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: #fb8500;
          color: #fff;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(251, 133, 0, 0.35);
          display: grid;
          place-items: center;
          z-index: 2;
          cursor: pointer;
          transition:
            background 0.2s,
            transform 0.15s;
        }
        .nav-btn:hover {
          background: #e17000;
          transform: translateY(-50%) scale(1.05);
        }
        .nav-btn.left {
          left: -18px;
        }
        .nav-btn.right {
          right: -18px;
        }
        .nav-btn :global(svg) {
          stroke: #fff;
          width: 22px;
          height: 22px;
        }

        @media (max-width: 600px) {
          .demands-card {
            min-width: 81vw;
            max-width: 95vw;
            padding: 14px 9px 13px 14px;
          }
          .nav-btn {
            display: none;
          } /* no mobile, só arrastar */
        }
      `}</style>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

type Banner = { src: string; alt: string; focal?: "center" | "top" | "bottom" };

const BANNERS: Banner[] = [
  {
    src: "/banners/mina-hero-1.jpg",
    alt: "Operação de mineração com caminhões",
    focal: "center",
  },
  {
    src: "/banners/mina-hero-2.jpg",
    alt: "Sistema de britagem em atividade",
    focal: "center",
  },
  {
    src: "/banners/mina-hero-3.jpg",
    alt: "Esteiras e carregadeiras no pátio",
    focal: "top",
  },
];

export default function HeroRevamp() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Avança/volta
  const next = useCallback(() => setIndex((i) => (i + 1) % BANNERS.length), []);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + BANNERS.length) % BANNERS.length),
    [],
  );

  // Autoplay
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next, paused]);

  // Teclado ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.matches(":focus-within")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const current = BANNERS[index];

  return (
    <section
      ref={containerRef}
      className="relative w-full outline-none"
      aria-roledescription="carousel"
      aria-label="Banners principais do Pedraum"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      tabIndex={0}
    >
      {/* Wrapper do slide */}
      <div className="relative h-[520px] sm:h-[600px] md:h-[660px] w-full overflow-hidden">
        {/* Imagem de fundo com overlay */}
        <div className="absolute inset-0">
          {BANNERS.map((b, i) => (
            <div
              key={b.src}
              className={`absolute inset-0 transition-opacity duration-700 will-change-[opacity] ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={i !== index}
            >
              {/* Fallback gradiente suave quando imagem não existir */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b1e39] via-[#0f2747] to-[#1a2a4f]" />
              <Image
                src={b.src}
                alt={b.alt}
                fill
                priority={i === index}
                className={`object-cover mix-blend-luminosity ${mapFocal(b.focal)}`}
                sizes="100vw"
              />
              {/* Overlay para contraste do texto */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/35" />
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="relative h-full">
          <div className="container mx-auto h-full px-4 flex items-center">
            <div className="max-w-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
              <p className="mb-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
                +200 fornecedores qualificados • retorno médio ~24h
              </p>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
                Encontre o{" "}
                <span className="text-[#FFB703]">Fornecedor Ideal</span> para
                sua Mineradora, em Minutos
              </h1>

              <p className="mt-3 text-base sm:text-lg md:text-xl text-white/90">
                Conectamos suas demandas a fornecedores <b>qualificados</b> de
                produtos e serviços para britagem e mineração.{" "}
                <b>Mais opções</b>, <b>menos risco</b>, sem complicação.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/demandas"
                  className="inline-flex items-center rounded-full bg-[#FB8500] hover:bg-[#f47a00] text-white font-semibold px-6 py-3 shadow-lg shadow-black/20 transition"
                >
                  Cadastrar Demanda <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/fornecedores"
                  className="inline-flex items-center rounded-full bg-white/90 hover:bg-white text-[#023047] font-semibold px-6 py-3 shadow-lg shadow-black/10"
                >
                  Ver Fornecedores
                </Link>
                <span className="text-white/80 text-sm">Grátis e rápido</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controles (dots) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Ir para o slide ${i + 1}`}
              aria-pressed={i === index}
            />
          ))}
        </div>

        {/* Contador acessível */}
        <span className="sr-only">
          Slide {index + 1} de {BANNERS.length}
        </span>
      </div>
    </section>
  );
}

function mapFocal(focal?: Banner["focal"]) {
  switch (focal) {
    case "top":
      return "object-[50%_20%]";
    case "bottom":
      return "object-[50%_80%]";
    default:
      return "object-center";
  }
}

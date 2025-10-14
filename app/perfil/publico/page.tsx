"use client";
import Link from "next/link";
import { ChevronLeft, Users, Lightbulb, Star, BookOpen } from "lucide-react";

export default function PerfilPublicoInstitucional() {
  return (
    <section
      style={{ maxWidth: 680, margin: "0 auto", padding: "44px 4vw 60px 4vw" }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 28,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={19} /> Voltar para o início
      </Link>
      <h1
        style={{
          fontSize: "2.25rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.1px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 34,
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "8px 30px",
            background: "#f3f6fa",
            color: "#023047",
            borderRadius: "13px",
            boxShadow: "0 2px 12px #0001",
            fontWeight: 800,
            fontSize: "2rem",
          }}
        >
          Plataforma Pedraum
        </span>
      </h1>

      <div
        className="w-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-7"
        style={{
          textAlign: "center",
        }}
      >
        <img
          src="/logo-pedraum.png"
          alt="Pedraum Brasil"
          style={{
            height: 74,
            marginBottom: 8,
            borderRadius: 17,
            boxShadow: "0 4px 20px #0001",
          }}
        />

        <p
          style={{
            fontSize: "1.18rem",
            color: "#023047",
            fontWeight: 500,
            maxWidth: 520,
            margin: "0 auto 14px auto",
            lineHeight: 1.6,
          }}
        >
          Bem-vindo ao <b>Pedraum</b>! Aqui você encontra o maior marketplace de
          máquinas e soluções para mineração e britagem do Brasil.
        </p>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 my-6"
          style={{ width: "100%" }}
        >
          <div style={{ background: "#f3f6fa", borderRadius: 15, padding: 24 }}>
            <Users size={40} className="mx-auto mb-2 text-[#219ebc]" />
            <div className="font-bold text-[#023047] mb-1">
              Conexão de Profissionais
            </div>
            <span style={{ fontSize: 15, color: "#666", lineHeight: 1.45 }}>
              Conecte compradores, vendedores e prestadores em um só lugar. Mais
              agilidade e confiança nas negociações.
            </span>
          </div>
          <div style={{ background: "#f3f6fa", borderRadius: 15, padding: 24 }}>
            <Lightbulb size={40} className="mx-auto mb-2 text-[#FB8500]" />
            <div className="font-bold text-[#023047] mb-1">
              Soluções Inovadoras
            </div>
            <span style={{ fontSize: 15, color: "#666", lineHeight: 1.45 }}>
              Ferramentas modernas para gestão de anúncios, leads, mensagens e
              avaliação de reputação.
            </span>
          </div>
          <div style={{ background: "#f3f6fa", borderRadius: 15, padding: 24 }}>
            <Star size={40} className="mx-auto mb-2 text-[#e85d04]" />
            <div className="font-bold text-[#023047] mb-1">Mercado Premium</div>
            <span style={{ fontSize: 15, color: "#666", lineHeight: 1.45 }}>
              Estrutura premium, visual profissional e suporte dedicado para sua
              experiência ser a melhor possível.
            </span>
          </div>
        </div>

        <div
          style={{
            background: "#e8f0fe",
            color: "#2563eb",
            borderRadius: 13,
            padding: "16px 26px",
            marginTop: 22,
            fontWeight: 600,
            fontSize: 17,
            boxShadow: "0 2px 8px #0001",
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <BookOpen size={20} className="mr-2" />
          <Link
            href="/blog"
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            Leia o blog do Pedraum
          </Link>
        </div>
      </div>

      {/* Responsivo */}
      <style>{`
        @media (max-width: 700px) {
          h1 span { font-size: 1.12rem !important; padding: 7px 10px !important; }
          .rounded-2xl { border-radius: 0.95rem !important; }
          .p-8 { padding: 1.2rem !important; }
          .grid { display: flex; flex-direction: column; gap: 18px; }
        }
      `}</style>
    </section>
  );
}

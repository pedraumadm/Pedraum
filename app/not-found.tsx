"use client";
import Link from "next/link";
import { Ghost, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "44px 4vw",
      }}
    >
      <Ghost
        size={92}
        color="#2563eb"
        style={{ opacity: 0.15, marginBottom: 18 }}
      />
      <div
        style={{
          fontWeight: 900,
          color: "#023047",
          fontSize: "2.5rem",
          marginBottom: 16,
          letterSpacing: "-1.4px",
        }}
      >
        404 — Página não encontrada
      </div>
      <div
        style={{
          color: "#495668",
          fontSize: 21,
          marginBottom: 35,
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        O endereço que você tentou acessar não existe ou foi removido.
        <br />
        <span style={{ color: "#FB8500", fontWeight: 700 }}>
          Mas não se preocupe!
        </span>
        Você pode voltar para o início ou para seu painel.
      </div>
      <div style={{ display: "flex", gap: 18 }}>
        <Link
          href="/"
          className="bg-[#2563eb] text-white font-bold rounded-xl px-8 py-3 shadow-md hover:opacity-90 transition flex items-center gap-2"
        >
          <ChevronLeft size={17} /> Ir para a Home
        </Link>
        <Link
          href="/painel-comprador"
          className="bg-[#FB8500] text-white font-bold rounded-xl px-8 py-3 shadow-md hover:opacity-90 transition flex items-center gap-2"
        >
          <ChevronLeft size={17} /> Meu Painel
        </Link>
      </div>
    </section>
  );
}

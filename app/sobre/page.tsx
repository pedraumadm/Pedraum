"use client";
import { Users, Star } from "lucide-react";

export default function SobrePage() {
  return (
    <section
      style={{ maxWidth: 900, margin: "0 auto", padding: "50px 4vw 60px 4vw" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          marginBottom: 26,
        }}
      >
        <span
          style={{
            background: "#f3f6fa",
            color: "#023047",
            borderRadius: "12px",
            boxShadow: "0 2px 12px #0001",
            fontWeight: 800,
            fontSize: "2rem",
            padding: "8px 36px",
          }}
        >
          Sobre o Pedraum
        </span>
        <Users size={44} color="#2563eb" />
      </div>
      <div
        style={{
          color: "#495668",
          fontSize: 20,
          lineHeight: 1.6,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        O <b>Pedraum</b> nasceu para revolucionar o setor de mineração e
        britagem no Brasil, conectando compradores, vendedores e prestadores de
        serviço em uma única plataforma moderna, eficiente e segura.
        <br />
        <br />
        Nosso propósito é <b>facilitar negócios</b>, gerar oportunidades e
        promover crescimento para empresas e profissionais do setor.
        <br />
        <br />
        Conte com uma plataforma <b>premium</b>, feita por especialistas que
        entendem o mercado, priorizando sempre{" "}
        <b>transparência, praticidade e inovação</b>.<br />
        <br />
        <Star size={24} color="#FB8500" style={{ marginBottom: -6 }} /> Seja
        bem-vindo ao futuro da mineração e britagem!
      </div>
      <div
        style={{
          background: "#e8fbe8",
          color: "#219e7a",
          borderRadius: 14,
          padding: "18px 28px",
          fontWeight: 700,
          textAlign: "center",
          fontSize: 18,
          margin: "0 auto",
        }}
      >
        Junte-se à nossa comunidade e ajude a construir a maior rede de negócios
        do setor!
      </div>
    </section>
  );
}

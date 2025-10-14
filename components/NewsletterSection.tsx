"use client";
import { Mail } from "lucide-react";
import { useRef, useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    if (!/^[\w.-]+@[\w.-]+\.\w+$/.test(email)) {
      setError("Digite um e-mail válido");
      return;
    }
    setTimeout(() => {
      setOk(true);
      setEmail("");
      formRef.current?.reset();
    }, 600);
  }

  return (
    <section
      style={{
        width: "100%",
        background: "linear-gradient(90deg,#fff,#f7fafc 100%)",
        margin: "0 auto",
        padding: "0",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        className="newsletter-grid"
        style={{
          maxWidth: 920,
          margin: "0 auto",
          borderRadius: 24,
          boxShadow: "0 8px 42px #fb85001c",
          background: "#fffbe8",
          padding: "44px 4vw 34px 4vw",
          display: "flex",
          flexDirection: "row",
          gap: 48,
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* TEXTO */}
        <div
          style={{
            flex: 1,
            minWidth: 210,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <h2
            style={{
              color: "#fb8500",
              fontSize: 24,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.7px",
              fontFamily: "'Poppins','Inter',sans-serif",
            }}
          >
            Fique por dentro das novidades!
          </h2>
          <p
            style={{
              color: "#555",
              fontSize: 16,
              margin: 0,
              fontWeight: 500,
              maxWidth: 370,
            }}
          >
            Inscreva-se gratuitamente para receber ofertas exclusivas, dicas e
            atualizações sobre o setor de mineração. Sem spam, só o melhor do
            mercado!
          </p>
        </div>
        {/* FORMULÁRIO */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            flex: 1.3,
            display: "flex",
            alignItems: "center",
            gap: 13,
            minWidth: 180,
            justifyContent: "flex-end",
            marginTop: 0,
            flexWrap: "nowrap",
          }}
        >
          <label htmlFor="newsletter-email" style={{ display: "none" }}>
            Seu e-mail
          </label>
          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: 330,
              minWidth: 0,
            }}
          >
            <Mail
              size={20}
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#fb8500",
                opacity: 0.77,
              }}
            />
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Digite seu melhor e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 330,
                minWidth: 90,
                padding: "12px 14px 12px 41px",
                borderRadius: 11,
                background: "#fff",
                border: "1.4px solid #ffd7a1",
                fontSize: 15.5,
                fontWeight: 500,
                outline: "none",
                color: "#22223b",
                boxShadow: "0 2px 8px #ffb70314",
                transition: "border .16s",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              background: "#fb8500",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 11,
              padding: "12px 36px",
              border: "none",
              boxShadow: "0 4px 14px #0001",
              cursor: "pointer",
              letterSpacing: ".02em",
              transition: "background .15s",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#e17000")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#fb8500")}
          >
            Assinar
          </button>
        </form>
      </div>
      {/* Mensagem de sucesso/erro */}
      <div
        style={{
          minHeight: 28,
          textAlign: "center",
          marginTop: 10,
          fontWeight: 600,
          color: ok ? "#38B000" : "#fb8500",
          fontSize: 15.5,
        }}
      >
        {ok && "Obrigado! Agora você faz parte do PedraUm Premium."}
        {error && error}
      </div>

      {/* RESPONSIVIDADE */}
      <style jsx>{`
        .newsletter-grid {
          flex-direction: row;
        }
        @media (max-width: 900px) {
          .newsletter-grid {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 28px !important;
            text-align: center !important;
          }
          .newsletter-grid h2,
          .newsletter-grid p {
            text-align: center !important;
          }
          form {
            justify-content: center !important;
            width: 100% !important;
          }
        }
        @media (max-width: 600px) {
          .newsletter-grid {
            padding: 34px 2vw 22px 2vw !important;
          }
          form {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: stretch !important;
            width: 100% !important;
          }
          input[type="email"] {
            max-width: 100% !important;
            min-width: 0 !important;
          }
          button[type="submit"] {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}

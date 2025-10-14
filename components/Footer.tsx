"use client";
import Link from "next/link";
import {
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
} from "lucide-react";

// COMPONENTE PRINCIPAL
export default function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        background: "#f7f7fb",
        borderTop: "1.5px solid #e5e7eb",
        color: "#23232b",
        paddingTop: 40,
        paddingBottom: 0,
        fontFamily: "'Inter','Poppins',sans-serif",
        position: "relative",
        zIndex: 3,
        minHeight: 260,
      }}
    >
      {/* GRID PRINCIPAL */}
      <div
        className="footer-main-grid"
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "0 3vw",
          display: "grid",
          gap: 32,
          position: "relative",
          minHeight: 200,
        }}
      >
        {/* COLUNA 1 - LOGO E TEXTO */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minWidth: 180,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <img
              src="/logo-pedraum.png"
              alt="PedraUm"
              style={{
                width: 100,
                height: 50,
                background: "#fff7eb",
                borderRadius: 15,
                objectFit: "contain",
                boxShadow: "0 4px 20px #ffb70315",
              }}
            />
            <span
              style={{
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: "-1.3px",
                color: "#fb8500",
                fontFamily: "'Poppins','Inter',sans-serif",
              }}
            ></span>
          </div>
          <p
            style={{
              color: "#555",
              fontSize: 16,
              lineHeight: 1.45,
              maxWidth: 240,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            <br />A plataforma Pedraum Brasil é apenas um espaço de conexão
            entre interessados. Não somos responsáveis por transações,
            negociações, pagamentos, entregas ou qualquer relação comercial
            entre usuários. Toda responsabilidade por negociações, pagamentos,
            entregas, garantias ou conflitos é exclusiva das partes envolvidas.
          </p>
          <div
            style={{
              marginTop: 7,
              fontSize: 13,
              color: "#fb8500",
              fontWeight: 600,
            }}
          >
            Missão:{" "}
            <span style={{ color: "#888", fontWeight: 500 }}>
              Transformar o setor com inovação.
            </span>
            <br />
            Visão:{" "}
            <span style={{ color: "#888", fontWeight: 500 }}>
              Ser referência nacional.
            </span>
            <br />
            Valores:{" "}
            <span style={{ color: "#888", fontWeight: 500 }}>
              Ética, agilidade, confiança.
            </span>
          </div>
        </div>
        {/* COLUNA 2 - NAVEGAÇÃO */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#fb8500",
              fontSize: 17,
              marginBottom: 7,
              letterSpacing: "-0.4px",
            }}
          >
            Navegação
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FooterLink href="/">Início</FooterLink>
            <FooterLink href="/vitrine">Produtos e Serviços</FooterLink>
            <FooterLink href="/demandas">Demandas</FooterLink>
            <FooterLink href="/blog">Blog</FooterLink>
            <FooterLink href="/contato">Contato</FooterLink>

            <FooterLink href="/parceiros">Parceiros</FooterLink>
          </nav>
        </div>
        {/* COLUNA 3 - CONTATO */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#fb8500",
              fontSize: 17,
              marginBottom: 7,
              letterSpacing: "-0.4px",
            }}
          >
            Contato
          </div>
          <a
            href="https://wa.me/5531990903613"
            target="_blank"
            rel="noopener noreferrer"
            style={linkContato}
          >
            <MessageCircle size={20} style={{ marginRight: 8 }} /> WhatsApp:{" "}
            <b style={{ fontWeight: 700 }}>31 99090-3613</b>
          </a>
          <a href="mailto:contato@pedraum.com.br" style={linkContato}>
            <Mail size={20} style={{ marginRight: 8 }} /> contato@pedraum.com.br
          </a>
          <a href="tel:+553199090-3613" style={linkContato}>
            <Phone size={20} style={{ marginRight: 8 }} /> (31) 99090-3613
          </a>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#444",
              fontWeight: 600,
              fontSize: 15,
              marginTop: 6,
            }}
          >
            <MapPin size={20} /> Belo Horizonte, MG
          </div>
        </div>
        {/* COLUNA 4 - NEWSLETTER E SOCIAL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: "flex-end",
            width: "100%",
          }}
        >
          <div style={{ width: "100%", maxWidth: 330 }}>
            <div
              style={{
                fontWeight: 800,
                color: "#fb8500",
                fontSize: 17,
                marginBottom: 8,
                letterSpacing: "-0.4px",
              }}
            >
              Assine a newsletter
            </div>
            <form
              style={{
                display: "flex",
                gap: 6,
                marginTop: 3,
                width: "100%",
              }}
            >
              <input
                type="email"
                required
                placeholder="Seu melhor e-mail"
                style={{
                  flex: 1,
                  padding: "10px 13px",
                  borderRadius: 11,
                  background: "#fff7eb",
                  color: "#22223b",
                  border: "1.3px solid #ffd7a1",
                  fontSize: 14,
                  outline: "none",
                  fontWeight: 500,
                  transition: "border-color .2s",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#fb8500",
                  color: "#fff",
                  borderRadius: 11,
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "9px 18px",
                  border: "none",
                  boxShadow: "0 4px 14px #0001",
                  cursor: "pointer",
                  transition: "background .18s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e17000")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#fb8500")
                }
              >
                Assinar
              </button>
            </form>
            <div style={{ fontSize: 12, color: "#888", marginTop: 5 }}>
              <input
                type="checkbox"
                style={{
                  accentColor: "#fb8500",
                  marginRight: 4,
                  verticalAlign: -1,
                }}
                id="lgpd"
              />
              <label htmlFor="lgpd">
                Aceito receber novidades e a{" "}
                <Link
                  href="/privacidade"
                  style={{ textDecoration: "underline", color: "#fb8500" }}
                >
                  política de privacidade
                </Link>
                .
              </label>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 13,
              marginTop: 13,
              justifyContent: "flex-end",
            }}
          >
            <FooterIcon
              href="https://instagram.com/pedraumbrasil"
              label="Instagram"
            >
              <Instagram size={21} />
            </FooterIcon>
            <FooterIcon href="https://facebook.com" label="Facebook">
              <Facebook size={21} />
            </FooterIcon>
            <FooterIcon href="https://linkedin.com" label="Linkedin">
              <Linkedin size={21} />
            </FooterIcon>
          </div>
        </div>
      </div>
      {/* LINHA DE DIVISÃO INFERIOR */}
      <div
        className="footer-bottom-grid"
        style={{
          maxWidth: 1360,
          margin: "32px auto 0 auto",
          padding: "0 3vw",
          borderTop: "1.2px solid #ececec",
          display: "grid",
          gap: 18,
          color: "#6b6b78",
          fontSize: 12.7,
          paddingTop: 17,
          paddingBottom: 10,
        }}
      >
        <div>
          <b style={{ color: "#fb8500" }}>Políticas</b>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
            <li>
              <FooterLink href="/privacidade">Privacidade</FooterLink>
            </li>
            <li>
              <FooterLink href="/termos">Termos de Uso</FooterLink>
            </li>
            <li>
              <FooterLink href="/lgpd">LGPD</FooterLink>
            </li>
          </ul>
        </div>
        <div>
          <b style={{ color: "#fb8500" }}>Apps & Links</b>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
            <li>
              <a href="#" style={linkFooter}>
                Baixe nosso App
              </a>
            </li>
            <li>
              <a href="#" style={linkFooter}>
                Google Play
              </a>
            </li>
            <li>
              <a href="#" style={linkFooter}>
                App Store
              </a>
            </li>
          </ul>
        </div>
        <div>
          <b style={{ color: "#fb8500" }}>Idiomas</b>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
            <li>
              <a href="#" style={linkFooter}>
                Português (BR)
              </a>
            </li>
            <li>
              <a href="#" style={linkFooter}>
                English (US)
              </a>
            </li>
            <li>
              <a href="#" style={linkFooter}>
                Español (LATAM)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <b style={{ color: "#fb8500" }}>Central</b>
          <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none" }}>
            <li>
              <FooterLink href="/faq">Perguntas Frequentes</FooterLink>
            </li>
            <li>
              <FooterLink href="/suporte">Suporte</FooterLink>
            </li>
            <li>
              <FooterLink href="/avaliacoes">Depoimentos</FooterLink>
            </li>
          </ul>
        </div>
      </div>
      {/* LINHA FINAL */}
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          textAlign: "center",
          color: "#a6a6a6",
          fontSize: 12,
          paddingTop: 14,
          paddingBottom: 11,
          borderTop: "1px solid #f7eee4",
        }}
      >
        © 2025 PedraUm Brasil. Todos os direitos reservados. &nbsp;|&nbsp;
        Desenvolvido por{" "}
        <a
          href="https://www.instagram.com/osaviogestor/"
          target="_blank"
          style={{ color: "#fb8500", textDecoration: "underline" }}
        >
          Sávio Cipriano
        </a>
      </div>
      {/* MEDIA QUERIES RESPONSIVOS */}
      <style jsx>{`
        @media (max-width: 900px) {
          .footer-main-grid,
          .footer-bottom-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
        }
        @media (max-width: 600px) {
          .footer-main-grid,
          .footer-bottom-grid {
            grid-template-columns: 1fr;
            gap: 15px;
            padding-left: 4vw;
            padding-right: 4vw;
          }
          .footer-main-grid > div,
          .footer-bottom-grid > div {
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <style jsx>{`
        .footer-main-grid {
          grid-template-columns: 1fr; /* Mobile: 1 coluna */
        }
        @media (min-width: 700px) {
          .footer-main-grid {
            grid-template-columns: 1fr 1fr; /* Tablet: 2 colunas */
          }
        }
        @media (min-width: 1100px) {
          .footer-main-grid {
            grid-template-columns: repeat(4, 1fr); /* Desktop: 4 colunas */
          }
        }
        .footer-bottom-grid {
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 900px) {
          .footer-bottom-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
        }
        @media (max-width: 600px) {
          .footer-bottom-grid {
            grid-template-columns: 1fr;
            gap: 15px;
            padding-left: 4vw;
            padding-right: 4vw;
          }
          .footer-bottom-grid > div {
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </footer>
  );
}

// LINKS DO FOOTER
function FooterLink({ href, children }) {
  return (
    <Link href={href} style={linkFooter}>
      {children}
    </Link>
  );
}
const linkFooter = {
  color: "#23232b",
  textDecoration: "none",
  fontWeight: 500,
  fontSize: 14.5,
  padding: "2.5px 0",
  transition: "color .17s",
  display: "block",
};
const linkContato = {
  color: "#23232b",
  textDecoration: "none",
  fontWeight: 500,
  fontSize: 14.5,
  display: "flex",
  alignItems: "center",
  padding: "2.5px 0",
  transition: "color .17s",
};
function FooterIcon({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        background: "#fff7eb",
        color: "#fb8500",
        borderRadius: 99,
        padding: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        boxShadow: "0 2px 12px #ffd78018",
        transition: "background .18s, color .16s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "#fb8500";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "#fff7eb";
        e.currentTarget.style.color = "#fb8500";
      }}
    >
      {children}
    </a>
  );
}

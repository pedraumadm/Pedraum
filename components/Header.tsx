// components/Header.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  LogIn,
  User,
  Package,
  ClipboardList,
  FileText,
  ChevronDown,
  Info,
} from "lucide-react";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

type NavItem = {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode; // evita erro do namespace JSX
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [painelHref, setPainelHref] = useState("/auth/login");
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false); // evita flash no desktop

  // ESC fecha o menu
  const onKeydown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);
  useEffect(() => {
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [onKeydown]);

  // Rota do painel conforme tipo de usuário
  useEffect(() => {
    const off = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsAuthed(false);
        setIsAdmin(false);
        setPainelHref("/auth/login");
        setAuthChecked(true);
        return;
      }
      setIsAuthed(true);
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        const tipo =
          (snap.exists() ? snap.data()?.tipo : "usuario") || "usuario";
        setIsAdmin(tipo === "admin");
        setPainelHref(tipo === "admin" ? "/admin" : "/painel");
      } catch {
        setIsAdmin(false);
        setPainelHref("/painel");
      } finally {
        setAuthChecked(true);
      }
    });
    return () => off();
  }, []);

  const links: NavItem[] = [
    {
      href: "/vitrine",
      label: "Produtos e Serviços",
      desc: "Explore e filtre soluções disponíveis para compra/contratação.",
      icon: <Package size={16} />,
    },
    {
      href: "/demandas",
      label: "Demandas",
      desc: "Veja pedidos de compradores e feche negócios.",
      icon: <ClipboardList size={16} />,
    },

    {
      href: painelHref,
      label: "Painel",
      desc: isAuthed
        ? isAdmin
          ? "Painel do Administrador."
          : "Gerencie seus cadastros e leads."
        : "Entre para acessar seu painel.",
      icon: <User size={16} />,
    },
  ];

  return (
    <>
      <header
        style={{
          width: "100%",
          background: "#fff",
          boxShadow: "0 2px 18px #0001",
          borderBottom: "1.5px solid #e5e7eb",
          position: "relative",
          zIndex: 50,
        }}
      >
        <nav
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 2vw",
            height: 66,
          }}
          className="no-underline"
        >
          {/* Logo */}
          <Link href="/" aria-label="Início">
            <span
              style={{
                display: "flex",
                alignItems: "center",
                fontWeight: 900,
                fontSize: "2rem",
                letterSpacing: "-1.5px",
                color: "#023047",
                marginRight: 24,
                height: 56,
              }}
            >
              <img
                src="/logo-pedraum.png"
                alt="Pedraum Brasil"
                style={{ height: 44, marginRight: 10, display: "block" }}
              />
            </span>
          </Link>

          {/* Menu Desktop */}
          <ul
            className="menu-desktop"
            style={{
              display: "flex",
              gap: 28,
              alignItems: "center",
              listStyle: "none",
              padding: 0,
              margin: 0,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {links.map(({ href, label, icon, desc }) => (
              <li key={href} style={{ position: "relative" }}>
                <Link href={href}>
                  <span style={linkDesktop}>
                    {label}
                    <span className="hint-wrap" aria-label={desc}>
                      <Info size={14} />
                      <span className="hint-bubble">{desc}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Ações (desktop + mobile) */}
          <div
            className="actions"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            {/* Ícone de Login/Perfil sempre visível no mobile (e também no desktop) */}
            {isAuthed ? (
              <Link
                href="/perfil"
                title="Meu Perfil"
                className="login-mobile no-underline"
              >
                <span style={{ color: "#219EBC", padding: 6, borderRadius: 9 }}>
                  <User size={24} strokeWidth={2.1} />
                </span>
              </Link>
            ) : (
              <Link
                href="/auth/login"
                title="Login"
                className="login-mobile no-underline"
              >
                <span style={{ color: "#FB8500", padding: 6, borderRadius: 9 }}>
                  <LogIn size={24} strokeWidth={2.1} />
                </span>
              </Link>
            )}

            {/* Botão Cadastrar (desktop) — só para não logados */}
            {authChecked && !isAuthed && (
              <Link
                href="/auth/register"
                className="btn-register-desktop no-underline"
              >
                <span
                  style={{
                    background: "#FB8500",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1.01rem",
                    borderRadius: "15px",
                    padding: "10px 22px",
                    boxShadow: "0 4px 14px #0001",
                    display: "inline-block",
                  }}
                >
                  Cadastrar
                </span>
              </Link>
            )}

            {/* Hambúrguer */}
            <button
              className="hamburger"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={30} />
            </button>
          </div>
        </nav>

        {/* Overlay */}
        <div
          className="overlay"
          onClick={() => setOpen(false)}
          aria-hidden={!open}
          style={{ display: open ? "block" : "none" }}
        />

        {/* Menu Mobile */}
        <nav
          className="menu-mobile no-underline"
          style={{
            right: open ? 0 : "-110vw",
          }}
        >
          <div className="mobile-head">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="close"
            >
              <X size={30} />
            </button>

            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="logo-mobile"
              aria-label="Início"
            >
              <img src="/logo-pedraum.png" alt="Pedraum Brasil" />
            </Link>

            {/* Ícone de Login/Perfil também no topo do drawer */}
            {isAuthed ? (
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                title="Meu Perfil"
                className="icon-top"
              >
                <User size={22} />
              </Link>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                title="Login"
                className="icon-top"
              >
                <LogIn size={22} />
              </Link>
            )}
          </div>

          <ul className="mobile-list">
            {links.map(({ href, label, icon, desc }) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)}>
                  <span className="mobile-item">
                    <span className="left">
                      {icon}
                      <span>{label}</span>
                      {label === "Painel" && isAdmin && (
                        <small className="badge">ADMIN</small>
                      )}
                    </span>
                    <ChevronDown size={18} className="chev" />
                  </span>
                </Link>
                <p className="mobile-desc">{desc}</p>
              </li>
            ))}

            {/* Ações rápidas no mobile */}
            {!isAuthed ? (
              <li className="quick-actions">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="btn-ghost"
                >
                  Entrar
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="btn-cta"
                >
                  Cadastrar
                </Link>
              </li>
            ) : (
              <li className="quick-actions">
                <Link
                  href={painelHref}
                  onClick={() => setOpen(false)}
                  className="btn-cta"
                >
                  Ir para o Painel
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </header>

      {/* ======= ESTILOS ======= */}
      <style>{`
        /* Sem sublinhado */
        .no-underline a { text-decoration: none !important; }

        /* Overlay */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.28); z-index: 90; }

        /* Tooltip (desktop) */
        .hint-wrap { margin-left: 6px; display: inline-flex; align-items: center; position: relative; color: #9ca3af; cursor: help; }
        .hint-wrap:hover { color: #64748b; }
        .hint-bubble {
          visibility: hidden; opacity: 0;
          min-width: 220px; max-width: 280px; background-color: #023047; color: #fff;
          border-radius: 8px; padding: 8px 10px; position: absolute; z-index: 999;
          top: 140%; left: 50%; transform: translateX(-50%);
          transition: opacity .18s, visibility .18s; font-size: .82rem; line-height: 1.25; white-space: normal;
          box-shadow: 0 8px 24px rgba(0,0,0,.16);
        }
        .hint-wrap:hover .hint-bubble { visibility: visible; opacity: 1; }

        /* Menu mobile drawer */
        .menu-mobile {
          position: fixed; top: 0; right: 0; width: min(84vw, 360px); height: 100vh; background: #fff;
          z-index: 100; box-shadow: -10px 0 36px rgba(0,0,0,.18);
          transition: right .24s cubic-bezier(.42,.91,.56,1.17);
          display: flex; flex-direction: column;
        }
        .mobile-head {
          display: grid; grid-template-columns: 40px 1fr 40px; align-items: center; gap: 8px;
          padding: 14px 12px; border-bottom: 1px solid #eef2f7;
        }
        .close { background: transparent; border: none; color: #023047; cursor: pointer; padding: 6px; border-radius: 10px; }
        .close:hover { background: #f3f4f6; }
        .logo-mobile { justify-self: center; }
        .logo-mobile img { height: 36px; display: block; }
        .icon-top { justify-self: end; color: #FB8500; display: inline-flex; align-items: center; }

        .mobile-list { list-style: none; padding: 10px 12px 22px; margin: 0; overflow-y: auto; }
        .mobile-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 10px; border-radius: 12px; color: #023047; background: #fff; transition: background .12s;
        }
        .mobile-item:hover { background: #f8fafc; }
        .mobile-item .left { display: inline-flex; gap: 10px; align-items: center; }
        .mobile-item .chev { color: #94a3b8; }
        .mobile-desc { color: #64748b; font-size: .86rem; margin: 3px 8px 14px 12px; }

        .badge {
          margin-left: 8px; background: #e3f2ff; color: #0369a1; font-weight: 700;
          font-size: .65rem; padding: 2px 6px; border-radius: 999px;
        }

        .quick-actions { margin-top: 10px; display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
        .btn-cta, .btn-ghost { display: inline-block; text-align: center; padding: 12px 12px; border-radius: 14px; font-weight: 700; width: 100%; }
        .btn-cta { background: #FB8500; color: #fff; box-shadow: 0 4px 14px rgba(0,0,0,.08); grid-column: span 2; }
        .btn-ghost { background: #f3f4f6; color: #023047; }

        /* Hambúrguer e visibilidade mobile */
        .hamburger {
          background: transparent; border: none; color: #023047; padding: 6px; margin-left: 6px; cursor: pointer; border-radius: 10px;
        }
        .hamburger:hover { background: #f3f4f6; }

        /* Desktop vs Mobile */
        @media (max-width: 980px) {
          .menu-desktop { display: none !important; }
          /* No mobile, mostramos login e hambúrguer; escondemos o botão "Cadastrar" grande */
          .btn-register-desktop { display: none !important; }
          .login-mobile { display: inline-flex !important; }
        }
        @media (min-width: 981px) {
          /* No desktop, o ícone login-mobile também aparece (não esconde) para reforçar,
             mas se quiser ocultar, basta setar: .login-mobile { display:none !important; } */
        }
      `}</style>
    </>
  );
}

/* ===== estilos JS do link desktop ===== */
const linkDesktop = {
  color: "#023047",
  fontWeight: 600,
  fontSize: "1.05rem",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 6px",
  borderRadius: 10,
  transition: "background .12s, color .12s",
} as const;

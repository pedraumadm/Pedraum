// components/RequireAuth.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

type Props = {
  children: React.ReactNode;
  redirectTo?: string;      // padrão: /auth/login
  title?: string;
  description?: string;
  keepMounted?: boolean;
  adminOnly?: boolean;      // NOVO: exige role=admin
};

export default function RequireAuth({
  children,
  redirectTo = "/auth/login",
  title,
  description,
  keepMounted = false,
  adminOnly = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setAllowed(false);
        setChecking(false);
        const next = encodeURIComponent(pathname || "/");
        router.replace(`${redirectTo}?next=${next}`);
        return;
      }

      // 1) checagem inicial rápida
      const userRef = doc(db, "usuarios", u.uid);
      const snap = await getDoc(userRef).catch(() => null);
      const data = snap?.exists() ? (snap!.data() as any) : {};
      const role = data?.role || "user";
      const status = (data?.status as string) || "ativo";

      // gates
      if (adminOnly && role !== "admin") {
        router.replace("/"); return;
      }
      if (status === "banido") {
        router.replace("/bloqueado"); return;
      }
      if (status === "suspenso") {
        router.replace("/suspenso"); return;
      }

      setAllowed(true);
      setChecking(false);

      // 2) live update: se status/role mudar, aplica na hora
      const unsubDoc = onSnapshot(userRef, (s) => {
        const d = s.exists() ? (s.data() as any) : {};
        const r = d?.role || "user";
        const st = (d?.status as string) || "ativo";

        if (adminOnly && r !== "admin") { router.replace("/"); return; }
        if (st === "banido") { router.replace("/bloqueado"); return; }
        if (st === "suspenso") { router.replace("/suspenso"); return; }

        setAllowed(true);
      });

      // limpar listener ao trocar de usuário/rota
      return () => unsubDoc();
    });

    return () => unsubAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo, pathname, adminOnly]);

  // loading/skeleton
  if (checking) {
    return (
      <main
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg,#f7fafc 0%, #f6f9fa 60%, #f1f5f9 100%)",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: "28px 26px",
            width: "min(680px, 92vw)",
            boxShadow: "0 10px 28px #00000014",
            textAlign: "center",
          }}
        >
          <div
            className="animate-spin"
            style={{
              width: 30,
              height: 30,
              border: "3px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ fontWeight: 800, color: "#023047", fontSize: 18 }}>
            Verificando acesso…
          </div>
          <div style={{ color: "#64748b", marginTop: 6, fontSize: 14.5 }}>
            Aguarde um instante.
          </div>
        </div>
      </main>
    );
  }

  if (!allowed) {
    // já redirecionando — opcional manter montado
    return keepMounted ? <>{children}</> : null;
  }

  // autenticado + permitido
  if (!title && !description) return <>{children}</>;

  return (
    <main style={{ minHeight: "100vh", background: "#f7fafc", padding: 16 }}>
      <section
        style={{
          margin: "0 auto",
          width: "min(1200px, 96vw)",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: "24px 18px",
          boxShadow: "0 10px 28px #0000000d",
        }}
      >
        {(title || description) && (
          <header style={{ marginBottom: 14 }}>
            {title && (
              <h1
                style={{
                  fontWeight: 900,
                  letterSpacing: 0.2,
                  color: "#023047",
                  fontSize: 22,
                  marginBottom: 6,
                }}
              >
                {title}
              </h1>
            )}
            {description && (
              <p style={{ color: "#64748b", fontSize: 15.5 }}>{description}</p>
            )}
          </header>
        )}
        {children}
      </section>
    </main>
  );
}

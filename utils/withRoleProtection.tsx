// =============================
// utils/withRoleProtection.tsx
// =============================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";

interface Options {
  allowed: ("comprador" | "vendedor" | "prestador" | "admin")[];
  redirect?: string;
}

export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: Options,
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      const unsub = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setAuthorized(false);
          setLoading(false);
          router.push("/auth/login");
          return;
        }
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          const tipo = userDoc.data().tipo;
          if (options.allowed.includes(tipo)) {
            setAuthorized(true);
          } else {
            setAuthorized(false);
            router.push(options.redirect || "/");
          }
        } else {
          setAuthorized(false);
          router.push(options.redirect || "/");
        }
        setLoading(false);
      });
      return () => unsub();
    }, []);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center text-[#023047] text-xl font-bold">
          Carregando...
        </div>
      );
    }
    if (!authorized) {
      return null;
    }
    return <Component {...props} />;
  };
}

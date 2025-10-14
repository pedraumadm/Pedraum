"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Use <AuthGateRedirect /> no FINAL da página.
 * Se não houver login, redireciona para /auth/login guardando a URL atual.
 */
export default function AuthGateRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        const current =
          pathname + (searchParams?.toString() ? `?${searchParams}` : "");
        router.replace(`/auth/login?redirect=${encodeURIComponent(current)}`);
      }
    });
    return () => unsub();
  }, [pathname, searchParams, router]);

  return null; // é só um "sentinela"
}

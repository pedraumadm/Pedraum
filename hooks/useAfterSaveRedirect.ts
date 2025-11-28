// hooks/useAfterSaveRedirect.ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Uso:
 * const goAfterSave = useAfterSaveRedirect("/demanda-list");
 * ...
 * await salvarNoFirestore();
 * goAfterSave();
 */
export function useAfterSaveRedirect(defaultPath: string) {
  const router = useRouter();

  const goAfterSave = useCallback(() => {
    if (typeof window !== "undefined") {
      // Se tiver histórico, volta
      if (window.history.length > 1 && document.referrer) {
        router.back();
        return;
      }
    }

    // Fallback: vai pra rota padrão
    router.push(defaultPath);
  }, [router, defaultPath]);

  return goAfterSave;
}

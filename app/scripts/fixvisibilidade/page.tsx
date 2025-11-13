"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const LS_KEY = "fixvisibilidade@done:v1";

export default function FixVisibilidadePage() {
  const [log, setLog] = useState<string>("Preparando…");
  const [done, setDone] = useState(false);
  const [updated, setUpdated] = useState(0);

  useEffect(() => {
    // Evita executar 2x no Strict Mode e evita reprocessar se já rodou
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(LS_KEY)) {
      setLog("Script já foi executado nesta sessão.");
      setDone(true);
      return;
    }

    async function run() {
      setLog("Buscando documentos em /produtos …");
      const snap = await getDocs(collection(db, "produtos"));

      let count = 0;
      for (const d of snap.docs) {
        const data = d.data() as any;

        // Se já está ok, ignora
        const precisa =
          data?.status !== "aprovado" || data?.visivel !== true;

        if (!precisa) continue;

        await updateDoc(doc(db, "produtos", d.id), {
          status: "aprovado",
          visivel: true,
          curadoriaStatus: data?.curadoriaStatus ?? "aprovado",
          updatedAt: serverTimestamp(),
        });

        count++;
        setUpdated((prev) => prev + 1);
      }

      setLog(`✅ Concluído. Documentos atualizados: ${count}.`);
      setDone(true);
      sessionStorage.setItem(LS_KEY, "1");
    }

    run().catch((e) => {
      console.error(e);
      setLog("❌ Erro ao executar o script. Veja o console.");
      setDone(true);
    });
  }, []);

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "#023047" }}>
        Ajuste de Visibilidade dos Produtos
      </h1>

      <p style={{ marginTop: 10, color: "#475569", lineHeight: 1.6 }}>
        Este utilitário seta <code>status = "aprovado"</code> e{" "}
        <code>visivel = true</code> em todos os documentos de{" "}
        <b>/produtos</b> que ainda não tenham esses campos.
      </p>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#f8fafc",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {log}
        {!done && (
          <span className="animate-pulse" style={{ marginLeft: 8 }}>
            …
          </span>
        )}
      </div>

      <div style={{ marginTop: 10, color: "#64748b" }}>
        Atualizados até agora: <b>{updated}</b>
      </div>

      <p style={{ marginTop: 20, color: "#6b7280" }}>
        Dica: Após finalizar, apague esta página do projeto para evitar uso
        indevido em produção.
      </p>
    </main>
  );
}

// app/admin/tools/migrar-usuarios/page.tsx
"use client";

import { useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import {
  buildCategoriesAll,
  buildPairsSearch,
  buildUfsSearch,
  CategoriaPair,
} from "@/lib/userIndexing";

type Usuario = {
  categoriasAtuacaoPairs?: CategoriaPair[];
  categoriasAtuacao?: string[]; // legado
  categorias?: string[]; // legado (se existir)
  atendeBrasil?: boolean;
  ufsAtendidas?: string[];
};

export default function MigrarUsuarios() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);

  async function migrateAll() {
    setRunning(true);
    setDone(0);
    setLogs([]);
    setLastId(null);

    try {
      const pageSize = 400; // leitura por página
      let more = true;
      let cursor: any = null;

      while (more) {
        // pagina por __name__ (id do doc) para não depender de campos ausentes
        const qBase = cursor
          ? query(
              collection(db, "usuarios"),
              orderBy("__name__"),
              startAfter(cursor),
              limit(pageSize),
            )
          : query(
              collection(db, "usuarios"),
              orderBy("__name__"),
              limit(pageSize),
            );

        const snap = await getDocs(qBase);
        if (snap.empty) break;

        const batch = writeBatch(db);
        let writes = 0;

        snap.docs.forEach((docu) => {
          const data = (docu.data() || {}) as Usuario;

          const pairs = Array.isArray(data.categoriasAtuacaoPairs)
            ? data.categoriasAtuacaoPairs
            : [];
          const legacyCats = Array.isArray(data.categoriasAtuacao)
            ? data.categoriasAtuacao
            : Array.isArray(data.categorias)
              ? data.categorias
              : [];

          const categoriesAll = buildCategoriesAll(pairs, legacyCats);
          const pairsSearch = buildPairsSearch(pairs);
          const ufsSearch = buildUfsSearch(
            !!data.atendeBrasil,
            data.ufsAtendidas || [],
          );

          batch.update(docu.ref, {
            // materializados novos
            categoriesAll,
            pairsSearch,
            ufsSearch,
          });
          writes++;
        });

        if (writes > 0) await batch.commit();

        setDone((n) => n + snap.size);
        setLastId(snap.docs[snap.docs.length - 1].id);
        setLogs((l) => [
          ...l,
          `Processados: ${snap.size} (último id: ${snap.docs[snap.docs.length - 1].id})`,
        ]);

        more = snap.size === pageSize;
        cursor = snap.docs[snap.docs.length - 1];
      }

      setLogs((l) => [...l, "Migração concluída."]);
    } catch (e: any) {
      setLogs((l) => [...l, "ERRO: " + (e?.message || String(e))]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section style={{ maxWidth: 820, margin: "40px auto", padding: "0 2vw" }}>
      <h1 style={{ fontWeight: 900, fontSize: "1.6rem" }}>
        Migrar usuários (categoriesAll / pairsSearch / ufsSearch)
      </h1>
      <p style={{ color: "#475569", marginTop: 6 }}>
        Rode isso uma vez para preencher os novos campos em todos os usuários
        antigos. É idempotente (pode rodar novamente sem problemas).
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button
          onClick={migrateAll}
          disabled={running}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            fontWeight: 800,
          }}
        >
          {running ? "Migrando..." : "Migrar agora"}
        </button>
        <div style={{ fontWeight: 800 }}>
          Atualizados: {done}
          {lastId ? ` • último: ${lastId}` : ""}
        </div>
      </div>

      <pre
        style={{
          marginTop: 16,
          background: "#0f172a",
          color: "#e2e8f0",
          padding: 12,
          borderRadius: 10,
          maxHeight: 320,
          overflow: "auto",
        }}
      >
        {logs.join("\n")}
      </pre>
    </section>
  );
}

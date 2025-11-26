"use client";

import { useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/** 🔧 Ajuste aqui, se precisar */
const COLLECTION_NAME = "categorias"; // nome da coleção no Firestore (muda se a sua for outra)

type RemoteCat = {
  id: string;
  nomeBruto: string;
  nomeNormalizado: string;
};

function normalizeName(s: string | undefined | null): string {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos
    .replace(/[^\w\s-]/g, "") // tira símbolos estranhos
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export default function CleanCategoriesByTaxonomiaPage() {
  const { categorias: taxCats, loading: taxLoading } = useTaxonomia();

  const [remoteCats, setRemoteCats] = useState<RemoteCat[] | null>(null);
  const [toDelete, setToDelete] = useState<RemoteCat[] | null>(null);
  const [kept, setKept] = useState<RemoteCat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    setMessage(null);
    setRemoteCats(null);
    setToDelete(null);
    setKept(null);
    setProgress(0);

    if (taxLoading) {
      setError("Taxonomia ainda carregando, tente novamente em alguns segundos.");
      return;
    }

    if (!taxCats || taxCats.length === 0) {
      setError("Não foi possível carregar as categorias da taxonomia.");
      return;
    }

    // nomes válidos da taxonomia (baseados no nome da categoria)
    const allowedSet = new Set(
      taxCats.map((c) => normalizeName(c.nome))
    );

    try {
      setLoading(true);

      const snap = await getDocs(collection(db, COLLECTION_NAME));
      const rem: RemoteCat[] = [];

      snap.forEach((d) => {
        const data = d.data() as any;
        const nomeBruto =
          data?.nome ??
          data?.name ??
          data?.titulo ??
          data?.label ??
          d.id;

        rem.push({
          id: d.id,
          nomeBruto: String(nomeBruto),
          nomeNormalizado: normalizeName(nomeBruto),
        });
      });

      const keptList: RemoteCat[] = [];
      const deleteList: RemoteCat[] = [];

      rem.forEach((rc) => {
        if (allowedSet.has(rc.nomeNormalizado)) {
          keptList.push(rc);
        } else {
          deleteList.push(rc);
        }
      });

      setRemoteCats(rem);
      setKept(keptList);
      setToDelete(deleteList);

      setMessage(
        `Análise concluída: ${rem.length} registros encontrados na coleção "${COLLECTION_NAME}". ` +
          `${keptList.length} vão ser mantidos e ${deleteList.length} estão marcados para exclusão.`
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Erro ao carregar categorias do Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete || toDelete.length === 0) {
      setError("Nenhuma categoria está marcada para exclusão.");
      return;
    }

    const confirm1 = window.confirm(
      `Isso vai APAGAR ${toDelete.length} categorias da coleção "${COLLECTION_NAME}" ` +
        `que não existem mais na taxonomia atual. Tem certeza?`
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "Última confirmação! Depois de apagar, não tem como desfazer pelo painel. Deseja continuar?"
    );
    if (!confirm2) return;

    setDeleting(true);
    setError(null);
    setMessage(null);
    setProgress(0);

    try {
      const ids = toDelete.map((c) => c.id);
      const chunkSize = 400;
      let deletedTotal = 0;

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((id) => {
          const ref = doc(db, COLLECTION_NAME, id);
          batch.delete(ref);
        });

        await batch.commit();
        deletedTotal += chunk.length;
        setProgress((deletedTotal / ids.length) * 100);

        await new Promise((res) => setTimeout(res, 200));
      }

      setMessage(
        `Exclusão concluída! Foram apagadas ${ids.length} categorias que não existiam na taxonomia atual.`
      );
      // Atualiza tabela local
      setRemoteCats((prev) =>
        prev ? prev.filter((c) => !ids.includes(c.id)) : prev
      );
      setToDelete([]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Erro ao apagar categorias.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <header>
          <h1 className="text-2xl font-bold mb-1">
            Limpar categorias antigas usando a Taxonomia
          </h1>
          <p className="text-sm text-slate-300">
            Esta ferramenta compara as categorias da coleção{" "}
            <span className="font-mono text-sky-300">{COLLECTION_NAME}</span>{" "}
            com as categorias atuais da <span className="font-mono">useTaxonomia</span>. 
            Tudo que não existir mais na taxonomia será marcado para exclusão.
          </p>
        </header>

        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-100">
          <p className="font-semibold mb-1">⚠️ Aviso importante</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Confirme que a coleção{" "}
              <span className="font-mono text-yellow-200">{COLLECTION_NAME}</span>{" "}
              é realmente a coleção de categorias antigas.
            </li>
            <li>
              Apenas registros que <strong>não existirem</strong> na taxonomia atual serão apagados.
            </li>
            <li>Se quiser, faça backup antes (export do Firestore).</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <div>
            Categorias da taxonomia carregadas:{" "}
            {taxLoading ? (
              <span className="text-slate-400">carregando…</span>
            ) : (
              <span className="font-semibold text-emerald-400">
                {taxCats?.length ?? 0}
              </span>
            )}
          </div>
          <div>
            Categorias no Firestore:{" "}
            {remoteCats ? (
              <span className="font-semibold text-sky-400">
                {remoteCats.length}
              </span>
            ) : (
              <span className="text-slate-400">ainda não analisado</span>
            )}
          </div>
          <div>
            Manter:{" "}
            <span className="font-semibold text-emerald-400">
              {kept?.length ?? 0}
            </span>
          </div>
          <div>
            Apagar:{" "}
            <span className="font-semibold text-red-400">
              {toDelete?.length ?? 0}
            </span>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading || taxLoading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              loading || taxLoading
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30"
            }`}
          >
            {loading || taxLoading
              ? "Analisando..."
              : "Analisar Firestore x Taxonomia"}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting || !toDelete || toDelete.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              deleting || !toDelete || toDelete.length === 0
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30"
            }`}
          >
            {deleting
              ? `Apagando (${progress.toFixed(0)}%)...`
              : "APAGAR categorias que NÃO estão na taxonomia"}
          </button>
        </div>

        {toDelete && toDelete.length > 0 && (
          <section className="text-sm text-slate-200 space-y-2">
            <h2 className="font-semibold">
              Categorias que serão apagadas ({toDelete.length}):
            </h2>
            <div className="max-h-64 overflow-auto rounded-md border border-slate-800 bg-slate-950/50">
              <table className="w-full text-xs">
                <thead className="bg-slate-900/70 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">ID</th>
                    <th className="px-2 py-1 text-left">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  {toDelete.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-2 py-1 font-mono text-slate-400">
                        {c.id}
                      </td>
                      <td className="px-2 py-1">{c.nomeBruto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {kept && kept.length > 0 && (
          <section className="text-sm text-slate-200 space-y-2">
            <h2 className="font-semibold">
              Categorias mantidas ({kept.length}):
            </h2>
            <div className="max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950/30">
              <table className="w-full text-xs">
                <thead className="bg-slate-900/70 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">ID</th>
                    <th className="px-2 py-1 text-left">Nome</th>
                  </tr>
                </thead>
                <tbody>
                  {kept.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800">
                      <td className="px-2 py-1 font-mono text-slate-400">
                        {c.id}
                      </td>
                      <td className="px-2 py-1">{c.nomeBruto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// app/admin/debug-simula-categorias/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

/** ======================= Lista oficial de categorias =======================
 * Esta lista bate com o resultado final da sua useTaxonomia (depois de merge,
 * split e refine). Tudo que NÃO estiver aqui será considerado "categoria antiga".
 */
const CATEGORIAS_OFICIAIS = new Set<string>([
  "Britadores",
  "Peneiras",
  "Moinhos",
  "Perfuração",
  "Detonação",
  "Correias",
  "Tc´s",
  "Caminhões Linha Amarela",
  "Caminhões Fora de Estrada",
  "Motores",
  "Compressores",
  "Geradores",
  "Transformadores",
  "Automação",
  "Rolamentos",
  "Separadores Magnéticos",
  "Detectores de Metais",
  "Pneus",
]);

type AtuacaoBasica = {
  categoria: string;
  vendaProdutos?: { ativo?: boolean; obs?: string };
  vendaPecas?: { ativo?: boolean; obs?: string };
  servicos?: { ativo?: boolean; obs?: string };
};

type LeadPreferencias = {
  categorias?: string[];
  ufs?: string[];
  ticketMin?: number | null;
  ticketMax?: number | null;
};

type UsuarioDoc = {
  nome?: string;
  email?: string;
  atuacaoBasica?: AtuacaoBasica[];
  categoriasAtuacao?: string[];
  categorias?: string[];
  categoriesAll?: string[];
  leadPreferencias?: LeadPreferencias;
};

type ResultadoUsuario = {
  id: string;
  nome: string;
  email: string;
  invalidAtuacaoBasica: string[];
  invalidCategoriasAtuacao: string[];
  invalidCategorias: string[];
  invalidCategoriesAll: string[];
  invalidLeadPreferenciasCategorias: string[];
};

function normalizaNomeCat(nome: any): string {
  if (!nome) return "";
  return String(nome).trim();
}

function filtraInvalidos(lista: any[] | undefined | null): string[] {
  if (!Array.isArray(lista)) return [];
  const invalid: string[] = [];
  for (const raw of lista) {
    const nome = normalizaNomeCat(raw);
    if (!nome) continue;
    if (!CATEGORIAS_OFICIAIS.has(nome)) invalid.push(nome);
  }
  return Array.from(new Set(invalid)); // sem duplicar
}

export default function DebugSimulaCategoriasPage() {
  const [loading, setLoading] = useState(true);
  const [resultados, setResultados] = useState<ResultadoUsuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let abortado = false;

    async function run() {
      try {
        setLoading(true);
        setErro(null);

        const snap = await getDocs(collection(db, "usuarios"));
        if (abortado) return;

        const lista: ResultadoUsuario[] = [];

        snap.forEach((docSnap) => {
          const data = (docSnap.data() || {}) as UsuarioDoc;

          const atuacao = Array.isArray(data.atuacaoBasica)
            ? data.atuacaoBasica
            : [];

          const invalidAtuacaoBasica = Array.from(
            new Set(
              atuacao
                .map((a) => normalizaNomeCat(a.categoria))
                .filter(
                  (nome) =>
                    nome &&
                    !CATEGORIAS_OFICIAIS.has(nome)
                ),
            ),
          );

          const invalidCategoriasAtuacao = filtraInvalidos(
            data.categoriasAtuacao,
          );
          const invalidCategorias = filtraInvalidos(data.categorias);
          const invalidCategoriesAll = filtraInvalidos(data.categoriesAll);
          const invalidLeadPreferenciasCategorias = filtraInvalidos(
            data.leadPreferencias?.categorias,
          );

          const temAlgumInvalido =
            invalidAtuacaoBasica.length > 0 ||
            invalidCategoriasAtuacao.length > 0 ||
            invalidCategorias.length > 0 ||
            invalidCategoriesAll.length > 0 ||
            invalidLeadPreferenciasCategorias.length > 0;

          if (temAlgumInvalido) {
            lista.push({
              id: docSnap.id,
              nome: data.nome || "(sem nome)",
              email: data.email || "",
              invalidAtuacaoBasica,
              invalidCategoriasAtuacao,
              invalidCategorias,
              invalidCategoriesAll,
              invalidLeadPreferenciasCategorias,
            });
          }
        });

        setResultados(lista);
      } catch (e: any) {
        console.error("Erro na simulação de categorias:", e);
        setErro(e?.message || "Erro ao rodar simulação.");
      } finally {
        if (!abortado) setLoading(false);
      }
    }

    run();

    return () => {
      abortado = true;
    };
  }, []);

  const totalComProblema = resultados.length;

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 16px 80px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.8rem",
          fontWeight: 900,
          color: "#023047",
          marginBottom: 8,
        }}
      >
        Simulação de limpeza de categorias (USUÁRIOS)
      </h1>

      <p style={{ fontSize: 14, color: "#475569", marginBottom: 16 }}>
        Esta página <strong>NÃO altera nada</strong> no Firestore. Ela apenas
        lista usuários que possuem categorias antigas ou fora do padrão
        definido na taxonomia atual.
      </p>

      <div
        style={{
          background: "#eff6ff",
          borderRadius: 12,
          padding: 12,
          border: "1px solid #dbeafe",
          marginBottom: 20,
          fontSize: 13,
          color: "#1e293b",
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>
          Categorias oficiais consideradas:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Array.from(CATEGORIAS_OFICIAIS).map((nome) => (
            <span
              key={nome}
              style={{
                borderRadius: 999,
                border: "1px solid #bfdbfe",
                padding: "4px 10px",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {nome}
            </span>
          ))}
        </div>
      </div>

      {loading && (
        <div
          style={{
            padding: 20,
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Carregando usuários e simulando... ⏳
        </div>
      )}

      {erro && !loading && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {erro}
        </div>
      )}

      {!loading && !erro && (
        <>
          <div
            style={{
              marginTop: 8,
              marginBottom: 16,
              fontSize: 14,
              color: "#0f172a",
            }}
          >
            Usuários com categorias fora do padrão:{" "}
            <strong>{totalComProblema}</strong>
          </div>

          {totalComProblema === 0 ? (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#15803d",
                fontWeight: 800,
              }}
            >
              ✅ Nenhum usuário com categorias antigas ou inválidas. Tudo certo!
            </div>
          ) : (
            <div
              style={{
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead style={{ background: "#f1f5f9" }}>
                  <tr>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Usuário
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Campos com categorias antigas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id}>
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #e2e8f0",
                          verticalAlign: "top",
                          width: "28%",
                        }}
                      >
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {r.nome}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          UID: {r.id}
                        </div>
                        {r.email && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#475569",
                              marginTop: 2,
                            }}
                          >
                            {r.email}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #e2e8f0",
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {r.invalidAtuacaoBasica.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  marginBottom: 2,
                                }}
                              >
                                atuacaoBasica.categoria:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {r.invalidAtuacaoBasica.map((nome) => (
                                  <span
                                    key={nome}
                                    style={{
                                      borderRadius: 999,
                                      padding: "3px 8px",
                                      border: "1px solid #fecaca",
                                      background: "#fef2f2",
                                      fontSize: 12,
                                      color: "#b91c1c",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {nome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.invalidCategoriasAtuacao.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  marginBottom: 2,
                                }}
                              >
                                categoriasAtuacao:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {r.invalidCategoriasAtuacao.map((nome) => (
                                  <span
                                    key={nome}
                                    style={{
                                      borderRadius: 999,
                                      padding: "3px 8px",
                                      border: "1px solid #fee2e2",
                                      background: "#fef2f2",
                                      fontSize: 12,
                                      color: "#b91c1c",
                                    }}
                                  >
                                    {nome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.invalidCategorias.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  marginBottom: 2,
                                }}
                              >
                                categorias:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {r.invalidCategorias.map((nome) => (
                                  <span
                                    key={nome}
                                    style={{
                                      borderRadius: 999,
                                      padding: "3px 8px",
                                      border: "1px solid #fee2e2",
                                      background: "#fef2f2",
                                      fontSize: 12,
                                      color: "#b91c1c",
                                    }}
                                  >
                                    {nome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.invalidCategoriesAll.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  marginBottom: 2,
                                }}
                              >
                                categoriesAll:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {r.invalidCategoriesAll.map((nome) => (
                                  <span
                                    key={nome}
                                    style={{
                                      borderRadius: 999,
                                      padding: "3px 8px",
                                      border: "1px solid #fee2e2",
                                      background: "#fef2f2",
                                      fontSize: 12,
                                      color: "#b91c1c",
                                    }}
                                  >
                                    {nome}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.invalidLeadPreferenciasCategorias.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  marginBottom: 2,
                                }}
                              >
                                leadPreferencias.categorias:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {r.invalidLeadPreferenciasCategorias.map(
                                  (nome) => (
                                    <span
                                      key={nome}
                                      style={{
                                        borderRadius: 999,
                                        padding: "3px 8px",
                                        border: "1px solid #fee2e2",
                                        background: "#fef2f2",
                                        fontSize: 12,
                                        color: "#b91c1c",
                                      }}
                                    >
                                      {nome}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}

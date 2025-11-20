// app/admin/fix-categorias-usuarios/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

/** ======================= Lista oficial de categorias =======================
 * Mesma lógica da useTaxonomia (resultado final depois de merge/split).
 * Tudo que NÃO estiver aqui é tratado como categoria antiga / inválida.
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

type OfertaBasica = { ativo?: boolean; obs?: string };
type AtuacaoBasica = {
  categoria: string;
  vendaProdutos?: OfertaBasica;
  vendaPecas?: OfertaBasica;
  servicos?: OfertaBasica;
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

type DiffUsuario = {
  id: string;
  nome: string;
  email: string;

  // antes
  antesAtuacaoBasica: AtuacaoBasica[];
  antesCategoriasAtuacao: string[];
  antesCategorias: string[];
  antesCategoriesAll: string[];
  antesLeadPrefCats: string[];

  // depois
  depoisAtuacaoBasica: AtuacaoBasica[];
  depoisCategoriasAtuacao: string[];
  depoisCategorias: string[];
  depoisCategoriesAll: string[];
  depoisLeadPrefCats: string[];

  // flags
  vaiAtualizar: boolean;
};

function normalizaNomeCat(nome: any): string {
  if (!nome) return "";
  return String(nome).trim();
}

function filtraValidos(lista: any[] | undefined | null): string[] {
  if (!Array.isArray(lista)) return [];
  const out: string[] = [];
  for (const raw of lista) {
    const nome = normalizaNomeCat(raw);
    if (!nome) continue;
    if (CATEGORIAS_OFICIAIS.has(nome)) {
      if (!out.includes(nome)) out.push(nome);
    }
  }
  return out;
}

function filtraAtuacaoValida(atuacoes: any[] | undefined | null): AtuacaoBasica[] {
  if (!Array.isArray(atuacoes)) return [];
  const out: AtuacaoBasica[] = [];
  for (const raw of atuacoes) {
    if (!raw) continue;
    const categoria = normalizaNomeCat(raw.categoria);
    if (!categoria) continue;
    if (!CATEGORIAS_OFICIAIS.has(categoria)) continue;
    out.push({
      categoria,
      vendaProdutos: raw.vendaProdutos,
      vendaPecas: raw.vendaPecas,
      servicos: raw.servicos,
    });
  }
  // evita categorias repetidas
  const seen = new Set<string>();
  const uniq: AtuacaoBasica[] = [];
  for (const a of out) {
    if (seen.has(a.categoria)) continue;
    seen.add(a.categoria);
    uniq.push(a);
  }
  return uniq;
}

function arraysDiferem(a: any[] | undefined, b: any[] | undefined): boolean {
  const ja = Array.isArray(a) ? a : [];
  const jb = Array.isArray(b) ? b : [];
  if (ja.length !== jb.length) return true;
  for (let i = 0; i < ja.length; i++) {
    if (JSON.stringify(ja[i]) !== JSON.stringify(jb[i])) return true;
  }
  return false;
}

export default function FixCategoriasUsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [diffs, setDiffs] = useState<DiffUsuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resumo, setResumo] = useState<string | null>(null);

  useEffect(() => {
    let abortado = false;

    async function carregar() {
      try {
        setLoading(true);
        setErro(null);

        const snap = await getDocs(collection(db, "usuarios"));
        if (abortado) return;

        const list: DiffUsuario[] = [];

        snap.forEach((docSnap) => {
          const data = (docSnap.data() || {}) as UsuarioDoc;

          const atualAtuacao = Array.isArray(data.atuacaoBasica)
            ? (data.atuacaoBasica as AtuacaoBasica[])
            : [];

          const antesAtuacaoBasica = atualAtuacao;
          const antesCategoriasAtuacao = Array.isArray(data.categoriasAtuacao)
            ? [...data.categoriasAtuacao]
            : [];
          const antesCategorias = Array.isArray(data.categorias)
            ? [...data.categorias]
            : [];
          const antesCategoriesAll = Array.isArray(data.categoriesAll)
            ? [...data.categoriesAll]
            : [];
          const antesLeadPrefCats = Array.isArray(data.leadPreferencias?.categorias)
            ? [...(data.leadPreferencias?.categorias || [])]
            : [];

          // ===== depois (limpo) =====
          const depoisAtuacaoBasica = filtraAtuacaoValida(atualAtuacao);
          const depoisCategoriasAtuacao = filtraValidos(data.categoriasAtuacao);
          const depoisCategorias = filtraValidos(data.categorias);
          const depoisCategoriesAll = filtraValidos(data.categoriesAll);
          const depoisLeadPrefCats = filtraValidos(data.leadPreferencias?.categorias);

          const mudaAtuacao = arraysDiferem(
            antesAtuacaoBasica,
            depoisAtuacaoBasica,
          );
          const mudaCategoriasAtuacao = arraysDiferem(
            antesCategoriasAtuacao,
            depoisCategoriasAtuacao,
          );
          const mudaCategorias = arraysDiferem(
            antesCategorias,
            depoisCategorias,
          );
          const mudaCategoriesAll = arraysDiferem(
            antesCategoriesAll,
            depoisCategoriesAll,
          );
          const mudaLeadPrefCats = arraysDiferem(
            antesLeadPrefCats,
            depoisLeadPrefCats,
          );

          const vaiAtualizar =
            mudaAtuacao ||
            mudaCategoriasAtuacao ||
            mudaCategorias ||
            mudaCategoriesAll ||
            mudaLeadPrefCats;

          if (!vaiAtualizar) return;

          list.push({
            id: docSnap.id,
            nome: data.nome || "(sem nome)",
            email: data.email || "",
            antesAtuacaoBasica,
            antesCategoriasAtuacao,
            antesCategorias,
            antesCategoriesAll,
            antesLeadPrefCats,
            depoisAtuacaoBasica,
            depoisCategoriasAtuacao,
            depoisCategorias,
            depoisCategoriesAll,
            depoisLeadPrefCats,
            vaiAtualizar,
          });
        });

        setDiffs(list);
      } catch (e: any) {
        console.error("Erro ao carregar diffs de categorias:", e);
        setErro(e?.message || "Erro ao calcular diffs.");
      } finally {
        if (!abortado) setLoading(false);
      }
    }

    carregar();

    return () => {
      abortado = true;
    };
  }, []);

  async function aplicarLimpeza() {
    if (aplicando) return;
    setAplicando(true);
    setResumo(null);
    setProgresso(0);
    setErro(null);

    try {
      const total = diffs.length;
      if (total === 0) {
        setResumo("Nenhum usuário precisa ser atualizado.");
        setAplicando(false);
        return;
      }

      let feitos = 0;
      for (const d of diffs) {
        const payload: any = {};

        // Só manda pro Firestore o que realmente mudou
        if (
          arraysDiferem(d.antesAtuacaoBasica, d.depoisAtuacaoBasica)
        ) {
          payload["atuacaoBasica"] = d.depoisAtuacaoBasica;
        }
        if (
          arraysDiferem(
            d.antesCategoriasAtuacao,
            d.depoisCategoriasAtuacao,
          )
        ) {
          payload["categoriasAtuacao"] = d.depoisCategoriasAtuacao;
        }
        if (
          arraysDiferem(d.antesCategorias, d.depoisCategorias)
        ) {
          payload["categorias"] = d.depoisCategorias;
        }
        if (
          arraysDiferem(
            d.antesCategoriesAll,
            d.depoisCategoriesAll,
          )
        ) {
          payload["categoriesAll"] = d.depoisCategoriesAll;
        }
        if (
          arraysDiferem(
            d.antesLeadPrefCats,
            d.depoisLeadPrefCats,
          )
        ) {
          // mantemos leadPreferencias.* existente, trocando só categorias
          payload["leadPreferencias.categorias"] = d.depoisLeadPrefCats;
        }

        if (Object.keys(payload).length > 0) {
          await updateDoc(doc(db, "usuarios", d.id), payload);
        }

        feitos++;
        setProgresso(Math.round((feitos / total) * 100));
      }

      setResumo(
        `Limpeza concluída para ${diffs.length} usuário(s). Categorias antigas foram removidas dos campos de atuação, categorias e preferências.`,
      );
    } catch (e: any) {
      console.error("Erro ao aplicar limpeza de categorias:", e);
      setErro(e?.message || "Erro ao aplicar limpeza.");
    } finally {
      setAplicando(false);
    }
  }

  const totalUsuarios = diffs.length;

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 16px 80px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
        Limpeza REAL de categorias (USUÁRIOS)
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "#475569",
          marginBottom: 16,
          maxWidth: 800,
        }}
      >
        Esta página <strong>ALTERA</strong> os documentos da coleção{" "}
        <code>usuarios</code>, removendo categorias antigas e mantendo
        apenas as categorias oficiais. Os campos ajustados são:{" "}
        <code>atuacaoBasica</code>, <code>categoriasAtuacao</code>,{" "}
        <code>categorias</code>, <code>categoriesAll</code> e{" "}
        <code>leadPreferencias.categorias</code>. Nenhum documento é
        apagado, apenas os campos de categoria são filtrados.
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
          Categorias oficiais que serão mantidas:
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
          Carregando usuários e calculando mudanças... ⏳
        </div>
      )}

      {!loading && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, color: "#0f172a" }}>
              Usuários que terão categorias ajustadas:{" "}
              <strong>{totalUsuarios}</strong>
            </div>

            <button
              type="button"
              onClick={aplicarLimpeza}
              disabled={aplicando || totalUsuarios === 0}
              style={{
                background:
                  totalUsuarios === 0
                    ? "#e5e7eb"
                    : "linear-gradient(90deg,#fb8500,#fb8500)",
                color: totalUsuarios === 0 ? "#6b7280" : "#ffffff",
                border: "none",
                borderRadius: 999,
                padding: "10px 20px",
                fontWeight: 800,
                fontSize: 14,
                cursor:
                  aplicando || totalUsuarios === 0
                    ? "not-allowed"
                    : "pointer",
                boxShadow:
                  totalUsuarios === 0
                    ? "none"
                    : "0 4px 16px #fb850055",
              }}
            >
              {aplicando
                ? `Aplicando limpeza... ${progresso}%`
                : totalUsuarios === 0
                ? "Nenhum usuário para limpar"
                : "Aplicar limpeza agora"}
            </button>
          </div>

          {erro && (
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

          {resumo && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: "#f0fdf4",
                color: "#15803d",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {resumo}
            </div>
          )}

          {totalUsuarios > 0 && (
            <div
              style={{
                marginTop: 20,
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
                        width: "24%",
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
                      Antes
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Depois (após limpeza)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d) => (
                    <tr key={d.id}>
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #e2e8f0",
                          verticalAlign: "top",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: "#0f172a",
                            marginBottom: 4,
                          }}
                        >
                          {d.nome}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            marginBottom: 2,
                          }}
                        >
                          UID: {d.id}
                        </div>
                        {d.email && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#475569",
                            }}
                          >
                            {d.email}
                          </div>
                        )}
                      </td>

                      {/* Antes */}
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #e2e8f0",
                          verticalAlign: "top",
                          background: "#f9fafb",
                        }}
                      >
                        <CampoDiffLista
                          label="atuacaoBasica.categoria"
                          valores={d.antesAtuacaoBasica.map(
                            (a) => a.categoria,
                          )}
                        />
                        <CampoDiffLista
                          label="categoriasAtuacao"
                          valores={d.antesCategoriasAtuacao}
                        />
                        <CampoDiffLista
                          label="categorias"
                          valores={d.antesCategorias}
                        />
                        <CampoDiffLista
                          label="categoriesAll"
                          valores={d.antesCategoriesAll}
                        />
                        <CampoDiffLista
                          label="leadPreferencias.categorias"
                          valores={d.antesLeadPrefCats}
                        />
                      </td>

                      {/* Depois */}
                      <td
                        style={{
                          padding: "8px 10px",
                          borderBottom: "1px solid #e2e8f0",
                          verticalAlign: "top",
                        }}
                      >
                        <CampoDiffLista
                          label="atuacaoBasica.categoria"
                          valores={d.depoisAtuacaoBasica.map(
                            (a) => a.categoria,
                          )}
                          destaqueVerde
                        />
                        <CampoDiffLista
                          label="categoriasAtuacao"
                          valores={d.depoisCategoriasAtuacao}
                          destaqueVerde
                        />
                        <CampoDiffLista
                          label="categorias"
                          valores={d.depoisCategorias}
                          destaqueVerde
                        />
                        <CampoDiffLista
                          label="categoriesAll"
                          valores={d.depoisCategoriesAll}
                          destaqueVerde
                        />
                        <CampoDiffLista
                          label="leadPreferencias.categorias"
                          valores={d.depoisLeadPrefCats}
                          destaqueVerde
                        />
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

function CampoDiffLista(props: {
  label: string;
  valores: string[];
  destaqueVerde?: boolean;
}) {
  const { label, valores, destaqueVerde } = props;
  if (!valores || valores.length === 0) {
    return (
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            fontWeight: 700,
            color: "#6b7280",
            marginBottom: 2,
          }}
        >
          {label}:
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          (vazio)
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          fontWeight: 700,
          color: "#1e293b",
          marginBottom: 2,
        }}
      >
        {label}:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {valores.map((v) => (
          <span
            key={v}
            style={{
              borderRadius: 999,
              padding: "3px 8px",
              border: destaqueVerde
                ? "1px solid #bbf7d0"
                : "1px solid #e5e7eb",
              background: destaqueVerde ? "#f0fdf4" : "#ffffff",
              fontSize: 12,
              color: destaqueVerde ? "#16a34a" : "#0f172a",
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

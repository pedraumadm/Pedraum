// app/meus-servicos/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  DocumentData,
  Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import {
  Loader,
  Edit,
  PlusCircle,
  ChevronLeft,
  Trash2,
  ClipboardList,
  MapPin,
  AlertTriangle,
} from "lucide-react";

/* ========= Tipos ========= */
type ServicoStatus = "ativo" | "pausado" | "inativo" | "expirado" | string;
type StatusOpt = "all" | "ativo" | "pausado" | "inativo" | "expirado";

type Servico = {
  id: string;
  titulo?: string;
  descricao?: string;
  categoria?: string;
  estado?: string;
  abrangencia?: string;
  abrangenciaLabel?: string;
  disponibilidade?: string;
  status?: ServicoStatus;
  imagens?: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  vendedorId?: string;
  tipo?: string;

  // 🔹 curadoria
  curadoriaStatus?: "pendente" | "aprovado" | "recusado" | string;
  visivel?: boolean;
};

/* ========= Utils ========= */
function toDate(ts?: Timestamp | null) {
  try {
    return ts ? ts.toDate() : null;
  } catch {
    return null;
  }
}
function fmt(d: Date | null) {
  return d ? d.toLocaleString("pt-BR") : "—";
}

function statusInfo(status?: ServicoStatus) {
  switch (status) {
    case "ativo":
      return {
        label: "Ativo",
        color: "#065f46",
        bg: "#ecfdf5",
        ring: "#34d39955",
      };
    case "pausado":
      return {
        label: "Pausado",
        color: "#92400e",
        bg: "#fffbeb",
        ring: "#fbbf2455",
      };
    case "inativo":
      return {
        label: "Inativo",
        color: "#991b1b",
        bg: "#fef2f2",
        ring: "#fca5a555",
      };
    case "expirado":
      return {
        label: "Expirado",
        color: "#334155",
        bg: "#e5e7eb",
        ring: "#cbd5e155",
      };
    default:
      return {
        label: "Ativo",
        color: "#065f46",
        bg: "#ecfdf5",
        ring: "#34d39955",
      };
  }
}

function curadoriaInfo(curadoriaStatus?: string, visivel?: boolean) {
  if (curadoriaStatus === "pendente") {
    return {
      label: "Em curadoria",
      color: "#92400e",
      bg: "#fffbeb",
      border: "#fbbf24aa",
    };
  }

  if (curadoriaStatus === "recusado") {
    return {
      label: "Reprovado pela curadoria",
      color: "#991b1b",
      bg: "#fef2f2",
      border: "#fca5a5aa",
    };
  }

  if (visivel || curadoriaStatus === "aprovado") {
    return {
      label: "Publicado",
      color: "#166534",
      bg: "#ecfdf5",
      border: "#22c55eaa",
    };
  }

  return {
    label: "Em curadoria",
    color: "#92400e",
    bg: "#fffbeb",
    border: "#fbbf24aa",
  };
}

function fallbackTitulo(s: Servico) {
  if (s.titulo) return s.titulo;
  const txt = (s.descricao || "").trim();
  return txt ? (txt.length > 80 ? txt.slice(0, 80) + "…" : txt) : "Serviço sem título";
}

function fallbackCategoria(s: Servico) {
  return s.categoria || "Serviço";
}

function resumo(s: Servico, max = 160) {
  const txt = (s.descricao || "").trim();
  return txt ? (txt.length > max ? txt.slice(0, max) + "…" : txt) : "—";
}

const btnStyle = (
  bg: string,
  color: string,
  border: string,
  disabled = false,
): React.CSSProperties => ({
  background: bg,
  color,
  fontWeight: 700,
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: `1.4px solid ${border}`,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

/* ========= Página ========= */
export default function MeusServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notLogged, setNotLogged] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusOpt>("all");
  const [error, setError] = useState<string | null>(null);

  /* auth */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u?.uid) {
        setUserId(u.uid);
        setNotLogged(false);
      } else {
        setUserId(null);
        setNotLogged(true);
        setServicos([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  /* assinatura services do usuário */
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const colRef = collection(db, "services");
    const q = query(colRef, where("vendedorId", "==", userId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Servico[] = snap.docs.map((s) => ({
          id: s.id,
          ...(s.data() as DocumentData),
        })) as Servico[];

        const ordered = [...list].sort((a, b) => {
          const ua = toDate(a.updatedAt)?.getTime() ?? 0;
          const ub = toDate(b.updatedAt)?.getTime() ?? 0;
          if (ua !== ub) return ub - ua;
          const ca = toDate(a.createdAt)?.getTime() ?? 0;
          const cb = toDate(b.createdAt)?.getTime() ?? 0;
          if (ca !== cb) return cb - ca;
          return b.id.localeCompare(a.id);
        });

        setServicos(ordered);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Falha ao carregar seus serviços.");
        setLoading(false);
      },
    );

    return () => unsub();
  }, [userId]);

  /* contadores / filtro */
  const counters = useMemo(() => {
    const base = {
      all: servicos.length,
      ativo: 0,
      pausado: 0,
      inativo: 0,
      expirado: 0,
    };
    for (const s of servicos) {
      const st = (s.status as StatusOpt) || "ativo";
      if (st in base) (base as any)[st] += 1;
      else base.ativo += 1;
    }
    return base;
  }, [servicos]);

  const listFiltered = useMemo(() => {
    if (statusFilter === "all") return servicos;
    return servicos.filter((s) => (s.status || "ativo") === statusFilter);
  }, [servicos, statusFilter]);
  const hasCuradoriaPendente = useMemo(
    () =>
      servicos.some(
        (s) =>
          (s.curadoriaStatus ?? "pendente") === "pendente" &&
          !s.visivel,
      ),
    [servicos],
  );

  /* excluir */
  const handleDelete = useCallback(
    async (id: string, titulo?: string) => {
      if (!userId) return;
      if (!window.confirm(`Tem certeza que deseja excluir o serviço "${titulo || id}"?`)) return;
      try {
        setDeleting(id);
        await deleteDoc(doc(db, "services", id));
      } finally {
        setDeleting(null);
      }
    },
    [userId],
  );

  /* UI */
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
      {/* Voltar ao painel */}
      <Link
        href="/painel"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
          gap: 6,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 900,
            color: "#023047",
            letterSpacing: "-1px",
            background: "#f3f6fa",
            borderRadius: 13,
            boxShadow: "0 2px 12px #0001",
            padding: "7px 28px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ClipboardList size={31} style={{ color: "#219ebc" }} /> Meus Serviços
        </h1>
        <Link
          href="/create-service"
          style={{
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: 19,
            borderRadius: 13,
            padding: "12px 30px",
            marginLeft: 8,
            boxShadow: "0 2px 12px #0001",
            display: "flex",
            alignItems: "center",
            gap: 7,
            textDecoration: "none",
          }}
        >
          <PlusCircle size={21} /> Novo Serviço
        </Link>
      </div>

      {/* Aviso de erro */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            background: "#fff7f7",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <AlertTriangle size={18} />
          <span style={{ fontWeight: 700 }}>{error}</span>
        </div>
      )}

      {/* Filtros */}
      {!notLogged && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <FilterPill
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={`Todos (${counters.all})`}
            color="#0f172a"
            bg="#e2e8f0"
          />
          <FilterPill
            active={statusFilter === "ativo"}
            onClick={() => setStatusFilter("ativo")}
            label={`Ativos (${counters.ativo})`}
            {...pillStyleFromStatus("ativo")}
          />
          <FilterPill
            active={statusFilter === "pausado"}
            onClick={() => setStatusFilter("pausado")}
            label={`Pausados (${counters.pausado})`}
            {...pillStyleFromStatus("pausado")}
          />
          <FilterPill
            active={statusFilter === "inativo"}
            onClick={() => setStatusFilter("inativo")}
            label={`Inativos (${counters.inativo})`}
            {...pillStyleFromStatus("inativo")}
          />
          <FilterPill
            active={statusFilter === "expirado"}
            onClick={() => setStatusFilter("expirado")}
            label={`Expirados (${counters.expirado})`}
            {...pillStyleFromStatus("expirado")}
          />
        </div>
      )}
      {/* Aviso de serviços em curadoria */}
      {hasCuradoriaPendente && !notLogged && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            borderRadius: 12,
            background: "#fffbeb",
            border: "1px solid #fbbf24aa",
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#92400e",
            fontSize: 13,
          }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              textTransform: "uppercase",
            }}
          >
            Em curadoria
          </span>
          <span style={{ fontWeight: 600 }}>
            Você possui serviços em curadoria. Eles só aparecerão na vitrine pública
            após aprovação da equipe Pedraum.
          </span>
        </div>
      )}

      {/* Estados de tela */}
      {notLogged ? (
        <EmptyLogin />
      ) : loading ? (
        <LoadingState />
      ) : listFiltered.length === 0 ? (
        <EmptyNoItems />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 24,
          }}
        >
          {listFiltered.map((s) => {
            const st = statusInfo(s.status);
            const cur = curadoriaInfo(s.curadoriaStatus, s.visivel);
            const created = fmt(toDate(s.createdAt));
            const img =
              Array.isArray(s.imagens) && s.imagens.length > 0 ? s.imagens[0] : null;

            return (
              <div
                key={s.id}
                style={{
                  borderRadius: 16,
                  boxShadow: "0 2px 20px #0001",
                  background: "#fff",
                  border: "1.6px solid #f2f3f7",
                  padding: "18px 18px 14px 18px",
                }}
              >
                {/* header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  {/* esquerda: imagem + título + categoria */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {img ? (
                      <img
                        src={img}
                        alt={fallbackTitulo(s)}
                        style={{
                          width: 52,
                          height: 52,
                          objectFit: "cover",
                          borderRadius: 12,
                          border: "1.2px solid #f2f3f7",
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            "/images/no-image.png";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          background: "#f3f3f7",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          fontWeight: 800,
                          color: "#FB8500",
                          border: "1.2px solid #f2f3f7",
                        }}
                      >
                        🛠️
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "#023047",
                          fontSize: 16,
                          letterSpacing: "-0.2px",
                        }}
                      >
                        {fallbackTitulo(s)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            background: "#F1F5F9",
                            borderRadius: 7,
                            color: "#FB8500",
                            fontWeight: 800,
                            padding: "3px 10px",
                            fontSize: 13,
                            border: "1px solid #ffe5bb",
                          }}
                        >
                          {fallbackCategoria(s)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* direita: status + curadoria */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    <span
                      title={st.label}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 800,
                        fontSize: 13,
                        borderRadius: 999,
                        padding: "4px 10px",
                        background: st.bg,
                        color: st.color,
                        border: `1.5px solid ${st.ring}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {st.label}
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 700,
                        fontSize: 11,
                        borderRadius: 999,
                        padding: "3px 10px",
                        background: cur.bg,
                        color: cur.color,
                        border: `1.3px solid ${cur.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cur.label}
                    </span>
                  </div>
                </div>

                {/* desc */}
                <div
                  style={{
                    color: "#667085",
                    fontSize: 14,
                    marginTop: 6,
                    minHeight: 44,
                  }}
                >
                  {resumo(s)}
                </div>

                {/* footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 12,
                    gap: 10,
                    flexWrap: "wrap",
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPin size={15} />
                    <span>
                      {s.abrangenciaLabel ||
                        s.abrangencia ||
                        s.estado ||
                        "Abrangência não informada"}
                    </span>
                    <span style={{ opacity: 0.6 }}>•</span>
                    <span>Criado: {created}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link
                      href={`/edit-service/${s.id}`}
                      style={btnStyle("#e3f2fd", "#2563eb", "#2563eb25")}
                    >
                      <Edit size={16} /> Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(s.id, s.titulo)}
                      disabled={deleting === s.id}
                      style={btnStyle(
                        "#fff6f3",
                        "#e63946",
                        "#e6394624",
                        deleting === s.id,
                      )}
                    >
                      <Trash2 size={16} />{" "}
                      {deleting === s.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ========= Auxiliares UI ========= */
function FilterPill({
  active,
  onClick,
  label,
  color,
  bg,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 12px",
        fontWeight: 800,
        fontSize: 12,
        border: `1.5px solid ${active ? "#0ea5e955" : "#e5e7eb"}`,
        background: active ? bg : "#fff",
        color: active ? color : "#0f172a",
        boxShadow: active ? "0 1px 8px #0001" : "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function pillStyleFromStatus(status: Exclude<StatusOpt, "all">) {
  const s = statusInfo(status);
  return { color: s.color, bg: s.bg };
}

function EmptyLogin() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "64px 0",
      }}
    >
      <ClipboardList style={{ marginBottom: 8, color: "#FB8500" }} size={44} />
      <p
        style={{
          color: "#FB8500",
          fontWeight: 700,
          fontSize: 22,
          marginBottom: 20,
        }}
      >
        Faça login para ver seus serviços.
      </p>
      <Link
        href="/auth/login"
        style={{
          padding: "14px 36px",
          borderRadius: 13,
          background: "#FB8500",
          color: "#fff",
          fontWeight: 800,
          fontSize: 19,
          boxShadow: "0 2px 14px #0001",
          textDecoration: "none",
        }}
      >
        Fazer login
      </Link>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 0",
      }}
    >
      <Loader className="animate-spin mr-2" size={28} color="#219EBC" />
      <span
        style={{
          fontSize: 21,
          fontWeight: 700,
          color: "#219EBC",
        }}
      >
        Carregando serviços...
      </span>
    </div>
  );
}

function EmptyNoItems() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "60px 0",
      }}
    >
      <img
        src="https://cdn-icons-png.flaticon.com/512/4151/4151075.png"
        alt="Sem serviços"
        style={{ width: 74, opacity: 0.7, marginBottom: 15 }}
      />
      <p
        style={{
          color: "#5B6476",
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        Você ainda não cadastrou serviços.
      </p>
      <Link
        href="/create-service"
        style={{
          marginTop: 4,
          padding: "12px 32px",
          borderRadius: 11,
          background: "#219ebc",
          color: "#fff",
          fontWeight: 800,
          fontSize: 17,
          boxShadow: "0 2px 10px #0001",
          textDecoration: "none",
        }}
      >
        Adicionar Serviço
      </Link>
    </div>
  );
}

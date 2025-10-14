"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { PlusCircle, Pencil, Trash2, Eye } from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";
import { doc, deleteDoc } from "firebase/firestore";

// Estilos inline para manter igual ao padrão do Header!
const cardStyle = {
  background: "#fff",
  border: "1.5px solid #e5e7eb",
  borderRadius: "22px",
  boxShadow: "0 2px 18px #0001",
  padding: "22px 18px",
  marginBottom: 20,
  minHeight: 310,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  transition: "box-shadow .16s, transform .16s",
};

const buttonStyle = {
  background: "#FB8500",
  color: "#fff",
  fontWeight: 700,
  fontSize: "1rem",
  borderRadius: "15px",
  padding: "9px 22px",
  boxShadow: "0 4px 14px #0001",
  border: "none",
  outline: "none",
  transition: "background .15s, transform .13s",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

function ListaMaquinasAdmin() {
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMaquinas() {
      setLoading(true);
      const snap = await getDocs(collection(db, "machines"));
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMaquinas(data);
      setLoading(false);
    }
    fetchMaquinas();
  }, []);
  function handleDelete(machineId: string) {
    if (!window.confirm("Tem certeza que deseja excluir esta máquina?")) return;
    deleteDoc(doc(db, "machines", machineId))
      .then(() => {
        alert("Máquina excluída com sucesso!");
        window.location.reload(); // Ou faça um setState para remover da lista sem reload
      })
      .catch(() => alert("Erro ao excluir. Tente novamente."));
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "40px 0 0 0",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2vw" }}>
        {/* Título + botão */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              color: "#023047",
              fontWeight: 900,
              fontSize: "2.1rem",
              letterSpacing: "-1.1px",
            }}
          >
            Máquinas Cadastradas
          </h1>
          <Link href="/create-machine" legacyBehavior>
            <a style={buttonStyle}>
              <PlusCircle size={22} />
              Nova Máquina
            </a>
          </Link>
        </div>

        {/* Grid de cards */}
        {loading ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              fontWeight: 700,
              color: "#919191",
              fontSize: "1.1rem",
            }}
          >
            Carregando máquinas...
          </div>
        ) : maquinas.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              fontWeight: 700,
              color: "#C1B5A0",
              fontSize: "1.1rem",
            }}
          >
            Nenhuma máquina cadastrada.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 28,
              marginTop: 2,
            }}
          >
            {maquinas.map((m) => (
              <div
                key={m.id}
                style={{
                  boxShadow: "0 2px 18px #0001",
                  transition: "box-shadow .15s, transform .15s",
                  cursor: "pointer",
                  position: "relative",
                  background: "white",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  flexDirection:
                    "column" as React.CSSProperties["flexDirection"],
                  justifyContent: "center",
                }}
              >
                {/* Imagem */}
                <div
                  style={{
                    width: "100%",
                    height: 125,
                    background: "#f0f3fa",
                    borderRadius: 16,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 17,
                  }}
                >
                  <img
                    src={m.imagens?.[0] || "/placeholder-machine.jpg"}
                    alt={m.nome || "Máquina"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                {/* Nome e tipo */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 900,
                      color: "#023047",
                      fontSize: "1.09rem",
                    }}
                  >
                    {m.nome || "Máquina sem nome"}
                  </span>
                  <span
                    style={{
                      background: "#e8f0fe",
                      color: "#2563eb",
                      borderRadius: 12,
                      padding: "3px 13px",
                      fontWeight: 700,
                      fontSize: ".93rem",
                    }}
                  >
                    {m.tipo || "—"}
                  </span>
                </div>
                {/* Preço */}
                <div
                  style={{
                    fontWeight: 800,
                    color: "#FB8500",
                    fontSize: "1.17rem",
                  }}
                >
                  {m.preco
                    ? `R$ ${Number(m.preco).toLocaleString("pt-BR")}`
                    : "Preço sob consulta"}
                </div>
                {/* Status */}
                <div
                  style={{
                    fontSize: ".98rem",
                    fontWeight: 600,
                    margin: "5px 0 11px 0",
                    color: m.status === "Ativo" ? "#119822" : "#b1b5bd",
                  }}
                >
                  {m.status || "Status indefinido"}
                </div>
                {/* Ações */}
                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    marginTop: 5,
                    alignItems: "center",
                  }}
                >
                  <Link href={`/admin/machines/${m.id}/edit`} legacyBehavior>
                    <a
                      style={{
                        background: "#e8f0fe",
                        color: "#2563eb",
                        fontWeight: 700,
                        fontSize: ".97rem",
                        borderRadius: "10px",
                        padding: "7px 15px",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        border: "none",
                      }}
                      title="Editar"
                    >
                      <Pencil size={17} />
                      Editar
                    </a>
                  </Link>
                  <button
                    onClick={() => handleDelete(m.id)}
                    style={{
                      background: "#fff0f0",
                      color: "#d90429",
                      border: "1px solid #ffe5e5",
                      fontWeight: 700,
                      padding: "7px 16px",
                      borderRadius: 10,
                      marginRight: 6,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title="Excluir"
                  >
                    <Trash2 size={16} style={{ marginRight: 4 }} />
                    Excluir
                  </button>

                  <Link href={`/machines/${m.id}`} legacyBehavior>
                    <a
                      style={{
                        color: "#FB8500",
                        fontWeight: 700,
                        fontSize: ".97rem",
                        padding: "7px 10px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        border: "none",
                        background: "none",
                      }}
                      title="Ver detalhes"
                    >
                      <Eye size={17} />
                      Ver detalhes
                    </a>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSS responsivo extra */}
      <style>{`
        @media (max-width: 700px) {
          h1 { font-size: 1.28rem !important; }
          .machine-card { padding: 12px 6px !important; min-height: 210px !important; }
        }
        .machine-card:hover {
          box-shadow: 0 8px 30px #02304710, 0 2px 8px #0001;
          transform: translateY(-2px) scale(1.015);
        }
      `}</style>
    </main>
  );
}

export default withRoleProtection(ListaMaquinasAdmin, { allowed: ["admin"] });

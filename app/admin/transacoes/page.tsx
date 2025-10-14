"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";

type Transacao = {
  id: string;
  comprador: string;
  vendedor: string;
  valor: number;
  data: string;
  status: string;
  // ...adicione outros campos conforme sua coleção
};

export default function AdminTransacoesPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransacoes() {
      setLoading(true);
      const snap = await getDocs(collection(db, "transacoes"));
      const lista = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transacao[];
      setTransacoes(lista);
      setLoading(false);
    }
    fetchTransacoes();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    await deleteDoc(doc(db, "transacoes", id));
    setTransacoes(transacoes.filter((t) => t.id !== id));
  }

  return (
    <main
      style={{ minHeight: "100vh", background: "#f9fafb", padding: "40px 0" }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 2px 32px #0001",
          padding: "36px 26px",
        }}
      >
        <h1
          style={{
            fontWeight: 900,
            fontSize: "2rem",
            color: "#023047",
            marginBottom: 30,
            letterSpacing: "-1px",
            textAlign: "center",
          }}
        >
          Transações Realizadas
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 className="animate-spin" size={32} color="#219EBC" />
          </div>
        ) : (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "1.04rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f9fafb",
                    color: "#2563eb",
                    fontWeight: 700,
                  }}
                >
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Comprador</th>
                  <th style={thStyle}>Vendedor</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: 50,
                        color: "#aaa",
                      }}
                    >
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                ) : (
                  transacoes.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={tdStyle}>{t.id}</td>
                      <td style={tdStyle}>{t.comprador}</td>
                      <td style={tdStyle}>{t.vendedor}</td>
                      <td style={tdStyle}>
                        R$ {Number(t.valor).toLocaleString("pt-BR")}
                      </td>
                      <td style={tdStyle}>{t.data}</td>
                      <td style={tdStyle}>{t.status}</td>
                      <td style={tdStyle}>
                        <Link href={`/admin/transacoes/${t.id}/edit`}>
                          <button style={btnEdit}>
                            <Pencil size={17} /> Editar
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          style={btnDelete}
                        >
                          <Trash2 size={17} /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
      <style>{`
        @media (max-width: 800px) {
          table, thead, tbody, th, td, tr { display: block; }
          th, td { padding: 10px 0; text-align: left; }
        }
      `}</style>
    </main>
  );
}

const thStyle = {
  padding: "12px 7px",
  borderBottom: "1.5px solid #e5e7eb",
  color: "#2563eb",
  fontWeight: 700,
};
const tdStyle = { padding: "10px 7px" };
const btnEdit = {
  background: "#e3f0fc",
  color: "#2563eb",
  fontWeight: 600,
  border: "none",
  borderRadius: 8,
  marginRight: 10,
  padding: "7px 13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};
const btnDelete = {
  background: "#feecec",
  color: "#e53935",
  fontWeight: 600,
  border: "none",
  borderRadius: 8,
  padding: "7px 13px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
};

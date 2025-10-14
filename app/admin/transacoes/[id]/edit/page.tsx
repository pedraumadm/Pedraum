"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function EditTransacaoPage() {
  const router = useRouter();
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    comprador: "",
    vendedor: "",
    valor: "",
    data: "",
    status: "",
    // Adicione outros campos da transação aqui, se necessário
  });

  // Buscar transação existente
  useEffect(() => {
    async function fetchTransacao() {
      setLoading(true);
      const ref = doc(db, "transacoes", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          comprador: data.comprador || "",
          vendedor: data.vendedor || "",
          valor: data.valor ? String(data.valor) : "",
          data: data.data || "",
          status: data.status || "",
          // Inclua outros campos se existirem
        });
      }
      setLoading(false);
    }
    if (id) fetchTransacao();
  }, [id]);

  // Atualizar form ao digitar
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Salvar alterações
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    await updateDoc(doc(db, "transacoes", id), {
      ...form,
      valor: Number(form.valor),
      // Inclua aqui qualquer tratamento necessário
    });
    setSalvando(false);
    router.push("/admin/transacoes");
  }

  return (
    <main
      style={{ minHeight: "100vh", background: "#f9fafb", padding: "40px 0" }}
    >
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 2px 32px #0001",
          padding: "36px 26px 32px 26px",
          minHeight: 340,
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
          Editar Transação
        </h1>
        {loading ? (
          <div style={{ textAlign: "center", padding: 50 }}>
            <Loader2 className="animate-spin" size={28} color="#219EBC" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Comprador *</label>
            <input
              style={inputStyle}
              name="comprador"
              type="text"
              value={form.comprador}
              onChange={handleChange}
              required
            />
            <label style={labelStyle}>Vendedor *</label>
            <input
              style={inputStyle}
              name="vendedor"
              type="text"
              value={form.vendedor}
              onChange={handleChange}
              required
            />
            <label style={labelStyle}>Valor (R$) *</label>
            <input
              style={inputStyle}
              name="valor"
              type="number"
              min={0}
              step="0.01"
              value={form.valor}
              onChange={handleChange}
              required
            />
            <label style={labelStyle}>Data *</label>
            <input
              style={inputStyle}
              name="data"
              type="text"
              placeholder="DD/MM/AAAA"
              value={form.data}
              onChange={handleChange}
              required
            />
            <label style={labelStyle}>Status *</label>
            <select
              style={inputStyle}
              name="status"
              value={form.status}
              onChange={handleChange}
              required
            >
              <option value="">Selecione</option>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
              <option value="cancelada">Cancelada</option>
              {/* Adicione outros status conforme necessário */}
            </select>
            <button
              type="submit"
              disabled={salvando}
              style={{
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                borderRadius: 12,
                padding: "13px 0",
                fontSize: "1.09rem",
                width: "100%",
                marginTop: 18,
                marginBottom: 8,
                border: "none",
                outline: "none",
                cursor: salvando ? "not-allowed" : "pointer",
                boxShadow: "0 2px 18px #0001",
                letterSpacing: ".01em",
                transition: "background .15s, transform .13s",
              }}
            >
              {salvando ? (
                <Loader2
                  className="animate-spin"
                  size={20}
                  style={{ marginRight: 8, marginBottom: -4 }}
                />
              ) : null}
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>
          </form>
        )}
        <div style={{ textAlign: "center" }}>
          <a
            href="/admin/transacoes"
            style={{
              color: "#2563eb",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "1rem",
              marginTop: 5,
              display: "inline-block",
            }}
          >
            ← Voltar para listagem
          </a>
        </div>
      </div>
    </main>
  );
}

const labelStyle = {
  color: "#023047",
  fontWeight: 600,
  marginBottom: 4,
  marginTop: 14,
  display: "block",
};
const inputStyle = {
  width: "100%",
  padding: "12px 13px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "10px",
  background: "#f8fafc",
  fontSize: "1.05rem",
  marginBottom: 5,
  marginTop: 2,
  fontWeight: 500,
  outline: "none" as const,
  color: "#023047",
  transition: "border .13s",
};

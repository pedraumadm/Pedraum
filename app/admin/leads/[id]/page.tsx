"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  Loader2,
  ArrowLeft,
  Pencil,
  Trash2,
  Copy,
  CheckCircle2,
  Eye,
  Save,
  XCircle,
} from "lucide-react";
import Link from "next/link";

const WhatsappIcon = () => (
  <svg width="21" height="21" viewBox="0 0 32 32" fill="none">
    <path
      d="M16.003 3.003c-7.168 0-13 5.832-13 13 0 2.279.597 4.486 1.732 6.433l-1.823 6.668a2 2 0 0 0 2.45 2.45l6.668-1.823A12.946 12.946 0 0 0 16.003 29c7.168 0 13-5.832 13-13s-5.832-13-13-13Zm0 23.667c-2.014 0-4.007-.537-5.73-1.557l-.41-.238-4.473 1.222 1.222-4.473-.237-.41C5.537 20.01 5 18.017 5 16c0-6.075 4.928-11 11-11s11 4.925 11 11-4.928 11-11 11Zm6.37-7.307c-.174-.087-1.02-.502-2.352-1.084-.626-.27-1.083-.455-1.552.183-.442.611-.855 1.04-1.57.13-.442-.554-.89-.777-1.508-1.23-.684-.492-1.254-.981-1.76-1.727-.54-.797.02-.997.462-1.353.34-.272.56-.596.842-.971.277-.37.15-.765.084-1.035-.066-.27-.567-1.37-.777-1.863-.206-.484-.415-.42-.567-.428l-.486-.008c-.164 0-.43.062-.657.289-.226.227-.86.842-.86 2.049 0 1.207.88 2.374 1.002 2.538.122.163 1.73 2.684 4.188 3.66.586.204 1.042.326 1.399.417.588.149 1.123.129 1.548.078.472-.055 1.45-.593 1.654-1.163.203-.57.203-1.058.142-1.163-.06-.105-.16-.16-.334-.247Z"
      fill="#25D366"
    />
  </svg>
);

type Lead = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  origem?: string;
  status: string;
  valor?: number;
  comprador?: string;
  vendedor?: string;
  premium?: boolean;
  visualizado?: boolean;
  createdAt?: any;
  interesse?: string;
  produtoInteresse?: string;
  descricaoInteresse?: string;
  produtoNome?: string;
  tipoProduto?: string;
  observacoes?: string;
};

export default function LeadDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const id =
    typeof params?.id === "string" ? params.id : (params?.id as string[])[0];
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [novoStatus, setNovoStatus] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function fetchLead() {
      setLoading(true);
      const ref = doc(db, "leads", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setLead({ id: snap.id, ...snap.data() } as Lead);
        setNovoStatus((snap.data() as Lead).status);
      } else {
        setLead(null);
      }
      setLoading(false);
    }
    if (id) fetchLead();
  }, [id]);

  function copyToClipboard(txt: string) {
    navigator.clipboard.writeText(txt);
  }

  async function handleSalvarStatus(e: any) {
    e.preventDefault();
    if (!lead) return;
    setSalvando(true);
    await updateDoc(doc(db, "leads", id), { status: novoStatus });
    setLead((l) => (l ? { ...l, status: novoStatus } : l));
    setEditando(false);
    setSalvando(false);
  }

  async function handleExcluir() {
    if (!window.confirm("Tem certeza que deseja excluir este lead?")) return;
    await deleteDoc(doc(db, "leads", id));
    alert("Lead excluído com sucesso.");
    router.push("/admin/leads");
  }

  // Lógica para mostrar o interesse corretamente:
  let interesseView = "";
  if (lead) {
    if (lead.produtoNome && lead.tipoProduto) {
      interesseView = `Produto: ${lead.produtoNome} | Tipo: ${lead.tipoProduto}`;
    } else if (lead.produtoNome) {
      interesseView = `Produto: ${lead.produtoNome}`;
    } else if (lead.tipoProduto) {
      interesseView = `Tipo: ${lead.tipoProduto}`;
    } else if (lead.interesse) {
      interesseView = lead.interesse;
    } else if (lead.produtoInteresse) {
      interesseView = lead.produtoInteresse;
    } else if (lead.descricaoInteresse) {
      interesseView = lead.descricaoInteresse;
    }
  }
  if (!interesseView)
    interesseView = "Nenhuma descrição de interesse encontrada";

  if (loading)
    return (
      <div
        style={{
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          color: "#2563eb",
        }}
      >
        <Loader2 className="animate-spin" size={32} /> Carregando lead...
      </div>
    );
  if (!lead)
    return (
      <div
        style={{
          color: "#dc2626",
          fontWeight: 700,
          textAlign: "center",
          marginTop: 60,
        }}
      >
        Lead não encontrado.
        <br />
        <Link
          href="/admin/leads"
          style={{
            color: "#2563eb",
            fontWeight: 900,
            marginTop: 16,
            display: "inline-block",
          }}
        >
          Voltar para lista de leads
        </Link>
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 620,
        margin: "40px auto",
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 2px 32px #0002",
        padding: "40px 24px 32px 24px",
        border: "1.7px solid #e0e7ef",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 32,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "#f1f3fa",
            borderRadius: 999,
            padding: 9,
            color: "#2563eb",
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1
          style={{
            fontSize: "2.1rem",
            fontWeight: 900,
            color: "#134074",
            margin: 0,
          }}
        >
          Detalhes do Lead
        </h1>
        {lead.premium && (
          <span
            style={{
              background: "#8f4fd7",
              color: "#fff",
              fontWeight: 900,
              borderRadius: 999,
              padding: "6px 18px",
              fontSize: 16,
              marginLeft: "auto",
            }}
          >
            PREMIUM
          </span>
        )}
      </div>
      {/* Dados principais */}
      <div
        style={{
          marginBottom: 17,
          borderBottom: "1.5px solid #f2f2f2",
          paddingBottom: 19,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            color: "#134074",
            fontSize: 21,
            marginBottom: 4,
          }}
        >
          {lead.nome}
          <button
            onClick={() => copyToClipboard(lead.nome)}
            style={{
              marginLeft: 9,
              color: "#2563eb",
              background: "none",
              border: "none",
            }}
            title="Copiar nome"
          >
            <Copy size={16} />
          </button>
        </div>
        <div
          style={{
            fontWeight: 800,
            color: "#2563eb",
            fontSize: 17,
            marginBottom: 1,
          }}
        >
          {lead.email}
          <button
            onClick={() => copyToClipboard(lead.email)}
            style={{
              marginLeft: 7,
              color: "#2563eb",
              background: "none",
              border: "none",
            }}
            title="Copiar email"
          >
            <Copy size={14} />
          </button>
        </div>
        <div
          style={{
            fontWeight: 700,
            color: "#818181",
            fontSize: 16,
            marginBottom: 5,
          }}
        >
          {lead.telefone}
          {lead.telefone && (
            <a
              href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: 7,
                verticalAlign: "middle",
                textDecoration: "none",
              }}
              title="WhatsApp"
            >
              <WhatsappIcon />
            </a>
          )}
          <button
            onClick={() => copyToClipboard(lead.telefone)}
            style={{
              marginLeft: 7,
              color: "#2563eb",
              background: "none",
              border: "none",
            }}
            title="Copiar telefone"
          >
            <Copy size={13} />
          </button>
        </div>
        {/* Interesse */}
        <div
          style={{
            marginTop: 10,
            marginBottom: 6,
            fontWeight: 800,
            color: "#FB8500",
            fontSize: 17,
          }}
        >
          Interesse: {interesseView}
        </div>
        {/* Observações */}
        {lead.observacoes && (
          <div style={{ marginTop: 7, fontWeight: 700, color: "#219ebc" }}>
            Obs.: {lead.observacoes}
          </div>
        )}
      </div>
      {/* Infos rápidas */}
      <div
        style={{ display: "flex", gap: 15, flexWrap: "wrap", marginBottom: 13 }}
      >
        <div
          style={{
            background: "#e8f8fe",
            color: "#2563eb",
            borderRadius: 9,
            fontWeight: 900,
            padding: "5px 13px",
            fontSize: 15,
          }}
        >
          Tipo: {lead.tipo?.toUpperCase()}
        </div>
        {lead.origem && (
          <div
            style={{
              background: "#f5f7ff",
              color: "#134074",
              borderRadius: 9,
              fontWeight: 800,
              padding: "5px 13px",
              fontSize: 15,
            }}
          >
            Origem: {lead.origem}
          </div>
        )}
        <div
          style={{
            borderRadius: 9,
            background:
              lead.status === "vendido"
                ? "#e7faec"
                : lead.status === "pendente"
                  ? "#f3f7ff"
                  : "#fff9ec",
            color:
              lead.status === "vendido"
                ? "#059669"
                : lead.status === "pendente"
                  ? "#2563eb"
                  : "#FB8500",
            fontWeight: 800,
            fontSize: 15,
            padding: "5px 13px",
          }}
        >
          Status:{" "}
          {editando ? (
            <form
              onSubmit={handleSalvarStatus}
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                style={{
                  borderRadius: 7,
                  border: "1px solid #e0e7ef",
                  padding: "3.5px 7px",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="vendido">Vendido</option>
                <option value="cancelado">Cancelado</option>
                <option value="contatado">Contatado</option>
              </select>
              <button
                type="submit"
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 5,
                  padding: "4px 11px",
                  fontWeight: 800,
                  fontSize: 14,
                  marginLeft: 4,
                }}
                disabled={salvando}
              >
                <Save size={15} /> {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                style={{
                  color: "#dc2626",
                  background: "none",
                  border: "none",
                  marginLeft: 2,
                }}
              >
                <XCircle size={16} />
              </button>
            </form>
          ) : (
            <>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              <button
                onClick={() => setEditando(true)}
                style={{
                  marginLeft: 4,
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                }}
                title="Editar status"
              >
                <Pencil size={15} />
              </button>
            </>
          )}
        </div>
        {lead.valor && (
          <div
            style={{
              background: "#fff9ec",
              color: "#FB8500",
              borderRadius: 9,
              fontWeight: 900,
              padding: "5px 13px",
              fontSize: 15,
            }}
          >
            Valor: R$ {Number(lead.valor).toLocaleString("pt-BR")}
          </div>
        )}
        {lead.createdAt?.seconds && (
          <div
            style={{
              background: "#e9e9ea",
              color: "#65666a",
              borderRadius: 9,
              fontWeight: 800,
              padding: "5px 13px",
              fontSize: 15,
            }}
          >
            Criado em:{" "}
            {new Date(lead.createdAt.seconds * 1000).toLocaleString("pt-BR")}
          </div>
        )}
      </div>
      {/* Comprador/Vendedor */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 17,
          marginBottom: 12,
          color: "#787c83",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {lead.comprador && (
          <span>
            <CheckCircle2
              size={14}
              color="#059669"
              style={{ marginRight: 3, verticalAlign: "middle" }}
            />{" "}
            Comprador: <b>{lead.comprador}</b>
          </span>
        )}
        {lead.vendedor && (
          <span>
            <CheckCircle2
              size={14}
              color="#fb8500"
              style={{ marginRight: 3, verticalAlign: "middle" }}
            />{" "}
            Vendedor: <b>{lead.vendedor}</b>
          </span>
        )}
        {lead.visualizado && (
          <span style={{ color: "#2563eb" }}>
            <Eye size={15} /> Visualizado
          </span>
        )}
      </div>
      {/* Ações rápidas */}
      <div style={{ display: "flex", gap: 11, marginTop: 20 }}>
        <Link
          href={`/admin/leads/${lead.id}/edit`}
          style={{
            background: "#e8f8fe",
            color: "#2563eb",
            border: "1px solid #e0ecff",
            fontWeight: 800,
            fontSize: 17,
            padding: "10px 27px",
            borderRadius: 13,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Pencil size={18} /> Editar Lead
        </Link>
        <button
          onClick={handleExcluir}
          style={{
            background: "#fff0f0",
            color: "#d90429",
            border: "1px solid #ffe5e5",
            fontWeight: 800,
            fontSize: 17,
            padding: "10px 27px",
            borderRadius: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Trash2 size={18} /> Excluir Lead
        </button>
      </div>
    </div>
  );
}

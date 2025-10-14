"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import {
  Search,
  Trash2,
  Eye,
  Pencil,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";

type Lead = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: "produto" | "serviço" | "demanda";
  origem?: string;
  status: string;
  valor?: number;
  comprador?: string;
  vendedor?: string;
  premium?: boolean;
  visualizado?: boolean;
  createdAt?: any;
};

function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPremium, setFiltroPremium] = useState("");

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      const snap = await getDocs(collection(db, "leads"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Lead[];
      setLeads(data);
      setLoading(false);
    }
    fetchLeads();
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este lead?")) return;
    await deleteDoc(doc(db, "leads", id));
    setLeads((leads) => leads.filter((l) => l.id !== id));
  }

  function copyToClipboard(txt: string) {
    navigator.clipboard.writeText(txt);
  }

  // Filtros avançados
  const leadsFiltrados = leads.filter(
    (l) =>
      (!busca ||
        l.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        l.email?.toLowerCase().includes(busca.toLowerCase()) ||
        l.telefone?.toLowerCase().includes(busca.toLowerCase())) &&
      (!filtroTipo || l.tipo === filtroTipo) &&
      (!filtroStatus || l.status === filtroStatus) &&
      (!filtroPremium ||
        (filtroPremium === "premium" ? l.premium : !l.premium)),
  );

  // Resumo
  const total = leads.length;
  const pendentes = leads.filter((l) => l.status === "pendente").length;
  const vendidos = leads.filter((l) => l.status === "vendido").length;
  const premium = leads.filter((l) => l.premium).length;

  // SVG simples do WhatsApp
  const WhatsappIcon = () => (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
      <path
        d="M16.003 3.003c-7.168 0-13 5.832-13 13 0 2.279.597 4.486 1.732 6.433l-1.823 6.668a2 2 0 0 0 2.45 2.45l6.668-1.823A12.946 12.946 0 0 0 16.003 29c7.168 0 13-5.832 13-13s-5.832-13-13-13Zm0 23.667c-2.014 0-4.007-.537-5.73-1.557l-.41-.238-4.473 1.222 1.222-4.473-.237-.41C5.537 20.01 5 18.017 5 16c0-6.075 4.928-11 11-11s11 4.925 11 11-4.928 11-11 11Zm6.37-7.307c-.174-.087-1.02-.502-2.352-1.084-.626-.27-1.083-.455-1.552.183-.442.611-.855 1.04-1.57.13-.442-.554-.89-.777-1.508-1.23-.684-.492-1.254-.981-1.76-1.727-.54-.797.02-.997.462-1.353.34-.272.56-.596.842-.971.277-.37.15-.765.084-1.035-.066-.27-.567-1.37-.777-1.863-.206-.484-.415-.42-.567-.428l-.486-.008c-.164 0-.43.062-.657.289-.226.227-.86.842-.86 2.049 0 1.207.88 2.374 1.002 2.538.122.163 1.73 2.684 4.188 3.66.586.204 1.042.326 1.399.417.588.149 1.123.129 1.548.078.472-.055 1.45-.593 1.654-1.163.203-.57.203-1.058.142-1.163-.06-.105-.16-.16-.334-.247Z"
        fill="#25D366"
      />
    </svg>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "46px 0 30px 0",
      }}
    >
      <section style={{ maxWidth: 1380, margin: "0 auto", padding: "0 2vw" }}>
        {/* Resumo */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 28,
            flexWrap: "wrap",
          }}
        >
          <ResumoCard label="Total de Leads" value={total} color="#2563eb" />
          <ResumoCard label="Pendentes" value={pendentes} color="#FB8500" />
          <ResumoCard label="Vendidos" value={vendidos} color="#059669" />
          <ResumoCard label="Premium" value={premium} color="#8f4fd7" />
        </div>

        {/* Filtros */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                top: 9,
                left: 10,
                color: "#a0a0a0",
              }}
            />
            <input
              style={{
                padding: "8px 8px 8px 35px",
                borderRadius: 11,
                border: "1px solid #e0e7ef",
                minWidth: 210,
                fontSize: 15,
                fontWeight: 600,
                color: "#023047",
              }}
              placeholder="Buscar nome, e-mail, telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{
              borderRadius: 10,
              border: "1px solid #e0e7ef",
              fontWeight: 700,
              color: "#2563eb",
              padding: "8px 13px",
            }}
          >
            <option value="">Todos Tipos</option>
            <option value="produto">Produto</option>
            <option value="serviço">Serviço</option>
            <option value="demanda">Demanda</option>
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{
              borderRadius: 10,
              border: "1px solid #e0e7ef",
              fontWeight: 700,
              color: "#FB8500",
              padding: "8px 13px",
            }}
          >
            <option value="">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vendido">Vendido</option>
            <option value="cancelado">Cancelado</option>
            <option value="contatado">Contatado</option>
          </select>
          <select
            value={filtroPremium}
            onChange={(e) => setFiltroPremium(e.target.value)}
            style={{
              borderRadius: 10,
              border: "1px solid #e0e7ef",
              fontWeight: 700,
              color: "#8f4fd7",
              padding: "8px 13px",
            }}
          >
            <option value="">Todos</option>
            <option value="premium">Premium</option>
            <option value="comum">Comum</option>
          </select>
        </div>

        {/* Lista de Leads */}
        {loading ? (
          <div
            style={{
              color: "#219EBC",
              fontWeight: 700,
              padding: 44,
              textAlign: "center",
            }}
          >
            <Loader2 className="animate-spin" size={28} /> Carregando leads...
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div
            style={{
              color: "#adb0b6",
              fontWeight: 600,
              padding: 44,
              textAlign: "center",
            }}
          >
            Nenhum lead encontrado.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(410px, 1fr))",
              gap: 30,
            }}
          >
            {leadsFiltrados.map((l) => (
              <div
                key={l.id}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  boxShadow: "0 2px 20px #0001",
                  padding: "28px 22px 19px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                  minHeight: 148,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: "1.19rem",
                      color: "#023047",
                    }}
                  >
                    {l.nome}
                    {l.premium && (
                      <span
                        style={{
                          background: "#8f4fd7",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: 12,
                          marginLeft: 7,
                          padding: "3px 8px",
                          borderRadius: 9,
                        }}
                      >
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <button
                    title="Copiar e-mail"
                    style={{
                      marginLeft: 4,
                      cursor: "pointer",
                      color: "#2563eb",
                      background: "none",
                      border: "none",
                    }}
                    onClick={() => copyToClipboard(l.email)}
                  >
                    <Copy size={17} />
                  </button>
                </div>
                <div style={{ color: "#2563eb", fontWeight: 700 }}>
                  {l.email}
                </div>
                <div style={{ color: "#888", fontWeight: 700, fontSize: 15 }}>
                  {l.telefone}
                  {l.telefone && (
                    <a
                      href={`https://wa.me/55${l.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: 7, verticalAlign: "middle" }}
                      title="WhatsApp"
                    >
                      <WhatsappIcon />
                    </a>
                  )}
                  <button
                    title="Copiar telefone"
                    style={{
                      marginLeft: 6,
                      cursor: "pointer",
                      color: "#219ebc",
                      background: "none",
                      border: "none",
                    }}
                    onClick={() => copyToClipboard(l.telefone)}
                  >
                    <Copy size={15} />
                  </button>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: ".99rem",
                    color: "#FB8500",
                  }}
                >
                  {l.tipo?.toUpperCase()}
                  {l.origem && (
                    <span style={{ color: "#023047", fontWeight: 600 }}>
                      {" "}
                      - {l.origem}
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 2 }}>
                  <span
                    style={{
                      borderRadius: 9,
                      background:
                        l.status === "pendente"
                          ? "#f3f7ff"
                          : l.status === "vendido"
                            ? "#e7faec"
                            : "#fff9ec",
                      color:
                        l.status === "pendente"
                          ? "#2563eb"
                          : l.status === "vendido"
                            ? "#059669"
                            : "#FB8500",
                      fontWeight: 800,
                      fontSize: ".97rem",
                      padding: "4.5px 13px",
                    }}
                  >
                    {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                  </span>
                  {l.valor && (
                    <span
                      style={{
                        background: "#f8fafc",
                        color: "#2563eb",
                        borderRadius: 9,
                        fontWeight: 800,
                        marginLeft: 9,
                        padding: "2px 10px",
                        fontSize: 15,
                      }}
                    >
                      R$ {Number(l.valor).toLocaleString("pt-BR")}
                    </span>
                  )}
                  {l.createdAt?.seconds && (
                    <span
                      style={{ color: "#b6b6b6", marginLeft: 8, fontSize: 13 }}
                    >
                      {new Date(l.createdAt.seconds * 1000).toLocaleString(
                        "pt-BR",
                      )}
                    </span>
                  )}
                </div>
                {/* Detalhes: comprador, vendedor, badge visualizado */}
                <div style={{ color: "#888", fontSize: 14 }}>
                  {l.comprador && (
                    <span>
                      <CheckCircle2
                        size={13}
                        color="#059669"
                        style={{ marginRight: 3, verticalAlign: "middle" }}
                      />
                      Comprador: <b>{l.comprador}</b>
                    </span>
                  )}
                  {l.vendedor && (
                    <span style={{ marginLeft: 11 }}>
                      <CheckCircle2
                        size={13}
                        color="#fb8500"
                        style={{ marginRight: 3, verticalAlign: "middle" }}
                      />
                      Vendedor: <b>{l.vendedor}</b>
                    </span>
                  )}
                  {l.visualizado && (
                    <span style={{ marginLeft: 11, color: "#2563eb" }}>
                      <Eye size={13} /> Visualizado
                    </span>
                  )}
                </div>
                {/* Ações rápidas */}
                <div style={{ display: "flex", gap: 10, marginTop: 13 }}>
                  <Link
                    href={`/admin/leads/${l.id}/edit`}
                    style={{
                      background: "#e8f8fe",
                      color: "#2563eb",
                      border: "1px solid #e0ecff",
                      fontWeight: 700,
                      fontSize: ".99rem",
                      padding: "7px 18px",
                      borderRadius: 9,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Pencil size={16} /> Editar
                  </Link>
                  <Link
                    href={`/admin/leads/${l.id}`}
                    style={{
                      background: "#e8f8fe",
                      color: "#134074",
                      border: "1px solid #e0ecff",
                      fontWeight: 700,
                      fontSize: ".99rem",
                      padding: "7px 14px",
                      borderRadius: 9,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Eye size={16} /> Ver Detalhes
                  </Link>
                  <button
                    onClick={() => handleDelete(l.id)}
                    style={{
                      background: "#fff0f0",
                      color: "#d90429",
                      border: "1px solid #ffe5e5",
                      fontWeight: 700,
                      fontSize: ".99rem",
                      padding: "7px 12px",
                      borderRadius: 9,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// --- Card de Resumo (topo)
function ResumoCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#fff",
        borderRadius: 13,
        padding: "8px 18px",
        fontWeight: 900,
        color: "#023047",
        border: `2px solid ${color}22`,
        fontSize: 16,
        boxShadow: "0 2px 12px #0001",
      }}
    >
      <span style={{ color, fontWeight: 800, fontSize: 19 }}>{value}</span>
      <span style={{ color: "#697A8B", fontWeight: 700, marginLeft: 6 }}>
        {label}
      </span>
    </div>
  );
}

export default withRoleProtection(AdminLeadsPage, { allowed: ["admin"] });

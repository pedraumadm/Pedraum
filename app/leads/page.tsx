"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Inbox, CheckCircle, Loader, Users, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Lead = {
  id: string;
  machineNome: string;
  nome: string;
  email: string;
  telefone: string;
  statusPagamento: "pendente" | "pago";
  status: string;
  createdAt: any;
  valorLead: number;
  paymentLink?: string;
};

export default function LeadsPage() {
  const [tab, setTab] = useState<"disponiveis" | "meus">("disponiveis");
  const [userId, setUserId] = useState<string | null>(null);
  const [leadsDisponiveis, setLeadsDisponiveis] = useState<Lead[]>([]);
  const [meusLeads, setMeusLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega o usuário logado
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // Carrega leads pendentes e pagos
  useEffect(() => {
    async function fetchLeads() {
      if (!userId) return;
      setLoading(true);

      // Disponíveis (pendentes)
      const qPendentes = query(
        collection(db, "leads"),
        where("vendedorId", "==", userId),
        where("statusPagamento", "==", "pendente"),
        orderBy("createdAt", "desc"),
      );
      const snapPendentes = await getDocs(qPendentes);
      const disponiveis: Lead[] = [];
      snapPendentes.forEach((doc) =>
        disponiveis.push({ id: doc.id, ...doc.data() } as Lead),
      );

      // Meus Leads (pagos)
      const qPagos = query(
        collection(db, "leads"),
        where("vendedorId", "==", userId),
        where("statusPagamento", "==", "pago"),
        orderBy("createdAt", "desc"),
      );
      const snapPagos = await getDocs(qPagos);
      const pagos: Lead[] = [];
      snapPagos.forEach((doc) =>
        pagos.push({ id: doc.id, ...doc.data() } as Lead),
      );

      setLeadsDisponiveis(disponiveis);
      setMeusLeads(pagos);
      setLoading(false);
    }
    fetchLeads();
  }, [userId]);

  return (
    <section
      style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <Link
        href="/painel-vendedor"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <ChevronLeft size={19} /> Voltar ao Painel
      </Link>
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.1px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 13,
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "7px 30px",
            background: "#f3f6fa",
            color: "#023047",
            borderRadius: "12px",
            boxShadow: "0 2px 12px #0001",
            fontWeight: 800,
            fontSize: "2rem",
          }}
        >
          Leads
        </span>
        <Inbox size={34} color="#FB8500" />
      </h1>
      <div className="text-[#5B6476] mb-7" style={{ fontSize: 18 }}>
        Gerencie aqui seus <b>leads recebidos</b> na plataforma: libere contatos
        de potenciais compradores e acesse seu histórico.
      </div>

      {/* Tabs com contadores */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 30,
          borderBottom: "1.7px solid #e5e7eb",
          position: "relative",
          width: "100%",
          maxWidth: 520,
        }}
      >
        <button
          className={`px-7 py-3 font-bold rounded-t-xl transition flex items-center gap-2
            ${
              tab === "disponiveis"
                ? "bg-[#FB8500] text-white shadow"
                : "bg-[#f3f6fa] text-[#023047] hover:bg-[#ffe5bb]"
            } `}
          style={{
            border: "none",
            outline: "none",
            fontSize: 17,
            cursor: "pointer",
            borderTopLeftRadius: 13,
            borderTopRightRadius: 13,
            marginRight: 8,
          }}
          onClick={() => setTab("disponiveis")}
        >
          <Users size={19} />
          Leads Disponíveis
          <span
            style={{
              marginLeft: 7,
              fontWeight: 700,
              color: "#fff",
              background: "#FB8500",
              borderRadius: "10px",
              padding: "2px 10px",
              fontSize: 16,
              opacity: tab === "disponiveis" ? 1 : 0.55,
              border: tab === "disponiveis" ? "2px solid #fff" : "none",
              transition: "opacity .22s",
            }}
          >
            {leadsDisponiveis.length}
          </span>
        </button>
        <button
          className={`px-7 py-3 font-bold rounded-t-xl transition flex items-center gap-2
            ${
              tab === "meus"
                ? "bg-[#2563eb] text-white shadow"
                : "bg-[#f3f6fa] text-[#023047] hover:bg-[#dbeafe]"
            } `}
          style={{
            border: "none",
            outline: "none",
            fontSize: 17,
            cursor: "pointer",
            borderTopLeftRadius: 13,
            borderTopRightRadius: 13,
          }}
          onClick={() => setTab("meus")}
        >
          <CheckCircle size={18} />
          Meus Leads
          <span
            style={{
              marginLeft: 7,
              fontWeight: 700,
              color: "#fff",
              background: "#2563eb",
              borderRadius: "10px",
              padding: "2px 10px",
              fontSize: 16,
              opacity: tab === "meus" ? 1 : 0.55,
              border: tab === "meus" ? "2px solid #fff" : "none",
              transition: "opacity .22s",
            }}
          >
            {meusLeads.length}
          </span>
        </button>
      </div>

      {/* Conteúdo das tabs */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin mr-2" size={28} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>
            Carregando leads...
          </span>
        </div>
      ) : tab === "disponiveis" ? (
        <LeadsDisponiveisList leads={leadsDisponiveis} />
      ) : (
        <MeusLeadsList leads={meusLeads} />
      )}
    </section>
  );
}

// Lista de leads pendentes (disponíveis para liberar/pagar)
function LeadsDisponiveisList({ leads }: { leads: Lead[] }) {
  return leads.length === 0 ? (
    <div className="text-[#6b7680] text-center py-8">
      Nenhum lead disponível no momento.
    </div>
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 32,
      }}
    >
      {leads.map((lead) => (
        <div
          key={lead.id}
          style={{
            borderRadius: 16,
            boxShadow: "0 2px 20px #0001",
            background: "#fff",
            border: "1.6px solid #f2f3f7",
            padding: "28px 26px 18px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 180,
            position: "relative",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: "#023047",
              marginBottom: 3,
            }}
          >
            {lead.machineNome}
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#FB8500",
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            Valor do lead: R${lead.valorLead?.toFixed(2) || "0.00"}
          </div>
          <div style={{ fontSize: 15, color: "#5B6476", marginBottom: 8 }}>
            {lead.createdAt?.seconds
              ? new Date(lead.createdAt.seconds * 1000).toLocaleString("pt-BR")
              : "---"}
          </div>
          <div>
            <a
              href={lead.paymentLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#FB8500] text-white font-bold rounded-lg px-7 py-2 shadow-md hover:opacity-90 transition text-center inline-block"
              style={{ fontSize: 16, textDecoration: "none" }}
            >
              Liberar contato do lead
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// Lista de leads já liberados/pagos
function MeusLeadsList({ leads }: { leads: Lead[] }) {
  return leads.length === 0 ? (
    <div className="text-[#6b7680] text-center py-8">
      Você ainda não adquiriu nenhum lead.
    </div>
  ) : (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 32,
      }}
    >
      {leads.map((lead) => (
        <div
          key={lead.id}
          style={{
            borderRadius: 16,
            boxShadow: "0 2px 20px #0001",
            background: "#fff",
            border: "1.6px solid #f2f3f7",
            padding: "28px 26px 18px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 180,
            position: "relative",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: "#023047",
              marginBottom: 3,
            }}
          >
            {lead.machineNome}
          </div>
          <div
            style={{
              fontSize: 16,
              color: "#18B56D",
              fontWeight: 700,
              marginBottom: 5,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            Lead liberado <CheckCircle size={16} style={{ marginBottom: -2 }} />
          </div>
          <div style={{ fontSize: 15, color: "#5B6476", marginBottom: 8 }}>
            {lead.createdAt?.seconds
              ? new Date(lead.createdAt.seconds * 1000).toLocaleString("pt-BR")
              : "---"}
          </div>
          <div
            style={{
              fontSize: 15,
              color: "#023047",
              fontWeight: 600,
              marginBottom: 2,
            }}
          >
            Nome: {lead.nome}
          </div>
          <div style={{ fontSize: 15, color: "#023047", fontWeight: 600 }}>
            Telefone: {lead.telefone}
          </div>
          <div style={{ fontSize: 15, color: "#023047" }}>
            Email: {lead.email}
          </div>
        </div>
      ))}
    </div>
  );
}

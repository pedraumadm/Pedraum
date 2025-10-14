"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { Plus, Wrench, Loader2 } from "lucide-react";

interface Service {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  preco?: string;
  prestador?: string;
  estado?: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    setLoading(true);
    const q = query(collection(db, "services"), orderBy("titulo", "asc"));
    const snapshot = await getDocs(q);
    setServices(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Service),
    );
    setLoading(false);
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "48px 18px 70px 18px",
        minHeight: "100vh",
        background: "#f7fafc",
      }}
    >
      {/* Topo: título e botão */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 38,
        }}
      >
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 900,
            color: "#023047",
            display: "flex",
            alignItems: "center",
            gap: 12,
            letterSpacing: "-1.2px",
          }}
        >
          <Wrench size={34} style={{ color: "#FB8500", marginBottom: -2 }} />
          Serviços Disponíveis
        </h1>
        <Link
          href="/create-service"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "13px 30px",
            borderRadius: 16,
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.13rem",
            boxShadow: "0 4px 18px #0001",
            textDecoration: "none",
            letterSpacing: ".01em",
            border: "none",
            outline: "none",
            transition: "background .14s, transform .13s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#e17000")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#FB8500")}
        >
          <Plus size={22} /> Novo Serviço
        </Link>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 260,
            color: "#023047",
            fontSize: "1.2rem",
          }}
        >
          <Loader2 className="animate-spin" style={{ marginRight: 9 }} />{" "}
          Carregando...
        </div>
      ) : services.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#8a8f99",
            padding: "80px 0",
            fontSize: "1.19rem",
          }}
        >
          Nenhum serviço cadastrado ainda.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "34px",
            marginTop: 16,
          }}
        >
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                background: "#fff",
                borderRadius: 18,
                boxShadow: "0 6px 30px #0001",
                border: "1.3px solid #f2f2f2",
                display: "flex",
                flexDirection: "column",
                padding: "32px 28px 23px 28px",
                minHeight: 190,
                justifyContent: "space-between",
                position: "relative",
                transition: "box-shadow .15s, border .13s",
              }}
            >
              {/* Header do card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 14,
                  gap: 15,
                }}
              >
                <div
                  style={{
                    width: 53,
                    height: 53,
                    borderRadius: 14,
                    background: "#FFEDD5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wrench size={27} style={{ color: "#FB8500" }} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "1.19rem",
                      color: "#023047",
                      marginBottom: 3,
                      lineHeight: "1.13em",
                    }}
                  >
                    {service.titulo}
                  </div>
                  {service.categoria && (
                    <span
                      style={{
                        background: "#FFEDD5",
                        color: "#E17000",
                        fontWeight: 600,
                        fontSize: 13,
                        padding: "1.5px 9px",
                        borderRadius: 7,
                        marginLeft: 0,
                      }}
                    >
                      {service.categoria}
                    </span>
                  )}
                </div>
              </div>
              {/* Descrição */}
              <div
                style={{
                  fontSize: "1.04rem",
                  color: "#3f4252",
                  marginBottom: 11,
                  minHeight: 32,
                  opacity: 0.96,
                  fontWeight: 500,
                }}
              >
                {service.descricao}
              </div>
              {/* Linha de infos */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  marginBottom: 13,
                  flexWrap: "wrap",
                  fontSize: 15,
                }}
              >
                {service.prestador && (
                  <span style={{ color: "#219EBC", fontWeight: 600 }}>
                    {service.prestador}
                  </span>
                )}
                {service.estado && (
                  <span style={{ color: "#888" }}>{service.estado}</span>
                )}
                {service.preco && (
                  <span style={{ color: "#FB8500", fontWeight: 700 }}>
                    R$ {service.preco}
                  </span>
                )}
              </div>
              {/* Botão */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Link
                  href={`/services/${service.id}`}
                  style={{
                    background: "#219EBC",
                    color: "#fff",
                    padding: "11px 22px",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: "1.08rem",
                    boxShadow: "0 2px 10px #219EBC22",
                    textDecoration: "none",
                    transition: "background .13s, transform .11s",
                    border: "none",
                    outline: "none",
                    letterSpacing: ".01em",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#176684")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "#219EBC")
                  }
                >
                  Ver Detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

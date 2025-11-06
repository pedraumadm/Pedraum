"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Loader, Edit, PlusCircle, ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";

type Servico = {
  id: string;
  nome: string;
  descricao?: string;
  status?: string;
  imagem?: string;
  createdAt?: any;
};

export default function MeusServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  async function fetchServicos() {
    if (!userId) return;
    setLoading(true);
    const q = query(collection(db, "services"), where("vendedorId", "==", userId));
    const querySnapshot = await getDocs(q);
    const data: Servico[] = [];
    querySnapshot.forEach((d) => data.push({ id: d.id, ...(d.data() as any) }));
    // mais recente primeiro
    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setServicos(data);
    setLoading(false);
  }

  useEffect(() => {
    if (userId) fetchServicos();
  }, [userId]);

  async function handleDelete(id: string, nome?: string) {
    const ok = confirm(`Confirmar exclusão do serviço "${nome || id}"?`);
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "services", id));
      // otimista: remove da UI
      setServicos((prev) => prev.filter((s) => s.id !== id));
      alert("Serviço excluído com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir serviço:", err);
      alert("Não foi possível excluir. Tente novamente.");
    }
  }

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}>
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 34,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: "2.2rem",
            fontWeight: 900,
            color: "#023047",
            letterSpacing: "-1.1px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: 0,
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
            Meus Serviços
          </span>
        </h1>

        <Link
          href="/create-service"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            borderRadius: 14,
            padding: "12px 28px",
            boxShadow: "0 2px 12px #0001",
            gap: 10,
            textDecoration: "none",
            transition: "background .18s",
          }}
        >
          <PlusCircle size={21} /> Novo Serviço
        </Link>
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 0",
            gap: 10,
          }}
        >
          <Loader className="animate-spin" size={26} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>
            Carregando serviços...
          </span>
        </div>
      ) : servicos.length === 0 ? (
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
            style={{ width: 90, opacity: 0.68, marginBottom: 18 }}
          />
          <p style={{ color: "#5B6476", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            Você ainda não cadastrou serviços.
          </p>
          <Link
            href="/create-service"
            style={{
              marginTop: 7,
              padding: "12px 32px",
              borderRadius: "11px",
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
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 32,
          }}
        >
          {servicos.map((serv) => (
            <div
              key={serv.id}
              style={{
                borderRadius: 16,
                boxShadow: "0 2px 20px #0001",
                background: "#fff",
                border: "1.6px solid #f2f3f7",
                padding: "26px 22px 20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 160,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 5 }}>
                {serv.imagem ? (
                  <img
                    src={serv.imagem}
                    alt={serv.nome}
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
                      fontSize: 30,
                      fontWeight: 800,
                      color: "#FB8500",
                      border: "1.2px solid #f2f3f7",
                    }}
                  >
                    🛠️
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.17rem", color: "#023047" }}>
                    {serv.nome}
                  </div>
                  <div style={{ color: "#219ebc", fontWeight: 600, fontSize: 15, marginTop: 2 }}>
                    {serv.status || "—"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  color: "#525252",
                  fontSize: "1rem",
                  marginBottom: 3,
                  minHeight: 44,
                  maxHeight: 65,
                  overflow: "hidden",
                }}
              >
                {serv.descricao || <span style={{ color: "#A0A0A0" }}>Sem descrição.</span>}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 13,
                  marginTop: 7,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={`/edit-service/${serv.id}`}
                  style={{
                    color: "#2563eb",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    textDecoration: "none",
                  }}
                >
                  <Edit size={18} /> Editar
                </Link>

                <button
                  onClick={() => handleDelete(serv.id, serv.nome)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#dc2626",
                    fontWeight: 800,
                    background: "none",
                    border: "1px solid #fee2e2",
                    padding: "6px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                  title="Excluir serviço"
                >
                  <Trash2 size={18} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

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
import Link from "next/link";
import {
  ClipboardList,
  Loader,
  Lightbulb,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
} from "lucide-react";

type Demanda = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status?: string;
  createdAt?: any;
  cidade?: string;
  estado?: string;
};

export default function MinhasDemandasPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [notLogged, setNotLogged] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u && u.uid) {
        setUserId(u.uid);
        setNotLogged(false);
      } else {
        setUserId(null);
        setNotLogged(true);
        setDemandas([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) fetchDemandas(userId);
    // eslint-disable-next-line
  }, [userId]);

  async function fetchDemandas(uid: string) {
    setLoading(true);
    try {
      const q = query(collection(db, "demandas"), where("userId", "==", uid));
      const snap = await getDocs(q);
      let list: Demanda[] = [];
      snap.forEach((docu) => {
        list.push({ id: docu.id, ...docu.data() } as Demanda);
      });
      // Ordenar por data de criação se existir
      list = list.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.seconds - a.createdAt.seconds;
        }
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return 0;
      });
      setDemandas(list);
    } catch {
      setDemandas([]);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!userId) return;
    if (window.confirm("Tem certeza que deseja excluir esta demanda?")) {
      setDeleting(id);
      await deleteDoc(doc(db, "demandas", id));
      await fetchDemandas(userId);
      setDeleting(null);
    }
  }

  return (
    <section
      style={{ maxWidth: 1200, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 32,
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
          <ClipboardList size={31} style={{ color: "#219ebc" }} /> Minhas
          Necessidades
        </h1>
        <Link
          href="/create-demanda"
          style={{
            background: "#FB8500",
            color: "#fff",
            fontWeight: 800,
            fontSize: 19,
            borderRadius: 13,
            padding: "12px 30px",
            marginLeft: 8,
            boxShadow: "0 2px 12px #0001",
            transition: "background .19s",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          + Cadastrar Demanda
        </Link>
      </div>

      {notLogged ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "64px 0",
          }}
        >
          <Lightbulb style={{ marginBottom: 8, color: "#FB8500" }} size={44} />
          <p
            style={{
              color: "#FB8500",
              fontWeight: 700,
              fontSize: 22,
              marginBottom: 20,
            }}
          >
            Faça login para ver suas Demandas.
          </p>
          <Link
            href="/auth/login"
            style={{
              padding: "14px 36px",
              borderRadius: "13px",
              background: "#FB8500",
              color: "#fff",
              fontWeight: 800,
              fontSize: 19,
              boxShadow: "0 2px 14px #0001",
              transition: "background .2s",
            }}
          >
            Fazer login
          </Link>
        </div>
      ) : loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 0",
          }}
        >
          <Loader className="animate-spin mr-2" size={28} color="#219EBC" />
          <span style={{ fontSize: 21, fontWeight: 700, color: "#219EBC" }}>
            Carregando necessidades...
          </span>
        </div>
      ) : demandas.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "60px 0",
          }}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/4076/4076549.png"
            alt="Sem demandas"
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
            Você ainda não cadastrou nenhuma necessidade.
          </p>
          <Link
            href="/create-demanda"
            style={{
              marginTop: 4,
              padding: "12px 32px",
              borderRadius: "11px",
              background: "#219ebc",
              color: "#fff",
              fontWeight: 800,
              fontSize: 17,
              boxShadow: "0 2px 10px #0001",
              transition: "background .2s",
            }}
          >
            Nova Demanda
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(370px, 1fr))",
            gap: 30,
          }}
        >
          {demandas.map((demanda) => (
            <div
              key={demanda.id}
              style={{
                borderRadius: 16,
                boxShadow: "0 2px 20px #0001",
                background: "#fff",
                border: "1.6px solid #f2f3f7",
                padding: "28px 26px 18px 26px",
                marginBottom: 2,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 185,
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: "1.14rem",
                    fontWeight: 700,
                    color: "#023047",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      background: "#F1F5F9",
                      borderRadius: 7,
                      color: "#FB8500",
                      fontWeight: 800,
                      padding: "3px 15px",
                      fontSize: 16,
                      marginRight: 8,
                      border: "1px solid #ffe5bb",
                    }}
                  >
                    {demanda.categoria || "Categoria"}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: "#219ebc",
                      fontSize: 17,
                      marginLeft: 2,
                    }}
                  >
                    {demanda.titulo}
                  </span>
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "0.97rem",
                    borderRadius: 10,
                    padding: "7px 15px",
                    background: "#F2F6F9",
                    color: "#219ebc",
                    border: "1.5px solid #d2e7ef",
                  }}
                >
                  {demanda.status || "Aberta"}
                </span>
              </div>
              <div
                style={{
                  color: "#667085",
                  fontSize: "1rem",
                  marginBottom: 7,
                  minHeight: 30,
                }}
              >
                {demanda.descricao}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <Link
                  href={`/edit-demanda/${demanda.id}`}
                  style={{
                    background: "#e3f2fd",
                    color: "#2563eb",
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: "7px 17px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    border: "1.4px solid #2563eb25",
                  }}
                >
                  <Edit size={17} /> Editar
                </Link>
                <button
                  onClick={() => handleDelete(demanda.id)}
                  disabled={deleting === demanda.id}
                  style={{
                    background: "#fff6f3",
                    color: "#e63946",
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: "7px 17px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    border: "1.4px solid #e6394624",
                    cursor: deleting === demanda.id ? "not-allowed" : "pointer",
                    opacity: deleting === demanda.id ? 0.5 : 1,
                  }}
                >
                  <Trash2 size={17} />
                  {deleting === demanda.id ? "Excluindo..." : "Excluir"}
                </button>
                <Link
                  href={`/demandas/${demanda.id}`}
                  style={{
                    background: "#f7fafc",
                    color: "#FB8500",
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: "7px 17px",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    border: "1.4px solid #FB850022",
                  }}
                >
                  <Eye size={17} /> Ver
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

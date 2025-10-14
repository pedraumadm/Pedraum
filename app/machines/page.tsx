"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { ExternalLink } from "lucide-react";

// Função utilitária para pegar a imagem da máquina (string ou array)
const getMachineImage = (m: any) => {
  if (Array.isArray(m.imagem)) return m.imagem[0];
  if (Array.isArray(m.imagens)) return m.imagens[0];
  return m.imagem || m.imagens || "/machines/placeholder.jpg";
};

type Machine = {
  id: string;
  nome: string;
  imagem?: string | string[];
  imagens?: string[];
  preco: number;
  localizacao?: string;
  status?: string;
  descricao?: string;
};

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMachines() {
      const snap = await getDocs(collection(db, "machines"));
      const arr: Machine[] = [];
      snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() } as Machine));
      setMachines(arr);
      setLoading(false);
    }
    fetchMachines();
  }, []);

  return (
    <section
      style={{ maxWidth: 1380, margin: "0 auto", padding: "44px 4vw 54px 4vw" }}
    >
      <h1
        style={{
          fontSize: "2.3rem",
          fontWeight: 900,
          color: "#023047",
          letterSpacing: "-1.2px",
          marginBottom: 38,
        }}
      >
        Máquinas Disponíveis
      </h1>
      <div style={{ marginBottom: 30 }}>
        <Link
          href="/create-machine"
          className="bg-[#FB8500] text-white font-bold rounded-xl px-6 py-3 shadow-md hover:opacity-90 transition"
        >
          + Nova Máquina
        </Link>
      </div>
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 180,
            fontSize: 22,
            fontWeight: 700,
            color: "#219ebc",
          }}
        >
          Carregando máquinas...
        </div>
      ) : machines.length === 0 ? (
        <div
          style={{
            background: "#fff",
            padding: 50,
            borderRadius: 16,
            boxShadow: "0 4px 20px #0001",
            textAlign: "center",
            color: "#495668",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Nenhuma máquina cadastrada.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
            gap: "38px",
          }}
        >
          {machines.map((m) => (
            <div
              key={m.id}
              style={{
                borderRadius: 22,
                boxShadow: "0 4px 32px #0001",
                background: "#fff",
                border: "1.6px solid #f2f3f7",
                padding: "0 0 18px 0",
                display: "flex",
                flexDirection: "column",
                minHeight: 360,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 190,
                  borderTopLeftRadius: 22,
                  borderTopRightRadius: 22,
                  overflow: "hidden",
                  borderBottom: "1.5px solid #f4f4f4",
                  background: "#f7fafd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={getMachineImage(m) || "/machines/placeholder.jpg"}
                  alt={m.nome}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderTopLeftRadius: 22,
                    borderTopRightRadius: 22,
                    background: "#f3f7fa",
                  }}
                  draggable={false}
                />
              </div>
              <div
                style={{
                  padding: "18px 22px 10px 22px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: "1.18rem",
                    fontWeight: 700,
                    color: "#023047",
                    marginBottom: 8,
                    minHeight: 38,
                    textTransform: "capitalize",
                  }}
                >
                  {m.nome}
                </div>
                <div
                  style={{
                    color: "#FB8500",
                    fontWeight: 900,
                    fontSize: 23,
                    marginBottom: 7,
                  }}
                >
                  R$ {Number(m.preco).toLocaleString("pt-BR")}
                </div>
                <div
                  style={{ color: "#8c9199", fontSize: 15, marginBottom: 8 }}
                >
                  {m.localizacao || "Localização não informada"}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 5,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={`/machines/${m.id}`}
                    className="text-[#FB8500] font-bold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={18} /> Ver detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

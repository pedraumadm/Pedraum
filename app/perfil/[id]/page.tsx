"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Loader, User, ChevronLeft } from "lucide-react";
import Link from "next/link";

type Perfil = {
  nome: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  bio?: string;
  avatar?: string; // url
  tipo?: string;
};

export default function PerfilPublicoPage() {
  const { id } = useParams<{ id: string }>();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerfil() {
      if (!id) return;
      setLoading(true);
      const snap = await getDoc(doc(db, "usuarios", id));
      if (snap.exists()) {
        setPerfil(snap.data() as Perfil);
      } else {
        setPerfil(null);
      }
      setLoading(false);
    }
    fetchPerfil();
  }, [id]);

  return (
    <section
      style={{ maxWidth: 620, margin: "0 auto", padding: "42px 4vw 60px 4vw" }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        <ChevronLeft size={19} /> Voltar para o início
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
          marginBottom: 38,
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
          Perfil Público
        </span>
      </h1>
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 0",
          }}
        >
          <Loader className="animate-spin mr-2" size={26} color="#219EBC" />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#219EBC" }}>
            Carregando...
          </span>
        </div>
      ) : !perfil ? (
        <div
          style={{
            textAlign: "center",
            color: "#e85d04",
            fontWeight: 700,
            fontSize: 22,
            marginTop: 40,
          }}
        >
          Perfil não encontrado.
        </div>
      ) : (
        <div className="w-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            {perfil.avatar ? (
              <img
                src={perfil.avatar}
                alt="Foto de perfil"
                className="rounded-full border-2 border-orange-200 shadow-md"
                style={{ width: 100, height: 100, objectFit: "cover" }}
                draggable={false}
              />
            ) : (
              <User
                size={72}
                className="text-[#FB8500] bg-[#f3f6fa] rounded-full p-4"
              />
            )}
          </div>
          {/* Nome/tipo */}
          <div className="font-bold text-2xl text-[#023047]">{perfil.nome}</div>
          {perfil.tipo && (
            <div className="text-[#2563eb] font-semibold text-base">
              {perfil.tipo}
            </div>
          )}

          {/* Localização */}
          {(perfil.cidade || perfil.estado) && (
            <div className="text-[#767676] font-medium text-base">
              {(perfil.cidade || "") +
                (perfil.cidade && perfil.estado ? ", " : "") +
                (perfil.estado || "")}
            </div>
          )}

          {/* Bio */}
          {perfil.bio && (
            <div className="w-full bg-[#f6f9fa] rounded-xl p-4 mt-2 text-center text-base text-[#023047]">
              {perfil.bio}
            </div>
          )}

          {/* Contato (opcional) */}
          {perfil.telefone && (
            <div className="w-full flex flex-col items-center gap-1 mt-4">
              <span className="text-[#023047] font-bold">Contato:</span>
              <a
                href={`tel:${perfil.telefone}`}
                style={{
                  color: "#FB8500",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  textDecoration: "none",
                }}
              >
                {perfil.telefone}
              </a>
            </div>
          )}
        </div>
      )}
      {/* Responsivo */}
      <style>{`
        @media (max-width: 650px) {
          h1 span { font-size: 1.16rem !important; padding: 7px 10px !important; }
          .rounded-2xl { border-radius: 0.95rem !important; }
          .p-8 { padding: 1.2rem !important; }
        }
      `}</style>
    </section>
  );
}

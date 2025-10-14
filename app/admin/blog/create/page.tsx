"use client";
import { useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import { Loader2 } from "lucide-react";

export default function BlogCreatePage() {
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [imagens, setImagens] = useState<string[]>([]); // agora recebe array!
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo || !resumo || !conteudo || imagens.length === 0) {
      alert(
        "Preencha todos os campos obrigatórios e envie ao menos uma imagem!",
      );
      return;
    }
    setLoading(true);
    await addDoc(collection(db, "blog"), {
      titulo,
      resumo,
      imagens, // salva array de imagens!
      conteudo,
      data: new Date().toLocaleDateString("pt-BR"),
      criadoEm: serverTimestamp(),
    });
    setLoading(false);
    router.push("/admin/blog");
  }

  return (
    <main
      style={{ minHeight: "100vh", background: "#f9fafb", padding: "40px 0" }}
    >
      <div
        style={{
          maxWidth: 580,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 2px 32px #0001",
          padding: "36px 26px 32px 26px",
          minHeight: 440,
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
          Criar Novo Post
        </h1>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Título *</label>
          <input
            type="text"
            style={inputStyle}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do post"
            maxLength={90}
            required
          />
          <label style={labelStyle}>Resumo *</label>
          <input
            type="text"
            style={inputStyle}
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Resumo do post"
            maxLength={160}
            required
          />
          <label style={labelStyle}>Imagens *</label>
          <div style={{ margin: "8px 0 18px 0" }}>
            <ImageUploader imagens={imagens} setImagens={setImagens} />
          </div>
          <label style={labelStyle}>Conteúdo *</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 110,
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: "1.03rem",
            }}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Conteúdo completo"
            required
          />
          <button
            type="submit"
            disabled={loading || imagens.length === 0}
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
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 18px #0001",
              letterSpacing: ".01em",
              transition: "background .15s, transform .13s",
            }}
          >
            {loading ? (
              <Loader2
                className="animate-spin"
                size={20}
                style={{ marginRight: 8, marginBottom: -4 }}
              />
            ) : null}
            {loading ? "Publicando..." : "Publicar"}
          </button>
        </form>
        <div style={{ textAlign: "center" }}>
          <a
            href="/admin/blog"
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
      <style>{`
        @media (max-width: 750px) {
          main > div {
            max-width: 99vw !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 14px 0 22px 0 !important;
          }
        }
      `}</style>
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

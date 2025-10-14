"use client";
import { useEffect, useState, ChangeEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadImageToStorage } from "@/utils/uploadImage"; // helper acima
import Link from "next/link";

export default function EditarMaquinaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Campos
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    async function fetchMaquina() {
      setLoading(true);
      try {
        const docRef = doc(db, "machines", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNome(data.nome || "");
          setDescricao(data.descricao || "");
          setValor(data.valor ? String(data.valor) : "");
          setStatus(data.status || "");
          setImgUrl(data.imgUrl || "");
        } else {
          setError("Máquina não encontrada.");
        }
      } catch (err) {
        setError("Erro ao buscar dados da máquina.");
      }
      setLoading(false);
    }
    if (id) fetchMaquina();
  }, [id]);

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    let imageUrl = imgUrl;
    // Se o admin enviou uma nova imagem, faz upload e pega nova URL
    if (newImageFile) {
      try {
        imageUrl = await uploadImageToStorage(newImageFile, id);
      } catch (err) {
        setError("Erro ao fazer upload da imagem.");
        setSaving(false);
        return;
      }
    }

    try {
      const docRef = doc(db, "machines", id);
      await updateDoc(docRef, {
        nome,
        descricao,
        valor: parseFloat(valor),
        status,
        imgUrl: imageUrl,
        atualizadoEm: new Date(),
      });
      setSuccess(true);
      setTimeout(() => router.push("/admin/machines"), 1300);
    } catch (err) {
      setError("Erro ao salvar alterações.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <main style={{ padding: "60px 0", textAlign: "center" }}>
        <span style={{ color: "#023047", fontSize: 18 }}>
          Carregando dados...
        </span>
      </main>
    );
  }

  if (error) {
    return (
      <main style={{ padding: "60px 0", textAlign: "center" }}>
        <span style={{ color: "#d90429", fontSize: 18 }}>{error}</span>
        <div style={{ marginTop: 18 }}>
          <Link
            href="/admin/machines"
            style={{ color: "#2563eb", fontWeight: 600 }}
          >
            Voltar para listagem
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "36px 0",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 6px 36px #0002",
          padding: "36px 32px",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          border: "1.5px solid #e0e7ef",
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            fontSize: 26,
            color: "#023047",
            marginBottom: 22,
            textAlign: "center",
          }}
        >
          Editar Máquina
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <label style={labelStyle}>Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: 70,
              fontFamily: "inherit",
            }}
          />

          <label style={labelStyle}>Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            style={inputStyle}
          />

          <label style={labelStyle}>Status</label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Imagem</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ marginBottom: 8 }}
          />
          {/* Preview da imagem nova ou atual */}
          {(imagePreview || imgUrl) && (
            <img
              src={imagePreview || imgUrl}
              alt="Imagem máquina"
              style={{
                width: "100%",
                maxHeight: 170,
                objectFit: "cover",
                borderRadius: 12,
                border: "1px solid #eee",
              }}
            />
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 16,
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.08rem",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              transition: ".15s",
              boxShadow: "0 2px 14px #02304722",
            }}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          {success && (
            <div
              style={{
                color: "#16a34a",
                fontWeight: 600,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Alterações salvas com sucesso!
            </div>
          )}
          {error && (
            <div
              style={{
                color: "#d90429",
                fontWeight: 600,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}
        </form>
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <Link
            href="/admin/machines"
            style={{
              color: "#2563eb",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "underline",
            }}
          >
            ← Voltar para listagem
          </Link>
        </div>
      </div>
    </main>
  );
}

// Estilos reutilizáveis
const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: "#023047",
  fontSize: "1.01rem",
  marginBottom: 2,
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #e0e7ef",
  borderRadius: 10,
  fontSize: "1.04rem",
  padding: "11px 13px",
  marginBottom: 6,
  outline: "none",
  fontWeight: 500,
  color: "#023047",
  background: "#f9fafb",
  transition: "border .13s",
};

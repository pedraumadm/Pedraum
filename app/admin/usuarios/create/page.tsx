"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { Loader, ArrowLeft, Save, Key, Eye, EyeOff, Copy } from "lucide-react";
import Link from "next/link";

type Usuario = {
  nome: string;
  email: string;
  senha: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
  cpfCnpj?: string;
  tipo?: "admin" | "usuario";
  status?: "Ativo" | "Inativo" | "Bloqueado";
};

export default function CreateUsuarioPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario>({
    nome: "",
    email: "",
    senha: "",
    whatsapp: "",
    cidade: "",
    estado: "",
    cpfCnpj: "",
    tipo: "usuario",
    status: "Ativo",
  });

  const [salvando, setSalvando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handleInput(e: any) {
    const { name, value } = e.target;
    setUsuario((u) => ({ ...u, [name]: value }));
  }

  function gerarSenhaAleatoria(tamanho = 8) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%$!";
    let senha = "";
    for (let i = 0; i < tamanho; i++)
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    setUsuario((u) => ({ ...u, senha }));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setFeedback({ type: "success", message: "Senha copiada!" });
    setTimeout(() => setFeedback(null), 1600);
  }

  async function handleSave(e: any) {
    e.preventDefault();
    setFeedback(null);
    if (!usuario.nome || !usuario.email || !usuario.senha) {
      setFeedback({
        type: "error",
        message: "Preencha todos os campos obrigatórios.",
      });
      return;
    }
    if (usuario.senha.length < 6) {
      setFeedback({
        type: "error",
        message: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }
    setSalvando(true);

    try {
      // Checa se já existe usuário com mesmo email
      const q = query(
        collection(db, "usuarios"),
        where("email", "==", usuario.email),
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setFeedback({
          type: "error",
          message: "Já existe um usuário com esse e-mail.",
        });
        setSalvando(false);
        return;
      }

      // Cria o usuário na coleção 'usuarios'
      const novoUsuario: any = {
        ...usuario,
        createdAt: new Date(),
        lastLogin: null,
      };

      // Cria documento com ID automático (padrão)
      await addDoc(collection(db, "usuarios"), novoUsuario);

      setFeedback({ type: "success", message: "Usuário criado com sucesso!" });
      setTimeout(() => router.push("/admin/usuarios"), 1200);
    } catch (e: any) {
      setFeedback({
        type: "error",
        message: "Erro ao criar usuário: " + e.message,
      });
      setSalvando(false);
    }
  }

  return (
    <section
      style={{ maxWidth: 540, margin: "0 auto", padding: "42px 2vw 60px 2vw" }}
    >
      <Link
        href="/admin/usuarios"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 16,
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={19} /> Voltar
      </Link>
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 2px 16px #0001",
          padding: "38px 32px",
          marginBottom: 30,
        }}
      >
        <h2
          style={{
            fontWeight: 900,
            fontSize: "2rem",
            color: "#023047",
            marginBottom: 15,
          }}
        >
          Novo Usuário
        </h2>

        <form onSubmit={handleSave} autoComplete="off">
          <label style={labelStyle}>Nome</label>
          <input
            type="text"
            name="nome"
            value={usuario.nome}
            onChange={handleInput}
            required
            style={inputStyle}
          />
          <label style={labelStyle}>E-mail</label>
          <input
            type="email"
            name="email"
            value={usuario.email}
            onChange={handleInput}
            required
            style={inputStyle}
          />

          {/* Senha */}
          <label style={labelStyle}>Senha</label>
          <div style={{ position: "relative", display: "flex", gap: 7 }}>
            <input
              type={senhaVisivel ? "text" : "password"}
              name="senha"
              value={usuario.senha}
              onChange={handleInput}
              required
              style={{ ...inputStyle, marginBottom: 0 }}
              minLength={6}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setSenhaVisivel((v) => !v)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                position: "absolute",
                right: 43,
                top: 13,
                color: "#a0a0a0",
                padding: 0,
              }}
              aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            >
              {senhaVisivel ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => gerarSenhaAleatoria()} // <-- Correção aqui!
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                position: "absolute",
                right: 18,
                top: 13,
                color: "#FB8500",
                padding: 0,
              }}
              aria-label="Gerar senha"
              title="Gerar senha segura"
            >
              <Key size={20} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                position: "absolute",
                right: -6,
                top: 13,
                color: "#2563eb",
                padding: 0,
              }}
              onClick={() => copyToClipboard(usuario.senha)}
              aria-label="Copiar senha"
            >
              <Copy size={19} />
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              marginTop: 2,
              marginBottom: 8,
            }}
          >
            A senha deve ter ao menos 6 caracteres.
          </div>

          {/* Demais campos */}
          <label style={labelStyle}>WhatsApp</label>
          <input
            type="text"
            name="whatsapp"
            value={usuario.whatsapp || ""}
            onChange={handleInput}
            placeholder="(99) 99999-9999"
            style={inputStyle}
          />
          <label style={labelStyle}>Cidade</label>
          <input
            type="text"
            name="cidade"
            value={usuario.cidade || ""}
            onChange={handleInput}
            style={inputStyle}
          />
          <label style={labelStyle}>Estado</label>
          <input
            type="text"
            name="estado"
            value={usuario.estado || ""}
            onChange={handleInput}
            style={inputStyle}
          />
          <label style={labelStyle}>CPF ou CNPJ</label>
          <input
            type="text"
            name="cpfCnpj"
            value={usuario.cpfCnpj || ""}
            onChange={handleInput}
            placeholder="Somente números"
            style={inputStyle}
          />
          <label style={labelStyle}>Tipo</label>
          <select
            name="tipo"
            value={usuario.tipo}
            onChange={handleInput}
            style={inputStyle}
          >
            <option value="usuario">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <label style={labelStyle}>Status</label>
          <select
            name="status"
            value={usuario.status}
            onChange={handleInput}
            style={inputStyle}
          >
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Bloqueado">Bloqueado</option>
          </select>

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                margin: "18px 0 6px 0",
                fontWeight: 700,
                color: feedback.type === "success" ? "#059669" : "#d90429",
              }}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            style={{
              marginTop: 18,
              width: "100%",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 900,
              fontSize: "1.15rem",
              padding: "13px 0",
              borderRadius: 13,
              border: "none",
              boxShadow: "0 2px 14px #0001",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {salvando && <Loader className="animate-spin" size={20} />}{" "}
            <Save size={21} /> {salvando ? "Salvando..." : "Salvar Usuário"}
          </button>
        </form>
      </div>
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
  color: "#2563eb",
  marginBottom: 7,
  marginTop: 18,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "12px 13px",
  borderRadius: 9,
  border: "1.5px solid #e5e7eb",
  fontSize: 16,
  color: "#023047",
  background: "#f8fafc",
  fontWeight: 600,
  outline: "none",
  marginBottom: 3,
};

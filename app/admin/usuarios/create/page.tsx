// app/admin/usuarios/create/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Loader,
  ArrowLeft,
  Save,
  Key,
  Eye,
  EyeOff,
  Copy,
  Phone,
  Mail,
  Shield,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/* ============ Utils WhatsApp/validações (idênticos ao cadastro público) ============ */
function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}
function ensurePlus55Prefix(v: string) {
  if (!v.startsWith("+55")) return `+55 ${v.replace(/^\+*/, "").trimStart()}`;
  if (v === "+55") return "+55 ";
  if (v.startsWith("+55") && v.length === 3) return "+55 ";
  return v;
}
function formatWhatsappBRIntl(v: string) {
  v = ensurePlus55Prefix(v);
  const digits = onlyDigits(v).slice(0, 13);
  const rest = digits.startsWith("55") ? digits.slice(2) : digits;
  const ddd = rest.slice(0, 2);
  const num = rest.slice(2);
  let masked = "+55 ";
  if (ddd.length > 0) {
    masked += `(${ddd}${ddd.length === 2 ? ")" : ""}${ddd.length === 2 ? " " : ""}`;
  }
  if (num.length > 0) {
    if (num.length <= 4) masked += num;
    else if (num.length <= 8) masked += `${num.slice(0, 4)}-${num.slice(4)}`;
    else masked += `${num.slice(0, 5)}-${num.slice(5)}`;
  }
  return masked;
}
/** extrai SEM +, sempre iniciando por 55 e limitando 13 dígitos (55 + DDD + 8/9) */
function extractWhatsappDigits55FromMasked(masked: string) {
  const d = onlyDigits(masked);
  const with55 = d.startsWith("55") ? d : `55${d}`;
  return with55.slice(0, 13);
}
function isValidBRWhatsappDigits(digitsWith55: string) {
  if (!digitsWith55.startsWith("55")) return false;
  const total = digitsWith55.length;
  if (total !== 12 && total !== 13) return false;
  const ddd = digitsWith55.slice(2, 4);
  if (ddd.length !== 2) return false;
  const num = digitsWith55.slice(4);
  return num.length === 8 || num.length === 9;
}
function toE164(digits55: string) {
  return `+${digits55}`;
}
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* ========================= Tipos ========================= */
type UsuarioForm = {
  nome: string;
  email: string;
  senha: string; // só para a criação via API admin
  whatsappMasked: string; // campo de UI
  cidade?: string;
  estado?: string;
  cpfCnpj?: string;
  tipo: "admin" | "usuario";
  status: "ativo" | "inativo" | "bloqueado";
};

/* ========================= Página ========================= */
export default function CreateUsuarioPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<UsuarioForm>({
    nome: "",
    email: "",
    senha: "",
    whatsappMasked: "+55 ",
    cidade: "",
    estado: "",
    cpfCnpj: "",
    tipo: "usuario",
    status: "ativo",
  });

  const [salvando, setSalvando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const whatsRef = useRef<HTMLInputElement | null>(null);

  function handleField<K extends keyof UsuarioForm>(key: K, value: UsuarioForm[K]) {
    setUsuario((u) => ({ ...u, [key]: value }));
  }

  function gerarSenhaAleatoria(tamanho = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#%$!";
    let senha = "";
    for (let i = 0; i < tamanho; i++) senha += chars.charAt(Math.floor(Math.random() * chars.length));
    handleField("senha", senha);
  }
  function copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setFeedback({ type: "success", message: "Senha copiada!" });
    setTimeout(() => setFeedback(null), 1600);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const email = usuario.email.trim().toLowerCase();
    const nome = usuario.nome.trim();

    // >>> DERIVA o WhatsApp no SUBMIT a partir do valor atual da UI <<<
    const masked = usuario.whatsappMasked || "+55 ";
    const digits55 = extractWhatsappDigits55FromMasked(masked);
    const valido = isValidBRWhatsappDigits(digits55);

    if (!(nome.length >= 3 && isValidEmail(email) && usuario.senha.trim().length >= 6 && valido)) {
      setFeedback({
        type: "error",
        message:
          "Verifique os dados: nome (mín. 3), e-mail válido, senha (mín. 6) e WhatsApp no padrão +55 (DDD) número.",
      });
      return;
    }

    setSalvando(true);
    try {
      // Duplicidade por e-mail
      const qEmail = query(collection(db, "usuarios"), where("email", "==", email));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        setFeedback({ type: "error", message: "Já existe um usuário com esse e-mail." });
        setSalvando(false);
        return;
      }

      // Duplicidade por WhatsApp
      const qWhats = query(collection(db, "usuarios"), where("whatsapp", "==", digits55));
      const snapWhats = await getDocs(qWhats);
      if (!snapWhats.empty) {
        setFeedback({ type: "error", message: "Já existe um usuário com esse WhatsApp." });
        setSalvando(false);
        return;
      }

      const cidade = (usuario.cidade || "").trim();
      const estado = (usuario.estado || "").trim();
      const cpfCnpj = onlyDigits(usuario.cpfCnpj || "");
      const tipo = usuario.tipo;
      const status = usuario.status;

      const baseDoc = {
        nome,
        email,
        whatsapp: digits55,        // <- só dígitos, iniciando por 55 (EXATAMENTE como no público)
        whatsappE164: toE164(digits55), // <- +55DDDN...
        cidade: cidade || null,
        estado: estado || null,
        cpfCnpj: cpfCnpj || null,
        tipo,    // "usuario" | "admin"
        status,  // "ativo" | "inativo" | "bloqueado"
        origem: "admin",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        lastLogin: null as any,
      };

      // (opcional) criar no Auth via endpoint admin
      let createdUid: string | null = null;
      try {
        const res = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: usuario.senha.trim(),
            displayName: nome,
            tipo,
            status,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { uid?: string };
          if (data?.uid) createdUid = data.uid;
        }
      } catch {
        // segue fallback abaixo
      }

      // DEBUG opcional — confirme no console o conteúdo enviado:
      console.log("payload salvo:", baseDoc);

      if (createdUid) {
        await setDoc(doc(db, "usuarios", createdUid), baseDoc);
      } else {
        await addDoc(collection(db, "usuarios"), baseDoc);
      }

      setFeedback({ type: "success", message: "Usuário criado com sucesso!" });
      setTimeout(() => router.push("/admin/usuarios"), 900);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: "Erro ao criar usuário: " + (err?.message || "tente novamente"),
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section style={{ maxWidth: 640, margin: "0 auto", padding: "42px 2vw 60px 2vw" }}>
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
          padding: "34px 28px",
          marginBottom: 30,
          borderTop: "4px solid",
          borderImage: "linear-gradient(90deg,#FB8500 0%,#219EBC 100%) 1",
        }}
      >
        <h2
          style={{
            fontWeight: 900,
            fontSize: "2rem",
            color: "#023047",
            marginBottom: 6,
            letterSpacing: -0.5,
          }}
        >
          Novo Usuário
        </h2>
        <p style={{ margin: 0, color: "#475569", fontWeight: 600, marginBottom: 22 }}>
          Alinhado 1:1 com o cadastro público (whatsapp e whatsappE164).
        </p>

        <form onSubmit={handleSave} autoComplete="off">
          <Label>Nome</Label>
          <Input
            icon={<UserIcon size={18} />}
            value={usuario.nome}
            onChange={(v) => handleField("nome", v)}
            placeholder="Nome completo"
            required
          />

          <Label>E-mail</Label>
          <Input
            type="email"
            icon={<Mail size={18} />}
            value={usuario.email}
            onChange={(v) => handleField("email", v)}
            placeholder="email@exemplo.com"
            required
          />

          <Label>Senha</Label>
          <div style={{ position: "relative", display: "flex", gap: 7 }}>
            <Input
              type={senhaVisivel ? "text" : "password"}
              value={usuario.senha}
              onChange={(v) => handleField("senha", v)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              style={{ marginBottom: 0 }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setSenhaVisivel((v) => !v)}
              style={iconBtnStyle({ right: 46 })}
              aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
              title={senhaVisivel ? "Ocultar" : "Mostrar"}
            >
              {senhaVisivel ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => gerarSenhaAleatoria(10)}
              style={iconBtnStyle({ right: 22, color: "#FB8500" })}
              aria-label="Gerar senha"
              title="Gerar senha segura"
            >
              <Key size={18} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => copyToClipboard(usuario.senha)}
              style={iconBtnStyle({ right: -2, color: "#2563eb" })}
              aria-label="Copiar senha"
              title="Copiar"
            >
              <Copy size={17} />
            </button>
          </div>
          <SmallHint>A senha não é salva no Firestore; serve para criar o Auth via API.</SmallHint>

          <Label>WhatsApp</Label>
          <Input
            inputRef={whatsRef}
            icon={<Phone size={18} />}
            placeholder="+55 (DDD) número"
            value={usuario.whatsappMasked}
            onChange={(v) => handleField("whatsappMasked", formatWhatsappBRIntl(v))}
            onFocus={() => handleField("whatsappMasked", ensurePlus55Prefix(usuario.whatsappMasked))}
            onBlur={() => handleField("whatsappMasked", formatWhatsappBRIntl(usuario.whatsappMasked))}
            maxLength={20}
            hint="+55 (DDD) 9XXXX-XXXX ou +55 (DDD) XXXX-XXXX"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
            <div>
              <Label>Cidade</Label>
              <Input
                value={usuario.cidade || ""}
                onChange={(v) => handleField("cidade", v)}
                placeholder="Cidade"
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Input
                value={usuario.estado || ""}
                onChange={(v) => handleField("estado", v)}
                placeholder="UF ou Estado"
              />
            </div>
          </div>

          <Label>CPF ou CNPJ</Label>
          <Input
            value={usuario.cpfCnpj || ""}
            onChange={(v) => handleField("cpfCnpj", v)}
            placeholder="Somente números"
            inputMode="numeric"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Tipo</Label>
              <Select
                value={usuario.tipo}
                onChange={(v) => handleField("tipo", v as UsuarioForm["tipo"])}
                options={[
                  { label: "Usuário", value: "usuario" },
                  { label: "Admin", value: "admin" },
                ]}
                icon={<Shield size={16} />}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={usuario.status}
                onChange={(v) => handleField("status", v as UsuarioForm["status"])}
                options={[
                  { label: "Ativo", value: "ativo" },
                  { label: "Inativo", value: "inativo" },
                  { label: "Bloqueado", value: "bloqueado" },
                ]}
                icon={<CheckCircle2 size={16} />}
              />
            </div>
          </div>

          {feedback && (
            <div
              style={{
                margin: "16px 0 4px 0",
                fontWeight: 800,
                color: feedback.type === "success" ? "#059669" : "#d90429",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {feedback.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              {feedback.message}
            </div>
          )}

          <button type="submit" disabled={salvando} style={submitBtnStyle}>
            {salvando && <Loader className="animate-spin" size={18} />} <Save size={19} />{" "}
            {salvando ? "Salvando..." : "Salvar Usuário"}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ========================= UI Helpers ========================= */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontWeight: 800,
        fontSize: 14,
        color: "#2563eb",
        marginBottom: 6,
        marginTop: 16,
        display: "block",
      }}
    >
      {children}
    </label>
  );
}
function SmallHint({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: 8 }}>{children}</div>;
}
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  required,
  minLength,
  style,
  inputMode,
  inputRef,
  onFocus,
  onBlur,
  maxLength,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
  minLength?: number;
  style?: React.CSSProperties;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  inputRef?: React.RefObject<HTMLInputElement>;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1.5px solid #e5e7eb",
          borderRadius: 10,
          padding: "12px 13px",
          background: "#f8fafc",
          color: "#023047",
          fontWeight: 600,
        }}
      >
        {icon && <span style={{ marginRight: 8, color: "#64748b" }}>{icon}</span>}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          inputMode={inputMode}
          onFocus={onFocus}
          onBlur={onBlur}
          maxLength={maxLength}
          style={{
            flex: 1,
            outline: "none",
            border: "none",
            background: "transparent",
            fontSize: 16,
            color: "#023047",
            minWidth: 0,
          }}
        />
      </div>
      {hint && <div style={{ fontSize: 12, color: "#dd6b20", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}
function Select({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1.5px solid #e5e7eb",
        borderRadius: 10,
        padding: "10px 12px",
        background: "#f8fafc",
      }}
    >
      {icon && <span style={{ marginRight: 8, color: "#64748b" }}>{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          outline: "none",
          border: "none",
          background: "transparent",
          fontSize: 16,
          color: "#023047",
          fontWeight: 600,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ color: "#0f172a" }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const iconBtnStyle = (extra?: Partial<React.CSSProperties>): React.CSSProperties => ({
  border: "none",
  background: "transparent",
  cursor: "pointer",
  position: "absolute",
  top: 12,
  ...extra,
});
const submitBtnStyle: React.CSSProperties = {
  marginTop: 18,
  width: "100%",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
  fontSize: "1.05rem",
  padding: "13px 0",
  borderRadius: 13,
  border: "none",
  boxShadow: "0 2px 14px #0001",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

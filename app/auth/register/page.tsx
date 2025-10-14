"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import {
  Mail,
  Lock,
  User,
  Loader2,
  LogIn,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";

/* =========================
   Utils
========================= */
function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

/** Mantém sempre o prefixo "+55 " no começo do input */
function ensurePlus55Prefix(v: string) {
  if (!v.startsWith("+55")) return `+55 ${v.replace(/^\+*/, "").trimStart()}`;
  // se for exatamente "+55" sem espaço, adiciona espaço
  if (v === "+55") return "+55 ";
  if (v.startsWith("+55") && v.length === 3) return "+55 ";
  return v;
}

/** Formata em máscara visual: +55 (DD) 9XXXX-XXXX ou +55 (DD) XXXX-XXXX */
function formatWhatsappBRIntl(v: string) {
  // Garante +55 no início (apenas para exibição)
  v = ensurePlus55Prefix(v);

  // Pega apenas dígitos depois do +55
  const digits = onlyDigits(v); // ex: 55 31 999999999
  // Mantém só até 13 dígitos (55 + 2 DDD + 8/9 núm)
  const d = digits.slice(0, 13);

  // Se não começar com 55, força
  let rest = d.startsWith("55") ? d.slice(2) : d; // remove "55"
  // rest: DDD + número

  const ddd = rest.slice(0, 2);
  const num = rest.slice(2); // 8 ou 9 dígitos

  // Monta a máscara
  let masked = "+55";
  masked += " ";
  if (ddd.length > 0) {
    masked += `(${ddd}`;
    if (ddd.length === 2) masked += ")";
    masked += ddd.length === 2 ? " " : "";
  }

  if (num.length > 0) {
    if (num.length <= 4) {
      masked += num;
    } else if (num.length <= 8) {
      // 8 dígitos: XXXX-XXXX
      masked += `${num.slice(0, 4)}-${num.slice(4)}`;
    } else {
      // 9 dígitos: 9XXXX-XXXX
      masked += `${num.slice(0, 5)}-${num.slice(5)}`;
    }
  }

  return masked;
}

/** Validação: precisa ter 55 + DDD(2) + número(8-9) = 12 ou 13 dígitos */
function isValidBRWhatsappDigits(digitsWith55: string) {
  if (!digitsWith55.startsWith("55")) return false;
  const total = digitsWith55.length;
  if (total !== 12 && total !== 13) return false; // 55 + 2 + 8 = 12  | 55 + 2 + 9 = 13
  const ddd = digitsWith55.slice(2, 4);
  if (ddd.length !== 2) return false;
  const num = digitsWith55.slice(4);
  return num.length === 8 || num.length === 9;
}

/** Extrai a versão só dígitos SEM sinal de + (começando por 55) a partir do input exibido */
function extractWhatsappDigits55(v: string) {
  const d = onlyDigits(v);
  // se o usuário tentar apagar 55, força de volta
  return d.startsWith("55") ? d : `55${d}`;
}

/** Versão E.164: +55DDDN... */
function toE164(digits55: string) {
  return `+${digits55}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* =========================
   Page
========================= */
export default function RegisterPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  // inicia já com o prefixo +55
  const [whatsapp, setWhatsapp] = useState("+55 ");
  const whatsRef = useRef<HTMLInputElement | null>(null);

  const [showPass, setShowPass] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  // Sempre manter o prefixo +55 visível
  useEffect(() => {
    setWhatsapp((prev) => ensurePlus55Prefix(prev));
  }, []);

  const whatsappDigits55 = useMemo(() => {
    // sempre retorna começando com 55
    const d = extractWhatsappDigits55(whatsapp);
    // limita ao máximo 13 dígitos (55 + 2 + 9)
    return d.slice(0, 13);
  }, [whatsapp]);

  const formValido = useMemo(() => {
    return (
      nome.trim().length >= 3 &&
      isValidEmail(email) &&
      senha.length >= 6 &&
      isValidBRWhatsappDigits(whatsappDigits55)
    );
  }, [nome, email, senha, whatsappDigits55]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!formValido) {
      setErro(
        "Verifique os dados: nome (mín. 3), e-mail válido, senha (mín. 6) e WhatsApp no padrão +55 (DDD) número.",
      );
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha,
      );
      const uid = cred.user.uid;

      const digits = whatsappDigits55; // ex: 55 31 9XXXXXXX
      const e164 = toE164(digits); // ex: +55319XXXXXXX

      await setDoc(doc(db, "usuarios", uid), {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: digits, // só dígitos, começando por 55
        whatsappE164: e164, // +55DDDN...
        tipo: "usuario",
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        status: "ativo",
      });

      router.push("/auth/login");
    } catch (e: any) {
      // Mensagens amigáveis
      let msg = "Erro ao cadastrar. Tente novamente.";
      const code = e?.code || e?.message || "";

      if (String(code).includes("auth/email-already-in-use"))
        msg = "Este e-mail já está em uso.";
      else if (String(code).includes("auth/invalid-email"))
        msg = "E-mail inválido.";
      else if (String(code).includes("auth/weak-password"))
        msg = "Senha muito fraca. Use pelo menos 6 caracteres.";
      else if (String(code).includes("network"))
        msg = "Falha de conexão. Verifique sua internet.";

      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f7fafc] px-2 py-8">
      <div
        className="w-full max-w-xl mx-auto rounded-3xl border border-[#edf2f7] bg-white px-6 md:px-14 py-11 md:py-14 flex flex-col items-center shadow-xl"
        style={{
          borderTop: "5px solid #FB8500",
          borderImage: "linear-gradient(90deg,#FB8500 0%,#219EBC 100%) 1",
        }}
      >
        {/* Logo */}
        <Link href="/" className="mb-6 flex justify-center">
          <img
            src="/logo-pedraum.png"
            alt="Pedraum Brasil"
            style={{ height: 38, marginBottom: 10 }}
          />
        </Link>

        <h1
          className="text-3xl md:text-[2.2rem] font-black text-[#023047] mb-2 text-center"
          style={{ letterSpacing: "-0.5px" }}
        >
          Criar Conta
        </h1>
        <p className="text-gray-600 text-[16px] text-center mb-9 font-medium max-w-lg">
          Cadastre-se para acessar as{" "}
          <span className="text-[#FB8500] font-bold">oportunidades</span> do{" "}
          <span className="text-[#023047] font-black">Pedraum Brasil</span>
        </p>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-6 md:gap-7"
          autoComplete="off"
        >
          {/* Nome */}
          <InputGroup
            icon={<User size={22} className="text-[#FB8500]" />}
            placeholder="Nome completo"
            value={nome}
            onChange={setNome}
            autoComplete="name"
          />

          {/* Email */}
          <InputGroup
            icon={<Mail size={22} className="text-[#FB8500]" />}
            placeholder="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="username"
          />

          {/* Senha + toggle */}
          <InputGroup
            icon={<Lock size={22} className="text-[#FB8500]" />}
            placeholder="Senha (mín. 6 caracteres)"
            value={senha}
            onChange={setSenha}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            trailing={
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="p-1 -mr-1"
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />

          {/* WhatsApp com +55 obrigatório */}
          <InputGroup
            inputRef={whatsRef}
            icon={<Phone size={22} className="text-[#FB8500]" />}
            placeholder="+55 (DDD) número"
            value={whatsapp}
            onChange={(v: string) => {
              // força o prefixo +55 e re-formata
              const masked = formatWhatsappBRIntl(v);
              setWhatsapp(masked);
            }}
            onFocus={() => setWhatsapp((prev) => ensurePlus55Prefix(prev))}
            onBlur={() => setWhatsapp((prev) => formatWhatsappBRIntl(prev))}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            // tamanho máximo para "+55 (DD) 9XXXX-XXXX" => ~19/20 chars
            maxLength={20}
            hint={
              !isValidBRWhatsappDigits(whatsappDigits55)
                ? "Informe no formato +55 (DDD) número (8 ou 9 dígitos)."
                : undefined
            }
            // Impede apagar o prefixo com Backspace/Home
            leadingGuard="+55"
          />

          {/* Erro */}
          {erro && (
            <div className="text-red-700 bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-base text-center flex items-center justify-center gap-2 -mt-2">
              {erro}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || !formValido}
            className="w-full bg-gradient-to-r from-[#FB8500] to-[#FFB703] hover:from-[#FB8500] hover:to-[#ff9800] text-white py-4 rounded-xl font-bold text-xl flex items-center justify-center transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            style={{
              letterSpacing: ".01em",
              boxShadow: "0 6px 18px #ffb70355",
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={26} />
            ) : (
              <LogIn className="mr-2" size={26} />
            )}
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        {/* Link Login */}
        <div className="mt-8 text-center text-[17px] w-full">
          <span className="text-gray-600">Já tem uma conta?</span>
          <Link
            href="/auth/login"
            className="ml-2 text-[#023047] font-bold hover:underline transition"
          >
            Entrar
          </Link>
        </div>
      </div>

      {/* CSS responsivo */}
      <style>{`
        @media (max-width: 700px) {
          .max-w-xl {
            max-width: 99vw !important;
            padding-left: 0.2rem !important;
            padding-right: 0.2rem !important;
          }
        }
        @media (max-width: 500px) {
          .max-w-xl {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
        input::placeholder { color: #9aa3af; }
      `}</style>
    </main>
  );
}

/* =========================
   Components
========================= */
function InputGroup({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
  className = "",
  maxLength,
  trailing,
  hint,
  inputMode,
  inputRef,
  onFocus,
  onBlur,
  leadingGuard, // quando definido, protege o prefixo no campo (ex.: "+55")
}: {
  icon?: React.ReactNode;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  className?: string;
  maxLength?: number;
  trailing?: React.ReactNode;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  inputRef?: React.RefObject<HTMLInputElement>;
  onFocus?: () => void;
  onBlur?: () => void;
  leadingGuard?: string;
}) {
  return (
    <div className={`${className}`}>
      <div className="flex items-center border border-[#eaecef] rounded-xl px-4 py-4 bg-[#f9fafb] shadow-sm focus-within:border-[#FB8500] transition">
        {icon && <span className="mr-3">{icon}</span>}
        <input
          ref={inputRef}
          type={type}
          className="bg-transparent outline-none flex-1 text-[#023047] text-lg font-semibold"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // Protege o prefixo quando definido
            if (leadingGuard && !v.startsWith(leadingGuard)) {
              // se usuário apagou o começo, re-insere
              onChange(
                (
                  leadingGuard +
                  " " +
                  v.replace(/^\+*/, "").trimStart()
                ).trimEnd(),
              );
            } else {
              onChange(v);
            }
          }}
          onKeyDown={(e) => {
            if (!leadingGuard) return;
            const el = e.currentTarget;
            // Impede apagar o prefixo com Backspace/Delete antes do prefixo
            const guardLen = leadingGuard.length;
            // posição do cursor
            const start = el.selectionStart ?? 0;
            if (
              (e.key === "Backspace" && start <= guardLen + 1) ||
              (e.key === "Delete" && start < guardLen)
            ) {
              e.preventDefault();
              // pula cursor para depois do prefixo
              setTimeout(() => {
                const pos = guardLen + 1;
                el.setSelectionRange(pos, pos);
              }, 0);
            }
            // Impede Ctrl+A seguido de Delete que remove tudo
            if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
              // permite selecionar tudo, mas bloquearemos a remoção do prefixo no onChange
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          maxLength={maxLength}
          inputMode={inputMode}
          style={{ minWidth: 0 }}
          required
        />
        {trailing}
      </div>
      {hint && <div className="text-xs text-[#dd6b20] mt-1 ml-1">{hint}</div>}
    </div>
  );
}

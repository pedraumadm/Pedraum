"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  LogIn,
  AlertTriangle,
} from "lucide-react";

type UsuarioDB = {
  tipo?: "usuario" | "admin" | "patrocinador";
  role?: "usuario" | "admin" | "patrocinador";
  status?: "Ativo" | "Inativo" | "Bloqueado";
  patrocinador?: boolean;
  isPatrocinador?: boolean;
  [k: string]: any;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [capsLock, setCapsLock] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const uid = cred.user.uid;

      // Tenta buscar o doc do usuário. Se não existir, assume defaults:
      const snap = await getDoc(doc(db, "usuarios", uid));
      const data: UsuarioDB = snap.exists() ? (snap.data() as UsuarioDB) : {};

      // Normaliza campos (compatível com variações que já usamos):
      const tipo = (data.tipo || data.role || "usuario") as UsuarioDB["tipo"];
      const isAdmin = tipo === "admin";
      const isPatroFlag = Boolean(data.patrocinador || data.isPatrocinador);
      const isPatroTipo = tipo === "patrocinador";

      // Bloqueio opcional (se quiser manter):
      if (data.status === "Bloqueado") {
        setErro("Sua conta está bloqueada. Entre em contato com o suporte.");
        return;
      }

      // Regras de rota:
      if (isAdmin) {
        router.push("/admin");
        return;
      }

      // Patrocinador acessa o mesmo painel (ou mude a rota se tiver um painel específico):
      if (isPatroTipo || isPatroFlag) {
        router.push("/painel");
        return;
      }

      // Usuário comum (ou sem doc ainda) também entra normalmente:
      router.push("/painel");
    } catch (err: any) {
      setErro("E-mail ou senha inválidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleCapsLock(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#f6f9fa] to-white px-4">
      <div className="w-full max-w-[420px] rounded-3xl bg-white border border-[#ececec] shadow-2xl px-8 py-11 mx-auto flex flex-col items-center">
        {/* LOGO SIMBÓLICA */}
        <div className="flex flex-col items-center mb-7">
          <span className="bg-[#fff4e6] rounded-2xl p-3 mb-3 shadow-sm">
            <LogIn size={34} className="text-[#FB8500]" />
          </span>
          <h1 className="text-[2.1rem] sm:text-3xl font-black text-[#023047] text-center mb-1 leading-tight tracking-tight">
            Entrar na Plataforma
          </h1>
          <p className="text-gray-600 text-base font-medium text-center">
            Acesse sua conta do{" "}
            <span className="font-bold text-[#FB8500]">Pedraum Brasil</span>
          </p>
        </div>

        {/* MENSAGEM DE ERRO */}
        {erro && (
          <div className="text-red-700 bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm text-center flex items-center justify-center gap-2 mb-5 w-full">
            <AlertTriangle className="inline text-red-500" size={18} />
            {erro}
          </div>
        )}

        {/* FORMULÁRIO */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div>
            <label className="block mb-1 font-bold text-[#023047] text-[15px]">
              E-mail
            </label>
            <div className="flex items-center gap-2 border border-[#e8e8ec] rounded-xl px-3 py-2 bg-[#f7fafc] shadow-inner focus-within:border-[#FB8500] transition">
              <Mail size={20} className="text-[#FB8500]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@seudominio.com"
                className="bg-transparent outline-none flex-1 text-[#023047] text-base font-semibold"
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 font-bold text-[#023047] text-[15px]">
              Senha
            </label>
            <div className="flex items-center gap-2 border border-[#e8e8ec] rounded-xl px-3 py-2 bg-[#f7fafc] shadow-inner focus-within:border-[#FB8500] transition">
              <Lock size={20} className="text-[#FB8500]" />
              <input
                type={showSenha ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                className="bg-transparent outline-none flex-1 text-[#023047] text-base font-semibold"
                onKeyUp={handleCapsLock}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha((s) => !s)}
                className="ml-2 text-[#b6b6c2] hover:text-[#FB8500] focus:outline-none transition"
                tabIndex={-1}
                aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {capsLock && (
              <div className="flex items-center mt-1 text-xs text-[#FB8500] font-medium gap-1">
                <AlertTriangle size={14} /> Caps Lock ativado!
              </div>
            )}
            <div className="flex justify-end mt-2 text-xs">
              <Link
                href="/auth/reset"
                className="text-[#FB8500] hover:underline transition font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FB8500] hover:bg-[#e06c00] text-white py-3 rounded-xl font-bold text-lg flex items-center justify-center transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            style={{ letterSpacing: ".01em" }}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={22} />
            ) : (
              <LogIn className="mr-2" size={22} />
            )}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* LINKS */}
        <div className="mt-7 text-center text-sm w-full">
          <div className="mb-2">
            <span className="text-gray-600">Ainda não tem uma conta?</span>
            <Link
              href="/auth/register"
              className="ml-2 text-[#023047] font-bold hover:underline transition"
            >
              Cadastre-se
            </Link>
          </div>
          <div className="text-gray-400 text-xs mt-3">
            Ao entrar, você concorda com nossa{" "}
            <Link
              href="/politica"
              className="text-[#219EBC] hover:underline transition"
            >
              Política de Privacidade
            </Link>
            .
          </div>
        </div>
      </div>
    </main>
  );
}

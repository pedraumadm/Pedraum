// app/auth/reset/page.tsx
"use client";

import { useState } from "react";
import { handlePasswordReset } from "@/utils/passwordReset";
import {
  Mail,
  KeyRound,
  LogIn,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "erro"; text: string } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await handlePasswordReset(email);
      setMsg({
        type: "ok",
        text: "Enviamos um e-mail para redefinir sua senha. Verifique sua caixa de entrada (ou spam).",
      });
    } catch (err: any) {
      setMsg({
        type: "erro",
        text: "Erro ao enviar e-mail. Verifique se o e-mail está correto.",
      });
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-[#f6f9fa] to-white px-4">
      <div className="w-full max-w-[420px] rounded-3xl bg-white border border-[#ececec] shadow-2xl px-8 py-11 mx-auto flex flex-col items-center">
        {/* Ícone */}
        <div className="flex flex-col items-center mb-7">
          <span className="bg-[#e7f6ff] rounded-2xl p-3 mb-3 shadow-sm">
            <KeyRound size={34} className="text-[#219EBC]" />
          </span>
          <h1 className="text-[2.1rem] sm:text-3xl font-black text-[#023047] text-center mb-1 leading-tight tracking-tight">
            Redefinir Senha
          </h1>
          <p className="text-gray-600 text-base font-medium text-center">
            Informe seu e-mail para receber o link de redefinição.
          </p>
        </div>

        {/* Mensagem de feedback */}
        {msg && (
          <div
            className={
              "flex items-center gap-2 px-4 py-2 rounded-xl mb-5 w-full text-sm text-center " +
              (msg.type === "ok"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-700 border border-red-200")
            }
          >
            {msg.type === "ok" ? (
              <CheckCircle className="text-green-500" size={18} />
            ) : (
              <AlertTriangle className="text-red-500" size={18} />
            )}
            {msg.text}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={onSubmit} className="w-full space-y-7">
          <div>
            <label className="block mb-1 font-bold text-[#023047] text-[15px]">
              E-mail
            </label>
            <div className="flex items-center gap-2 border border-[#e8e8ec] rounded-xl px-3 py-2 bg-[#f7fafc] shadow-inner focus-within:border-[#219EBC] transition">
              <Mail size={20} className="text-[#219EBC]" />
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#219EBC] hover:bg-[#176684] text-white py-3 rounded-xl font-bold text-lg flex items-center justify-center transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            style={{ letterSpacing: ".01em" }}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={22} />
            ) : (
              <LogIn className="mr-2" size={22} />
            )}
            {loading ? "Enviando..." : "Enviar e-mail de redefinição"}
          </button>
        </form>

        {/* Links extra */}
        <div className="mt-8 text-center text-sm w-full">
          <div>
            <Link
              href="/auth/login"
              className="text-[#023047] hover:underline font-bold flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft size={17} /> Voltar ao Login
            </Link>
          </div>
          <div className="text-gray-400 text-xs mt-3">
            Precisa de uma conta?{" "}
            <Link
              href="/auth/register"
              className="text-[#FB8500] hover:underline transition font-bold"
            >
              Cadastre-se
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

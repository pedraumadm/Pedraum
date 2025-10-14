"use client";
import { Mail, Phone, MapPin, Send, Loader } from "lucide-react";
import { useState } from "react";

export default function ContatoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  // Substitua por sua integração (EmailJS, SendGrid, Firebase Functions, etc)
  async function handleSubmit(e: any) {
    e.preventDefault();
    setEnviando(true);
    setMsg("");
    // Simulando envio, troque pela sua integração real!
    setTimeout(() => {
      setMsg("Mensagem enviada com sucesso! Em breve responderemos.");
      setEnviando(false);
      setNome("");
      setEmail("");
      setMensagem("");
    }, 1800);
  }

  return (
    <section
      style={{ maxWidth: 650, margin: "0 auto", padding: "50px 4vw 60px 4vw" }}
    >
      <h1
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          color: "#023047",
          background: "#f3f6fa",
          borderRadius: "12px",
          boxShadow: "0 2px 12px #0001",
          padding: "8px 32px",
          marginBottom: 20,
        }}
      >
        Fale Conosco
      </h1>
      <div
        className="mb-9"
        style={{ fontSize: 17, color: "#495668", marginBottom: 28 }}
      >
        Tem dúvidas, sugestões ou quer se tornar parceiro? Envie sua mensagem ou
        entre em contato pelos canais abaixo.
      </div>
      <form
        className="bg-white rounded-2xl shadow-xl p-7 flex flex-col gap-5 mb-8"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="block w-full px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
        />
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="block w-full px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
        />
        <textarea
          placeholder="Sua mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          required
          className="block w-full px-4 py-3 border border-[#e4e8ef] rounded-lg bg-[#f7fafd] font-medium text-base outline-none"
          rows={5}
        />
        <button
          type="submit"
          disabled={enviando || !nome || !email || !mensagem}
          className="bg-[#FB8500] flex items-center justify-center gap-2 text-white text-lg font-bold rounded-xl py-3 mt-2 shadow-md hover:opacity-90 transition"
        >
          {enviando ? (
            <Loader className="animate-spin" size={22} />
          ) : (
            <Send size={20} />
          )}
          {enviando ? "Enviando..." : "Enviar mensagem"}
        </button>
        {msg && (
          <div
            className="text-center mt-2 font-semibold"
            style={{ color: "#18B56D", fontSize: 16 }}
          >
            {msg}
          </div>
        )}
      </form>
      <div style={{ color: "#495668", fontSize: 16, marginBottom: 8 }}>
        <Mail size={17} style={{ marginRight: 6, marginBottom: -3 }} />{" "}
        contato@pedraum.com.br
        <br />
        <Phone size={17} style={{ marginRight: 6, marginBottom: -3 }} /> (31)
        99090-3613
        <br />
        <MapPin size={17} style={{ marginRight: 6, marginBottom: -3 }} /> Belo
        Horizonte/MG
      </div>
    </section>
  );
}

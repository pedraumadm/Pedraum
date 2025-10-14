"use client";
import { useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function InteresseModal({
  machineId,
  machineTitle,
  vendedorId,
  onClose,
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function enviarLead(e) {
    e.preventDefault();
    setEnviando(true);

    try {
      await addDoc(collection(db, "leads"), {
        machineId,
        machineTitle,
        vendedorId,
        nome,
        email,
        telefone,
        mensagem,
        createdAt: serverTimestamp(),
        status: "novo",
      });
      setSucesso(true);
    } catch (err) {
      alert("Erro ao enviar interesse. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-8 relative animate-slideup">
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-2xl text-gray-400 hover:text-accent"
        >
          ×
        </button>
        <h2 className="font-black text-2xl mb-2 text-brand">Tenho interesse</h2>
        <p className="mb-5 text-gray-600 text-sm">
          Preencha seus dados para que o vendedor entre em contato sobre{" "}
          <span className="font-bold">{machineTitle}</span>.
        </p>
        {sucesso ? (
          <div className="text-green-600 font-semibold py-10 text-center">
            Interesse enviado com sucesso! <br /> O vendedor receberá seus dados
            e vai retornar em breve.
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={enviarLead}>
            <input
              required
              className="border rounded-xl px-4 py-2"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              required
              className="border rounded-xl px-4 py-2"
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              required
              className="border rounded-xl px-4 py-2"
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            <textarea
              className="border rounded-xl px-4 py-2"
              placeholder="Mensagem (opcional)"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={3}
            />
            <button
              disabled={enviando}
              type="submit"
              className="bg-accent hover:bg-accent-dark text-white font-bold py-2 px-6 rounded-xl transition mt-2"
            >
              {enviando ? "Enviando..." : "Enviar interesse"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

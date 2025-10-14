// =============================
// app/checkout/page.tsx
// =============================

"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useState } from "react";

export default function CheckoutPage() {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <LayoutWithSidebar>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Finalizar Interesse
        </h1>
        {enviado ? (
          <p className="text-green-600 text-center text-lg font-medium">
            Interesse registrado com sucesso! Em breve entraremos em contato.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Seu Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none"
                placeholder="Digite seu nome completo"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Telefone ou E-mail
              </label>
              <input
                type="text"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none"
                placeholder="Whatsapp ou E-mail para contato"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Mensagem
              </label>
              <textarea
                rows={4}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none"
                placeholder="Conte mais sobre o que deseja adquirir ou negociar"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#FB8500] hover:bg-[#FFB703] transition-colors text-white font-semibold py-2 px-4 rounded-xl"
            >
              Enviar Interesse
            </button>
          </form>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

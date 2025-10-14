// =============================
// app/404/page.tsx
// =============================

"use client";

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#8ECAE6] to-[#219EBC] p-6">
      <div className="bg-white shadow-2xl rounded-2xl p-10 max-w-lg text-center">
        <h1 className="text-6xl font-bold text-[#FB8500] mb-4">404</h1>
        <p className="text-xl font-semibold text-[#023047] mb-2">
          Página não encontrada
        </p>
        <p className="text-sm text-gray-600 mb-6">
          A página que você está tentando acessar não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#FB8500] hover:bg-[#FFB703] transition-colors text-white font-semibold py-2 px-6 rounded-xl"
        >
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}

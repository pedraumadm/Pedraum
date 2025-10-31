// app/404/page.tsx  — Server Component (sem hooks de next/navigation)
export const dynamic = "force-static"; // garante estático

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-blue-700">Página não encontrada</h1>
      <p className="mt-3 text-gray-600">
        O link pode estar incorreto ou o conteúdo foi removido.
      </p>
      <a
        href="/"
        className="mt-8 inline-block rounded-xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 transition"
      >
        Voltar para a Home
      </a>
    </main>
  );
}

// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">A URL acessada não existe.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:opacity-90"
      >
        Voltar para a Home
      </Link>
    </main>
  );
}

export default function Sucesso() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-8 rounded-2xl bg-green-50 border border-green-200">
        <h1 className="text-2xl font-bold text-green-800">
          Pagamento aprovado!
        </h1>
        <p className="mt-2 text-green-700">
          Obrigado. Seu acesso será liberado em instantes.
        </p>
      </div>
    </main>
  );
}

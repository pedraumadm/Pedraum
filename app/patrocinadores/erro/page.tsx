export default function Erro() {
  return (
    <main className="min-h-[60vh] grid place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-black text-red-600">
          Não foi possível concluir
        </h1>
        <p className="text-gray-600 mt-2">
          Tente novamente ou verifique sua forma de pagamento.
        </p>
      </div>
    </main>
  );
}

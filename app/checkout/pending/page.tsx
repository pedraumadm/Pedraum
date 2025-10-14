export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[keyof SP]) => (Array.isArray(v) ? v[0] : (v ?? ""));

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const status = one(sp.status);
  const paymentId = one(sp.payment_id);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border p-6 bg-white">
        <h1 className="text-2xl font-black text-amber-700">
          Pagamento pendente
        </h1>
        <p className="mt-2 text-slate-600">Estamos aguardando a confirmação.</p>
        <ul className="mt-4 text-sm text-slate-700 space-y-1">
          <li>
            <b>Status:</b> {status || "—"}
          </li>
          <li>
            <b>Payment ID:</b> {paymentId || "—"}
          </li>
        </ul>
      </div>
    </main>
  );
}

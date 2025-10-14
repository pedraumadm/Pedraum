"use client";

type Item = { label: string; value: string };

export default function StatsBar({ items }: { items: Item[] }) {
  return (
    <section className="container mx-auto px-4 -mt-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 text-center"
          >
            <div className="text-2xl md:text-3xl font-extrabold text-[#023047]">
              {it.value}
            </div>
            <div className="text-xs md:text-sm text-slate-600">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// components/TaxonomyQuickSearch.tsx
"use client";

import React from "react";
import { Tag } from "lucide-react";

/** Tipos compatíveis com seu hook useTaxonomia */
export type Item = { nome: string; slug?: string };
export type Subcat = { nome: string; slug?: string; itens?: Item[] };
export type Cat = { nome: string; slug?: string; subcategorias?: Subcat[] };

/** Resultado selecionado: caminho em até 3 níveis */
export type TaxonomyPath = [string] | [string, string] | [string, string, string];

type Props = {
  /** Lista de categorias do useTaxonomia() */
  categorias: Cat[];
  /** Callback acionado ao escolher um item no dropdown */
  onSelectPath: (path: TaxonomyPath) => void;
  /** Placeholder do input (opcional) */
  placeholder?: string;
  /** Desabilitar quando a taxonomia estiver carregando (opcional) */
  disabled?: boolean;
  /** Classe extra para o wrapper (opcional) */
  className?: string;
};

/* ---------------- Helpers internos (isolados p/ não conflitar com a página) ---------------- */

function normalizeLocal(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type TaxIndexRow = {
  label: string;
  path: string[];
  haystack: string;
};

function buildTaxIndexLocal(categorias: Cat[]): TaxIndexRow[] {
  const rows: TaxIndexRow[] = [];
  for (const cat of categorias || []) {
    const catName = cat?.nome || "";
    const subs = Array.isArray(cat?.subcategorias) ? cat.subcategorias! : [];

    if (subs.length) {
      for (const sub of subs) {
        const subName = sub?.nome || "";
        const itens = Array.isArray(sub?.itens) ? sub.itens! : [];
        if (itens.length) {
          for (const it of itens) {
            const itemName = it?.nome || "";
            const label = itemName || subName || catName;
            const hay = normalizeLocal([catName, subName, itemName].filter(Boolean).join(" "));
            rows.push({ label, path: [catName, subName, itemName], haystack: hay });
          }
        } else {
          const label = subName || catName;
          const hay = normalizeLocal([catName, subName].filter(Boolean).join(" "));
          rows.push({ label, path: [catName, subName], haystack: hay });
        }
      }
    } else if (catName) {
      rows.push({ label: catName, path: [catName], haystack: normalizeLocal(catName) });
    }
  }
  return rows;
}

function searchTaxIndexLocal(index: TaxIndexRow[], q: string): TaxIndexRow[] {
  const nq = normalizeLocal(q);
  if (!nq) return [];
  const scored = index.map((r) => {
    const labelN = normalizeLocal(r.label);
    let score = 0;
    if (labelN === nq) score += 100;
    if (labelN.startsWith(nq)) score += 40;
    if (r.haystack.includes(nq)) score += 25;
    if (r.path[2] && normalizeLocal(r.path[2]).includes(nq)) score += 30;
    return { row: r, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.row);
}

/* ---------------- Componente ---------------- */

export default function TaxonomyQuickSearch({
  categorias,
  onSelectPath,
  placeholder = "Ex.: britador de mandíbulas, peneira vibratória, CLP, etc.",
  disabled,
  className,
}: Props) {
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const index = React.useMemo(() => buildTaxIndexLocal(categorias || []), [categorias]);

  const results = React.useMemo(() => {
    if (!term.trim()) return [];
    return searchTaxIndexLocal(index, term);
  }, [index, term]);

  function choose(path: string[]) {
    onSelectPath(path as TaxonomyPath);
    setTerm("");
    setOpen(false);
    setHighlight(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[highlight];
      if (chosen) choose(chosen.path);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={className}>
      <h3 className="text-slate-800 font-black tracking-tight mb-3 flex items-center gap-2">
        <Tag className="w-5 h-5 text-orange-500" /> Buscar por nome do item (atalho)
      </h3>

      <div className="relative">
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(!!e.target.value.trim());
          }}
          onFocus={() => term && setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "13px 14px",
            borderRadius: 12,
            border: "1.6px solid #e5e7eb",
            fontSize: 16,
            color: "#0f172a",
            background: "#f8fafc",
            fontWeight: 600,
            marginBottom: 6,
            outline: "none",
            minHeight: 46,
          }}
        />

        {open && results.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% + 8px)",
              background: "#ffffff",
              border: "1px solid #e6ebf2",
              borderRadius: 12,
              boxShadow: "0 12px 28px rgba(2,48,71,0.12)",
              zIndex: 50,
              maxHeight: 320,
              overflowY: "auto",
            }}
            onMouseLeave={() => setHighlight(0)}
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>
              {results.map((r, i) => {
                const [c1, c2, c3] = r.path;
                const active = i === highlight;
                return (
                  <li
                    key={r.label + i}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r.path)}
                    style={{
                      cursor: "pointer",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: active ? "rgba(251,133,0,0.08)" : "transparent",
                    }}
                  >
                    <div className="text-sm font-semibold text-slate-800">{r.label}</div>
                    <div className="text-xs text-slate-500">{[c1, c2, c3].filter(Boolean).join(" › ")}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {open && results.length === 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "calc(100% + 8px)",
              background: "#ffffff",
              border: "1px solid #e6ebf2",
              borderRadius: 12,
              boxShadow: "0 12px 28px rgba(2,48,71,0.12)",
              zIndex: 50,
              padding: "10px 12px",
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Nada encontrado. Tente “mandibulas”, “mandíbula”, “mandibula”…
          </div>
        )}
      </div>
    </div>
  );
}

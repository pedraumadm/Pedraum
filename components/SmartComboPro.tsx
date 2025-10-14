// components/SmartComboPro.tsx
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  ChevronDown,
  Clock,
  Check,
  List as ListIcon,
} from "lucide-react";

/* =====================================================================================
   Tipos
===================================================================================== */

export type ComboOption = {
  value: string;
  label: string;
  /** Exibe como chip e subtítulo quando presente (ex.: categoria pai) */
  parent?: string;
  /** Sinônimos para busca */
  aliases?: string[];
  /** Ícone opcional à esquerda do item na lista */
  icon?: React.ReactNode;
};

export type SmartComboProProps = {
  label?: React.ReactNode;
  placeholder?: string;
  /** Valor selecionado (controlado) */
  value: string;
  /** Callback ao selecionar/limpar */
  onChange: (val: string) => void;
  /** Opções da lista */
  options: ComboOption[];
  /** Desabilita o componente */
  disabled?: boolean;

  /** Persistência de recentes (até 5) */
  recentKey?: string;
  /** Texto quando não há resultados */
  noResultsText?: string;

  /** Visual compacto do rótulo/campo (padrão: true) */
  compact?: boolean;

  /** Renderiza dropdown em portal (evita clipping por overflow/scroll) */
  usePortal?: boolean;

  /** Mostra chip do `parent` à direita do item (padrão: true) */
  useChipRight?: boolean;

  /** Ícone opcional à esquerda do campo */
  leftIcon?: React.ReactNode;

  /** Máximo de linhas visíveis (altura do dropdown) */
  maxVisible?: number;

  /** Classes extras */
  className?: string;
  inputClassName?: string;

  /** Acessibilidade/Form */
  /** Name para criar input hidden espelho (para validação nativa do form) */
  name?: string;
  /** Required para o *valor* (aplicado no hidden input) */
  formRequired?: boolean;
  /** ID opcional do input (senão usa useId) */
  id?: string;
};

/* =====================================================================================
   Utils
===================================================================================== */

function normalize(txt: string) {
  return (txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function scoreMatch(q: string, item: ComboOption): number {
  if (!q) return 1;
  const needle = normalize(q);
  const hay = normalize(item.label);
  const parent = normalize(item.parent || "");

  let score = 0;
  if (hay.startsWith(needle)) score = Math.max(score, 100);
  else if (hay.includes(needle)) score = Math.max(score, 72);

  if (parent) {
    if (parent.startsWith(needle)) score = Math.max(score, 82);
    else if (parent.includes(needle)) score = Math.max(score, 66);
  }

  if (item.aliases?.length) {
    for (const a of item.aliases) {
      const an = normalize(a);
      if (an.startsWith(needle)) score = Math.max(score, 70);
      else if (an.includes(needle)) score = Math.max(score, 64);
    }
  }
  return score;
}

function useDebounced<T>(v: T, ms = 140) {
  const [val, setVal] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setVal(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return val;
}

/* =====================================================================================
   Componente
===================================================================================== */

const SmartComboPro: React.FC<SmartComboProProps> = ({
  label = "Categoria *",
  placeholder = "Digite para buscar…",
  value,
  onChange,
  options,
  disabled = false,
  recentKey,
  noResultsText = "Nenhum resultado encontrado",
  compact = true,
  usePortal = true,
  useChipRight = true,
  leftIcon,
  maxVisible = 8,
  className = "",
  inputClassName = "",
  name,
  formRequired = false,
  id,
}) => {
  // estado/ref
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [focusIndex, setFocusIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const fieldRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const inputId = id ?? React.useId();
  const listboxId = React.useId();
  const debouncedQuery = useDebounced(query, 140);

  // recentes
  const [recents, setRecents] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!recentKey) return;
    try {
      const raw = localStorage.getItem(`combo:recent:${recentKey}`);
      if (raw) setRecents(JSON.parse(raw));
    } catch {}
  }, [recentKey]);

  const pushRecent = React.useCallback(
    (v: string) => {
      if (!recentKey || !v) return;
      setRecents((prev) => {
        const arr = [v, ...prev.filter((x) => x !== v)].slice(0, 5);
        try {
          localStorage.setItem(
            `combo:recent:${recentKey}`,
            JSON.stringify(arr),
          );
        } catch {}
        return arr;
      });
    },
    [recentKey],
  );

  // ranking + grupos
  const ranked = React.useMemo(() => {
    const withScore = options.map((o) => ({
      ...o,
      __score: scoreMatch(debouncedQuery, o),
    }));
    let list = debouncedQuery
      ? withScore.filter((i: any) => i.__score > 0)
      : withScore;
    if (!debouncedQuery && recents.length) {
      list = list.map((i: any) =>
        recents.includes(i.value) ? { ...i, __score: 999 } : i,
      );
    }
    list.sort(
      (a: any, b: any) =>
        b.__score - a.__score ||
        a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
    );
    return list as ComboOption[];
  }, [options, debouncedQuery, recents]);

  const groups = React.useMemo(() => {
    if (!ranked.length) return [];
    if (debouncedQuery)
      return [{ title: null as string | null, items: ranked }];
    if (recents.length) {
      return [
        {
          title: "Recentes",
          items: ranked.filter((x) => recents.includes(x.value)),
        },
        {
          title: "Todas as opções",
          items: ranked.filter((x) => !recents.includes(x.value)),
        },
      ];
    }
    return [{ title: "Todas as opções", items: ranked }];
  }, [ranked, debouncedQuery, recents]);

  const flat = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  // fechar ao clicar fora (field + dropdown com portal)
  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const insideField = !!containerRef.current?.contains(t);
      const insideDropdown = !!dropdownRef.current?.contains(t);
      if (insideField || insideDropdown) return;
      setOpen(false);
      setFocusIndex(-1);
      setQuery("");
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // teclado
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    const max = Math.max(0, flat.length - 1);

    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      setFocusIndex(0);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusIndex(max);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + maxVisible, max));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - maxVisible, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[focusIndex];
      if (item) choose(item.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setFocusIndex(-1);
    }
  }

  function choose(v: string) {
    onChange(v);
    pushRecent(v);
    setOpen(false);
    setQuery("");
    setFocusIndex(-1);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(false);
    setFocusIndex(-1);
    inputRef.current?.focus();
  }

  // destaque de trecho pesquisado
  function highlight(text: string, q: string) {
    if (!q) return text;
    const n = normalize(text);
    const nq = normalize(q);
    const i = n.indexOf(nq);
    if (i === -1) return text;
    const b = text.slice(0, i);
    const m = text.slice(i, i + nq.length);
    const a = text.slice(i + nq.length);
    return (
      <>
        {b}
        <span className="font-extrabold underline decoration-[#219EBC] decoration-2 underline-offset-2">
          {m}
        </span>
        {a}
      </>
    );
  }

  // posicionamento responsivo do dropdown
  const [dropStyle, setDropStyle] = React.useState<React.CSSProperties>({});
  React.useEffect(() => {
    if (!open || !fieldRef.current) return;

    const el = fieldRef.current;

    function apply() {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const spacer = 10;

      if (vw < 640) {
        // mobile: larga e fixa
        const width = Math.max(280, vw - 16);
        const top = Math.min(r.bottom + spacer, window.innerHeight - 16);
        setDropStyle({
          position: "fixed",
          top,
          left: 8,
          width,
          zIndex: 10000,
          maxHeight: Math.min(400, window.innerHeight - top - 8),
        });
      } else {
        if (usePortal) {
          // posição absoluta na viewport
          setDropStyle({
            position: "fixed",
            top: r.bottom + spacer,
            left: r.left,
            width: r.width,
            zIndex: 10000,
            maxHeight: Math.min(
              420,
              window.innerHeight - (r.bottom + spacer) - 16,
            ),
          });
        } else {
          // relativo ao container
          setDropStyle({
            position: "absolute",
            top: (el.offsetHeight ?? 0) + spacer,
            left: 0,
            width: "100%",
            zIndex: 10000,
            maxHeight: 420,
          });
        }
      }
    }

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("scroll", apply, true);
    window.addEventListener("resize", apply);
    window.addEventListener("pointermove", apply); // suaviza em layouts complexos

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", apply, true);
      window.removeEventListener("resize", apply);
      window.removeEventListener("pointermove", apply);
    };
  }, [open, usePortal]);

  // rolar item focado para a área visível
  React.useEffect(() => {
    if (!open || focusIndex < 0) return;
    const el = dropdownRef.current?.querySelector(
      `[data-combo-idx="${focusIndex}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIndex, open]);

  // item da lista
  function renderItem(
    opt: ComboOption,
    idx: number,
    focused: boolean,
    isSelected: boolean,
  ) {
    const chip = useChipRight ? (opt.parent ?? "") : "";

    return (
      <div
        key={opt.value}
        role="option"
        aria-selected={isSelected}
        data-combo-idx={idx}
        onMouseDown={(e) => {
          // Seleciona já no mousedown para evitar "janelas" entre mouseup/click
          e.preventDefault();
          e.stopPropagation();
          choose(opt.value);
        }}
        onClick={(e) => e.stopPropagation()}
        className={[
          "select-none flex items-center justify-between w-full box-border cursor-pointer px-4 py-3",
          focused ? "bg-[#EAF6FD]" : "bg-white",
          "border-b border-black/5",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 min-w-0">
          {opt.icon ? (
            <div className="shrink-0 w-6 h-6 flex items-center justify-center">
              {opt.icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-[#0B2441]">
              {highlight(opt.label, debouncedQuery)}
            </div>
            {opt.parent && (
              <div
                className={`${focused ? "text-[#0B2441]/70" : "text-slate-500"} mt-0.5 text-[12px]`}
              >
                {opt.parent}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {chip && (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold bg-[#EEF4FB] text-[#0B2441]">
              {chip}
            </span>
          )}
          {isSelected && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold text-white"
              style={{ backgroundColor: "#FF7F11" }}
            >
              <Check className="w-4 h-4" />
              Selecionado
            </span>
          )}
        </div>
      </div>
    );
  }

  // dropdown
  const Dropdown = (
    <div
      ref={dropdownRef}
      role="listbox"
      id={listboxId}
      className="rounded-[12px] border bg-white shadow-2xl overflow-hidden"
      style={{ ...dropStyle, borderColor: "#D7E3F0" }}
      onMouseDown={(e) => {
        // clicks dentro do dropdown não disparam o outside
        e.stopPropagation();
      }}
    >
      {/* dica topo */}
      <div className="px-4 py-2 text-[13px] text-[#3A5A7D] bg-[#EAF3FE]">
        Dica: digite para filtrar rapidamente
      </div>

      {/* conteúdo */}
      {flat.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-500">{noResultsText}</div>
      ) : (
        <div
          className="overflow-auto"
          style={{ maxHeight: `${52 * maxVisible}px` }}
        >
          {groups.map((g, gIdx) => (
            <div key={gIdx}>
              {g.title && (
                <div
                  className="sticky top-0 z-[1] flex items-center gap-2 px-4 py-2.5 text-[11px] font-extrabold tracking-wide uppercase text-[#0B2441] bg-white/95"
                  style={{ borderBottom: "1px solid rgba(14,30,37,0.05)" }}
                >
                  {g.title === "Recentes" ? (
                    <Clock className="w-3.5 h-3.5 text-[#FF7F11]" />
                  ) : (
                    <ListIcon className="w-3.5 h-3.5 text-[#0B2441]" />
                  )}
                  {g.title}
                </div>
              )}

              {g.items.map((opt, idx) => {
                const before = groups
                  .slice(0, gIdx)
                  .reduce((acc, gg) => acc + gg.items.length, 0);
                const realIndex = before + idx;
                const isFocused = realIndex === focusIndex;
                const isSelected = value === opt.value;
                return renderItem(opt, realIndex, isFocused, isSelected);
              })}
            </div>
          ))}
        </div>
      )}

      {/* rodapé */}
      <div
        className="px-4 py-2 text-[12px] text-[#3A5A7D] border-t bg-white"
        style={{ borderColor: "#EDF2F7" }}
      >
        Use ↑↓ para navegar · Enter para selecionar · Esc para fechar
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={["relative", className].join(" ")}>
      {/* hidden input espelho para validação nativa do form */}
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value}
          required={formRequired}
        />
      ) : null}

      {/* label */}
      {compact ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[14px] font-bold text-[#0B2441]"
        >
          {label}
        </label>
      ) : (
        <>
          <div className="mb-1.5 text-[28px] leading-7 font-extrabold text-[#0B2441]">
            Combobox
          </div>
          <label
            htmlFor={inputId}
            className="block text-[20px] font-bold text-[#0B2441] mb-3"
          >
            {label ?? "Selecione uma opção"}
          </label>
        </>
      )}

      {/* Campo */}
      <div
        ref={fieldRef}
        className={[
          "group relative flex items-center rounded-[14px] border bg-white pr-12",
          leftIcon ? "pl-11" : "pl-4",
          compact ? "py-2.5" : "py-3",
          disabled ? "opacity-60" : "hover:shadow-sm",
          "transition-shadow",
        ].join(" ")}
        style={{
          borderColor: "#D7E3F0",
          boxShadow: open ? "0 0 0 6px rgba(33,158,188,0.08)" : undefined,
        }}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* ícone no campo */}
        {leftIcon ? (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
            {leftIcon}
          </div>
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        )}

        <input
          id={inputId}
          ref={inputRef}
          className={[
            "flex-1 bg-transparent outline-none placeholder:text-slate-400 text-[15px] font-medium text-slate-900",
            "min-w-0", // evita overflow em telas pequenas
            inputClassName,
          ].join(" ")}
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setFocusIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          // Importante: o `required` fica no hidden input (formRequired)
        />

        {value && !disabled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            aria-label="Limpar"
            className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        )}
      </div>

      {/* Dropdown */}
      {open &&
        (usePortal ? (
          createPortal(Dropdown, document.body)
        ) : (
          <div className="relative">{Dropdown}</div>
        ))}
    </div>
  );
};

export default SmartComboPro;

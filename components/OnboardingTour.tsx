// components/OnboardingTour.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { usePathname, useSearchParams } from "next/navigation";

/* ============================================================
 * >>> Núcleo sênior: progressão global sem repetição v2.1 <<<
 * ============================================================ */

const TOUR_VERSION = "v2.1";

/* storage keys */
const KEY_SEEN = `pedraum_tour_seen:${TOUR_VERSION}`; // JSON: string[]
const KEY_GROUP_DONE = (g: string) => `pedraum_tour_done_group:${TOUR_VERSION}:${g}`;

const basePath = (p: string) => (p || "/").split("?")[0].replace(/\/+$/, "") || "/";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const isMobile = () => (typeof window !== "undefined" ? window.innerWidth <= 768 : false);

const q = (sel: string): HTMLElement | null => {
  try { return document.querySelector(sel) as HTMLElement | null; } catch { return null; }
};
const isVisible = (el: HTMLElement | null) => {
  if (!el) return false;
  const cs = window.getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};
const exists = (sel: string) => { const el = q(sel); return !!el && isVisible(el); };

/* hash id estável por passo */
function hashStr(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/* seen set */
function getSeenSet(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(KEY_SEEN) || "[]")); } catch { return new Set(); }
}
function saveSeenSet(seen: Set<string>) {
  try { localStorage.setItem(KEY_SEEN, JSON.stringify(Array.from(seen))); } catch {}
}

/* grupo concluído */
const isGroupDone = (g: string) => { try { return !!localStorage.getItem(KEY_GROUP_DONE(g)); } catch { return false; } };
const markGroupDone = (g: string) => { try { localStorage.setItem(KEY_GROUP_DONE(g), "1"); } catch {} };

/* offset do header fixo */
const getScrollOffset = () => {
  try {
    const header = (document.querySelector("header") as HTMLElement) ||
                   (document.querySelector('[data-tour="app-header"]') as HTMLElement);
    const h = header ? header.getBoundingClientRect().height : 0;
    return Math.min(Math.max(h, 56), 120) + 12;
  } catch { return 72; }
};

const safePlacement = (p?: Step["placement"]) => (isMobile() ? "bottom" : p || "auto");

/* util duplicados por target */
function uniqByTarget(steps: Step[]) {
  const seen = new Set<string>();
  return steps.filter((s) => {
    const key = String(s.target || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* espera targets válidos (existentes + visíveis) */
async function waitAndFilterTargets(
  steps: Step[],
  { minOk = 1, retries = 42, gapMs = 120 }: { minOk?: number; retries?: number; gapMs?: number } = {},
) {
  if (typeof window === "undefined") return [];
  let tries = 0;
  while (tries < retries) {
    const ok = steps.filter((s) => typeof s.target === "string" && exists(String(s.target)));
    if (ok.length >= minOk) return ok;
    tries++;
    await sleep(gapMs);
    await raf();
  }
  return steps.filter((s) => typeof s.target === "string" && exists(String(s.target)));
}

/* fallbacks mobile para itens do header dentro do hamburguer */
function patchStepsForViewport(steps: Step[]): Step[] {
  const mobile = isMobile();
  return steps.map((s) => {
    const t = typeof s.target === "string" ? (s.target as string) : "";
    let target = t;
    const fallback: Record<string, string> = {
      '[data-tour="header-nav-produtos"]': '[data-tour="header-hamburger"]',
      '[data-tour="header-nav-demandas"]': '[data-tour="header-hamburger"]',
      '[data-tour="header-nav-painel"]': '[data-tour="header-hamburger"]',
    };
    if (mobile && fallback[t] && !exists(t) && exists(fallback[t])) target = fallback[t];
    return {
      ...s,
      target,
      placement: safePlacement(s.placement),
      disableBeacon: true,
      offset: mobile ? 8 : 12,
      styles: {
        ...(s.styles || {}),
        tooltip: { ...(s.styles?.tooltip || {}), maxWidth: mobile ? 260 : 420 },
      },
    };
  });
}

/* =================== Auto-discovery via data-attributes =================== */
function getDomSelector(el: HTMLElement): string | null {
  if (!el) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tour = el.getAttribute("data-tour");
  if (tour) return `[data-tour="${tour}"]`;
  // fallback curto
  const parts: string[] = [];
  let cur: HTMLElement | null = el, depth = 0;
  while (cur && depth < 3) {
    let sel = cur.tagName.toLowerCase();
    if (cur.classList.length) sel += "." + Array.from(cur.classList).slice(0, 2).map((c) => CSS.escape(c)).join(".");
    parts.unshift(sel);
    cur = cur.parentElement;
    depth++;
  }
  return parts.length ? parts.join(" > ") : null;
}

function autoStepsFromDOM(): Step[] {
  if (typeof window === "undefined") return [];
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-tour-step]"));
  const parsed = nodes
    .map((el) => {
      const order = Number(el.getAttribute("data-tour-step") || "0");
      const content = el.getAttribute("data-tour-content") || "";
      const placement = el.getAttribute("data-tour-placement") as Step["placement"] | null;
      const explicitTarget = el.getAttribute("data-tour-target");
      const target = explicitTarget && explicitTarget.trim().length > 0 ? explicitTarget : getDomSelector(el);
      if (!content || !target) return null;
      return {
        order: isNaN(order) ? 0 : order,
        step: { target, content, placement: placement || undefined, disableBeacon: true } as Step,
      };
    })
    .filter(Boolean) as { order: number; step: Step }[];
  return uniqByTarget(patchStepsForViewport(parsed.sort((a, b) => a.order - b.order).map((x) => x.step)));
}

/* =================== Fallbacks por rota (prefix matching) =================== */
const ROUTE_STEPS: Array<{ pattern: string; steps: Step[] }> = [
  {
    pattern: "/",
    steps: [
      { target: ".home-hero-section, [data-tour='home.hero']", content: "Bem-vindo! Destaque principal da Pedraum.", disableBeacon: true },
      { target: ".home-hero-cta, [data-tour='home.cta']", content: "Atalho para começar: crie uma demanda ou anuncie." },
      { target: ".demandas-section, [data-tour='home.demandas']", content: "Demandas recentes do mercado." },
      { target: ".machines-section, [data-tour='home.vitrine']", content: "Vitrine de máquinas/produtos." },
    ],
  },
  {
    pattern: "/vitrine",
    steps: [
      { target: '[data-tour="vitrine.filtros"], .vitrine-filtros', content: "Refine sua busca pelos filtros." },
      { target: '[data-tour="vitrine.filtro-busca"], .vitrine-busca', content: "Pesquise por nome, categoria ou descrição." },
      { target: '[data-tour="vitrine.grid"], .vitrine-grid', content: "Resultados da vitrine." },
      { target: '[data-tour="vitrine.cta-novo-produto"], .vitrine-cta-produto', content: "Publique um novo produto/máquina." },
      { target: '[data-tour="vitrine.cta-novo-servico"], .vitrine-cta-servico', content: "Ou publique um serviço." },
    ],
  },
  {
    pattern: "/demandas",
    steps: [
      { target: '[data-tour="demandas.filtros"], .demandas-filtros', content: "Use os filtros para refinar os pedidos." },
      { target: '[data-tour="demandas.lista"], .demandas-lista', content: "Lista de demandas disponíveis." },
      { target: '[data-tour="demandas.cta-criar"], .demandas-cta', content: "Crie uma nova demanda." },
    ],
  },
  {
    pattern: "/painel",
    steps: [
      { target: ".painel-oportunidades, [data-tour='tile-oportunidades']", content: "Oportunidades direcionadas para você." },
      { target: ".painel-minhas-demandas, [data-tour='tile-minhas-demandas']", content: "Minhas Demandas publicadas." },
      { target: ".painel-produtos, [data-tour='tile-produtos']", content: "Meus produtos/máquinas." },
      { target: ".painel-servicos, [data-tour='tile-servicos']", content: "Meus serviços oferecidos." },
      { target: ".painel-notificacoes, [data-tour='tile-notificacoes']", content: "Notificações e avisos." },
    ],
  },
  {
    pattern: "/perfil",
    steps: [
      { target: "[data-tour='perfil.avatar'], .perfil-avatar", content: "Foto e dados básicos do perfil." },
      { target: "[data-tour='perfil.atuacao'], .perfil-atuacao", content: "Atuação por categoria: marque o que você faz." },
      { target: "[data-tour='perfil.portfolio'], .perfil-documentos-section", content: "Portfólio: imagens e PDF." },
      { target: "[data-tour='perfil.salvar'], .perfil-salvar", content: "Salvar suas alterações." },
    ],
  },
];

/* =================== Header (uma vez global) =================== */
function buildHeaderSteps(): Step[] {
  const hasRegister = typeof window !== "undefined" && !!document.querySelector('[data-tour="header-register"]');
  const hasLogin = typeof window !== "undefined" && !!document.querySelector('[data-tour="header-login"]');

  const firstTarget = hasRegister
    ? '[data-tour="header-register"]'
    : hasLogin
    ? '[data-tour="header-login"]'
    : '[data-tour="header-logo"]';

  const raw: Step[] = [
    {
      target: firstTarget,
      content: hasRegister
        ? "Crie sua conta para publicar, responder demandas e falar com compradores."
        : hasLogin
        ? "Entre no seu perfil para gerenciar suas publicações e contatos."
        : "Aqui você volta sempre para o início.",
      disableBeacon: true,
      placement: "bottom",
    },
    { target: '[data-tour="header-logo"]', content: "Clique no logo para voltar ao início.", placement: "bottom" },
    { target: '[data-tour="header-nav-produtos"]', content: "Vitrine: máquinas, peças e serviços." },
    { target: '[data-tour="header-nav-demandas"]', content: "Feed de Demandas: veja pedidos e ofereça soluções." },
    { target: '[data-tour="header-nav-painel"]', content: "Painel: gerencie suas publicações e contatos." },
  ];
  return uniqByTarget(patchStepsForViewport(raw));
}

/* =================== IDs / grupos =================== */
const routeGroupFrom = (pathname: string) => (pathname || "/").split("/")[1] || "home";
const matchRouteSteps = (pathname: string): Step[] => {
  const c = ROUTE_STEPS.filter((r) => pathname === r.pattern || pathname.startsWith(r.pattern))
                       .sort((a, b) => b.pattern.length - a.pattern.length);
  return c[0]?.steps ?? [];
};
const stepId = (group: string, s: Step) => {
  const t = String(s.target || "");
  const c = typeof s.content === "string" ? s.content : JSON.stringify(s.content);
  const p = String(s.placement || "");
  return `${group}:${hashStr(`${t}|${c}|${p}`)}`;
};

/* =================== Componente interno =================== */
function OnboardingInner() {
  const pathnameRaw = usePathname() || "/";
  const pathname = basePath(pathnameRaw);
  const search = useSearchParams();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [validNow, setValidNow] = useState(false);
  const [firstReady, setFirstReady] = useState(false);

  const startedRef = useRef(false);
  const runningRef = useRef(false); // <- evita invalidar enquanto está rodando
  const resizeTimer = useRef<number | null>(null);
  const mutationObs = useRef<MutationObserver | null>(null);
  const firstObserver = useRef<IntersectionObserver | null>(null);
  const registryRef = useRef<Record<string, { order: number; steps: Step[] }>>({});

  const forcedGroupParam = (search?.get("tour") || "").toLowerCase();
  const inferredGroup = routeGroupFrom(pathname);
  const activeGroup =
    forcedGroupParam && !["1", "true", "on"].includes(forcedGroupParam) ? forcedGroupParam : inferredGroup;

  /* API global */
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).pedraumTour = {
      expose: (key: string, el: HTMLElement | null) => { if (key && el) el.setAttribute("data-tour-key", key); },
      start: (flow: string) => {
        try { localStorage.removeItem(KEY_GROUP_DONE(flow || activeGroup)); } catch {}
        const url = new URL(window.location.href);
        url.searchParams.set("tour", flow || "on");
        window.history.replaceState({}, "", url.toString());
        startedRef.current = false;
        setRun(false);
        setSteps((s) => s);
      },
      reset: (flow?: string) => {
        try {
          if (flow) localStorage.removeItem(KEY_GROUP_DONE(flow));
          else {
            localStorage.removeItem(KEY_SEEN);
            ["home","vitrine","demandas","painel","perfil","admin","header"].forEach((g)=>localStorage.removeItem(KEY_GROUP_DONE(g)));
          }
        } catch {}
      },
    };
    return () => { delete (window as any).pedraumTour; };
  }, [activeGroup]);

  /* Registro externo */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: any) => {
      const detail = e?.detail || {};
      const group = String(detail.group || inferredGroup || "default");
      const order = Number(detail.order ?? 2);
      const raw: any[] = Array.isArray(detail.steps) ? detail.steps : [];
      const norm: Step[] = raw
        .map((s) => (s?.target ? s : s?.selector ? { ...s, target: s.selector } : null))
        .filter(Boolean) as Step[];
      registryRef.current[group] = { order, steps: uniqByTarget(patchStepsForViewport(norm)) };
      setSteps((s) => s);
    };
    window.addEventListener("pedraum:tour-register", handler);
    return () => window.removeEventListener("pedraum:tour-register", handler);
  }, [inferredGroup]);

  /* Merge final: header (0) -> auto (1) -> registrados (2) -> route fallback (3) */
  const computed = useMemo(() => {
    const header = buildHeaderSteps();
    const auto = autoStepsFromDOM();
    const regs = registryRef.current[activeGroup]?.steps ?? [];
    const route = matchRouteSteps(pathname);

    const tagged: Array<{ order: number; group: string; steps: Step[] }> = [
      { order: 0, group: "header",      steps: header },
      { order: 1, group: activeGroup,   steps: auto   },
      { order: 2, group: activeGroup,   steps: regs   },
      { order: 3, group: activeGroup,   steps: route  },
    ];

    return tagged.sort((a,b)=>a.order-b.order).flatMap(t => t.steps.map(s => ({group:t.group, step:s})));
  }, [pathname, activeGroup, registryRef.current]);

  /* Monta + filtra por steps ainda não vistos */
  useEffect(() => {
    let alive = true;
    startedRef.current = false;
    runningRef.current = false;
    setRun(false);
    setSteps([]);
    setValidNow(false);
    setFirstReady(false);

    (async () => {
      await sleep(80);

      const seen = getSeenSet();
      const fresh = computed.filter(({group, step}) => !seen.has(stepId(group, step)));

      const hasHeaderFresh = fresh.some((x)=>x.group==="header");
      if (isGroupDone(activeGroup) && !hasHeaderFresh) {
        setSteps([]); setValidNow(false);
        return;
      }

      const onlySteps = fresh.map((x)=>x.step);
      const safe = await waitAndFilterTargets(
        uniqByTarget(patchStepsForViewport(onlySteps)),
        { minOk: 1, retries: 48, gapMs: 120 },
      );

      if (!alive) return;

      setSteps(safe);
      const ok = safe.every((s) => typeof s.target === "string" && exists(String(s.target)));
      setValidNow(ok);

      const first = safe.find((s) => typeof s.target === "string" && q(String(s.target)));
      if (first) {
        const el = q(String(first.target));
        if (el) {
          if (firstObserver.current) firstObserver.current.disconnect();
          firstObserver.current = new IntersectionObserver(
            (entries) => {
              const e = entries[0];
              const inView = !!e?.isIntersecting;
              setFirstReady(inView);
            },
            { threshold: 0.15 }
          );
          firstObserver.current.observe(el);
          setFirstReady(true); // deixa o Joyride rolar e ele mesmo faz scroll
        }
      }
      await raf();
    })();

    return () => { alive = false; firstObserver.current?.disconnect(); };
  }, [computed, pathname, activeGroup]);

  /* Autostart + força via query */
  useEffect(() => {
    const tourParam = (search?.get("tour") || "").toLowerCase();
    if (tourParam === "reset") {
      try {
        localStorage.removeItem(KEY_SEEN);
        ["home","vitrine","demandas","painel","perfil","admin","header"].forEach((g)=>localStorage.removeItem(KEY_GROUP_DONE(g)));
      } catch {}
      return;
    }

    const force = !!tourParam && !["reset"].includes(tourParam);
    const ready = validNow && steps.length > 0;

    if (ready && (force || !startedRef.current)) {
      startedRef.current = true;
      const t = setTimeout(() => { setRun(true); runningRef.current = true; }, 120);
      return () => clearTimeout(t);
    }
  }, [steps, validNow, search]);

  /* Revalidação dinâmica — NÃO derruba o tour enquanto estiver rodando */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const softRecheck = () => {
      if (resizeTimer.current) window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        if (runningRef.current) return; // não invalida no meio do tour
        const ok = steps.every((s) => typeof s.target === "string" && exists(String(s.target)));
        setValidNow(ok);
        if (!ok) { setRun(false); startedRef.current = false; }
      }, 140);
    };

    window.addEventListener("resize", softRecheck);

    if (!mutationObs.current) {
      mutationObs.current = new MutationObserver(() => {
        if (runningRef.current) return;
        const ok = steps.every((s) => typeof s.target === "string" && exists(String(s.target)));
        setValidNow(ok);
      });
      mutationObs.current.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "class", "data-state", "aria-expanded"],
      });
    }
    return () => {
      window.removeEventListener("resize", softRecheck);
      mutationObs.current?.disconnect();
      mutationObs.current = null;
    };
  }, [steps]);

  /* Callback: marca vistos + encerra grupo se acabou */
  const onCb = (data: CallBackProps) => {
    const { status } = data;
    if (typeof window !== "undefined" && steps.length) {
      const seen = getSeenSet();
      steps.forEach((s) => {
        const belongsToHeader = typeof s.target === "string" && String(s.target).includes("header-");
        const g = belongsToHeader ? "header" : activeGroup;
        seen.add(stepId(g, s));
      });
      saveSeenSet(seen);
    }

    const finished = status === STATUS.FINISHED || status === STATUS.SKIPPED;
    if (finished) {
      try {
        const all = [
          ...matchRouteSteps(pathname),
          ...autoStepsFromDOM(),
          ...(registryRef.current[activeGroup]?.steps ?? []),
        ];
        const seen = getSeenSet();
        const remaining = all.filter((s) => !seen.has(stepId(activeGroup, s)));
        if (remaining.length === 0) markGroupDone(activeGroup);
      } catch {}

      setRun(false);
      runningRef.current = false;
      startedRef.current = false;
    }
  };

  if (!steps.length || !validNow) return null;

  const mobile = isMobile();
  const spotlightPadding = mobile ? 8 : 12;

  return (
    <Joyride
      key={`${pathname}:${activeGroup}:${mobile ? "m" : "d"}`}
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      /* Auto-scroll confiável (resolve “começa e pára”) */
      scrollToFirstStep
      scrollOffset={getScrollOffset()}
      disableScrolling={false}
      spotlightClicks
      callback={onCb}
      locale={{ back: "Voltar", close: "Fechar", last: "Concluir", next: "Próximo", skip: "Pular" }}
      disableOverlay={false}
      floaterProps={{ disableAnimation: false, hideArrow: false, offset: mobile ? 6 : 10 }}
      styles={{
        options: {
          primaryColor: "#f97316",
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          arrowColor: "#ffffff",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 14,
          padding: mobile ? "14px 14px" : "16px 18px",
          maxWidth: mobile ? 260 : 420,
          boxShadow: "0 10px 25px rgba(2,6,23,.18), 0 2px 8px rgba(2,6,23,.08)",
        },
        buttonNext: { borderRadius: 10, fontWeight: 700 },
        buttonBack: { borderRadius: 10 },
        buttonSkip: { borderRadius: 10 },
        spotlight: {
          borderRadius: 12,
          boxShadow: "0 0 0 2px rgba(249,115,22,.2), 0 0 0 9999px rgba(15,23,42,.45)",
        },
      }}
      spotlightPadding={spotlightPadding}
    />
  );
}

/* =================== Export com Suspense =================== */
export default function OnboardingTour() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

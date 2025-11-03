// components/OnboardingTour.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { usePathname, useSearchParams } from "next/navigation";

/* ============================================================
 * Helpers centrais (robustos e seguros para SSR)
 * ============================================================ */
const basePath = (p: string) => (p || "/").split("?")[0].replace(/\/+$/, "") || "/";
const LS_KEY = (route: string, group?: string) =>
  `pedraum_tour_done:${route}${group ? `:${group}` : ""}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const isMobile = () =>
  typeof window !== "undefined" ? window.innerWidth <= 768 : false;

const q = (sel: string): HTMLElement | null => {
  try {
    return document.querySelector(sel) as HTMLElement | null;
  } catch {
    return null;
  }
};

const isVisible = (el: HTMLElement | null) => {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0)
    return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const inViewport = (el: HTMLElement | null, pad = 8) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  return r.top >= pad && r.left >= pad && r.bottom <= vh - pad && r.right <= vw - pad;
};

const exists = (sel: string) => {
  const el = q(sel);
  return !!el && isVisible(el);
};

function uniqByTarget(steps: Step[]) {
  const seen = new Set<string>();
  return steps.filter((s) => {
    const key = String(s.target || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Aguarda até ter N alvos válidos e retorna apenas os válidos */
async function waitAndFilterTargets(
  steps: Step[],
  { minOk = 1, retries = 30, gapMs = 120 }: { minOk?: number; retries?: number; gapMs?: number } = {},
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

/** Compensa header fixo no scroll */
const getScrollOffset = () => {
  try {
    const header =
      (document.querySelector("header") as HTMLElement) ||
      (document.querySelector('[data-tour="app-header"]') as HTMLElement);
    const h = header ? header.getBoundingClientRect().height : 0;
    return Math.min(Math.max(h, 56), 120) + 12;
  } catch {
    return 72;
  }
};

/** Posição segura para mobile */
const safePlacement = (p?: Step["placement"]) => {
  if (isMobile()) return "bottom";
  return p || "auto";
};

/** Ajustes responsivos e fallbacks de alvo */
function patchStepsForViewport(steps: Step[]): Step[] {
  const mobile = isMobile();
  return steps.map((s) => {
    const t = typeof s.target === "string" ? (s.target as string) : "";
    let target = t;

    // Fallbacks comuns em mobile: navegação dentro do menu hambúrguer
    const maybeFallbacks: Record<string, string> = {
      '[data-tour="header-nav-produtos"]': '[data-tour="header-hamburger"]',
      '[data-tour="header-nav-demandas"]': '[data-tour="header-hamburger"]',
      '[data-tour="header-nav-painel"]': '[data-tour="header-hamburger"]',
    };
    if (mobile && maybeFallbacks[t] && !exists(t) && exists(maybeFallbacks[t])) {
      target = maybeFallbacks[t];
    }

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

/* ============================================================
 * Steps padrão (fallback) por rota
 * ============================================================ */
const ROUTE_STEPS: Array<{ pattern: string; steps: Step[] }> = [
  {
    pattern: "/",
    steps: [
      { target: ".home-hero-section", content: "Bem-vindo! Destaque principal da Pedraum.", disableBeacon: true },
      { target: ".home-hero-cta", content: "Atalho para começar: crie uma demanda ou anuncie." },
      { target: ".demandas-section", content: "Demandas recentes do mercado." },
      { target: ".machines-section", content: "Vitrine de máquinas/produtos." },
      { target: ".testimonials-section", content: "Depoimentos de quem já usa a plataforma." },
    ],
  },
  {
    pattern: "/painel",
    steps: [
      { target: ".painel-oportunidades, [data-tour='tile-oportunidades']", content: "Veja oportunidades enviadas para você.", disableBeacon: true },
      { target: ".painel-minhas-demandas, [data-tour='tile-minhas-demandas']", content: "Gerencie suas demandas publicadas." },
      { target: ".painel-produtos, [data-tour='tile-produtos']", content: "Gerencie seus produtos/máquinas." },
      { target: ".painel-servicos, [data-tour='tile-servicos']", content: "Gerencie seus serviços oferecidos." },
      { target: ".painel-notificacoes, [data-tour='tile-notificacoes']", content: "Notificações e novidades da sua conta." },
    ],
  },
  {
    pattern: "/perfil",
    steps: [
      { target: "[data-tour='perfil.avatar']", content: "Foto e dados básicos do perfil.", disableBeacon: true },
      { target: "[data-tour='perfil.atuacao']", content: "Atuação por categoria: marque o que você faz e descreva." },
      { target: "[data-tour='perfil.portfolio']", content: "Envie imagens e um PDF opcional para seu portfólio." },
      { target: "[data-tour='perfil.salvar']", content: "Clique aqui para salvar todas as alterações." },
    ],
  },
  {
    pattern: "/vitrine",
    steps: [
      { target: '[data-tour="vitrine.filtros"]', content: "Refine sua busca pelos filtros principais.", disableBeacon: true },
      { target: '[data-tour="vitrine.filtro-busca"]', content: "Pesquise por nome, categoria ou descrição." },
      { target: '[data-tour="vitrine.filtro-categoria"]', content: "Filtre rapidamente pela categoria do catálogo." },
      { target: '[data-tour="vitrine.filtro-estado"]', content: "Filtre por estado (depois selecione a cidade)." },
      { target: '[data-tour="vitrine.grid"]', content: "Resultados da vitrine." },
      { target: '[data-tour="vitrine.card"]', content: "Este é um card de item." },
      { target: '[data-tour="vitrine.card.botao"]', content: "Abra os detalhes do item." },
      { target: '[data-tour="vitrine.cta-novo-produto"]', content: "Publique um novo produto/máquina." },
      { target: '[data-tour="vitrine.cta-novo-servico"]', content: "Ou publique um serviço." },
    ],
  },
];

/* ============================================================
 * Header sempre primeiro
 * ============================================================ */
function buildHeaderSteps(): Step[] {
  const hasRegister =
    typeof window !== "undefined" && !!document.querySelector('[data-tour="header-register"]');
  const hasLogin =
    typeof window !== "undefined" && !!document.querySelector('[data-tour="header-login"]');

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
    { target: '[data-tour="header-logo"]', content: "Clique no logo para voltar ao início a qualquer momento.", placement: "bottom" },
    { target: '[data-tour="header-nav-produtos"]', content: "Vitrine: encontre máquinas, peças e serviços com filtros avançados." },
    { target: '[data-tour="header-nav-demandas"]', content: "Feed de Demandas: veja pedidos de compradores e ofereça soluções." },
    { target: '[data-tour="header-nav-painel"]', content: "Painel: gerencie suas publicações, contatos e notificações." },
    { target: '[data-tour="header-hamburger"]', content: "No celular, use este menu para navegar rapidamente por toda a plataforma." },
  ];

  return uniqByTarget(patchStepsForViewport(raw));
}

/* ============================================================
 * Componente interno
 * ============================================================ */
function OnboardingInner() {
  const pathnameRaw = usePathname() || "/";
  thePath: {
  }
  const pathname = basePath(pathnameRaw);
  const search = useSearchParams();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [validNow, setValidNow] = useState(false);
  const [firstReady, setFirstReady] = useState(false); // garante 1º alvo visível no viewport

  // registry de steps externos (via evento)
  const registryRef = useRef<Record<string, { order: number; steps: Step[] }>>({});
  const startedRef = useRef(false);
  const resizeTimer = useRef<number | null>(null);
  const mutationObs = useRef<MutationObserver | null>(null);
  const firstObserver = useRef<IntersectionObserver | null>(null);

  // Grupo ativo: ?tour=perfil → "perfil"; senão, deduz por rota
  const forcedGroupParam = (search?.get("tour") || "").toLowerCase();
  const groupFromPath = pathname.split("/")[1] || "home";
  const activeGroup =
    forcedGroupParam && !["1", "true", "on"].includes(forcedGroupParam)
      ? forcedGroupParam
      : groupFromPath;

  /* API global: expose/start/reset */
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).pedraumTour = {
      expose: (key: string, el: HTMLElement | null) => {
        if (key && el) el.setAttribute("data-tour-key", key);
      },
      start: (flow: string) => {
        try {
          localStorage.removeItem(LS_KEY(pathname, flow));
        } catch {}
        const url = new URL(window.location.href);
        url.searchParams.set("tour", flow || "on");
        window.history.replaceState({}, "", url.toString());
        startedRef.current = false;
        setRun(false);
        setSteps((s) => s);
      },
      reset: (flow?: string) => {
        try {
          localStorage.removeItem(LS_KEY(pathname, flow || activeGroup));
        } catch {}
      },
    };
    return () => {
      delete (window as any).pedraumTour;
    };
  }, [pathname, activeGroup]);

  /* Registro de steps vindos das páginas (evento) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: any) => {
      const detail = e?.detail || {};
      const group = String(detail.group || groupFromPath || "default");
      const order = Number(detail.order ?? 1);
      const rawSteps: any[] = Array.isArray(detail.steps) ? detail.steps : [];
      const norm: Step[] = rawSteps
        .map((s) => (s?.target ? s : s?.selector ? { ...s, target: s.selector } : null))
        .filter(Boolean) as Step[];
      registryRef.current[group] = {
        order,
        steps: uniqByTarget(patchStepsForViewport(norm)),
      };
      setSteps((s) => s); // força recomputar
    };
    window.addEventListener("pedraum:tour-register", handler);
    return () => window.removeEventListener("pedraum:tour-register", handler);
  }, [groupFromPath]);

  /* Merge: header → registrados(order) → fallback rota */
  const computedSteps = useMemo(() => {
    const header = buildHeaderSteps();
    const routeDef =
      ROUTE_STEPS.find((r) => r.pattern === pathname) ||
      ROUTE_STEPS.find((r) => r.pattern === `/${groupFromPath}`);
    const routeSteps = routeDef?.steps ?? [];
    const regs = registryRef.current || {};
    const current = regs[activeGroup];

    const tagged: Array<{ order: number; steps: Step[] }> = [
      { order: 0, steps: header },
      ...(current ? [current] : []),
      { order: 2, steps: routeSteps },
    ];

    const merged = uniqByTarget(tagged.sort((a, b) => a.order - b.order).flatMap((t) => t.steps));
    return patchStepsForViewport(merged);
  }, [pathname, activeGroup, groupFromPath, registryRef.current]);

  /* Monta steps aguardando DOM e valida antes de renderizar Joyride */
  useEffect(() => {
    let alive = true;
    startedRef.current = false;
    setRun(false);
    setSteps([]);
    setValidNow(false);
    setFirstReady(false);

    (async () => {
      await sleep(80);
      const safe = await waitAndFilterTargets(computedSteps, { minOk: 1, retries: 36, gapMs: 100 });
      if (!alive) return;
      setSteps(safe);
      const ok = safe.every((s) => typeof s.target === "string" && exists(String(s.target)));
      setValidNow(ok);

      // Observa o primeiro alvo (evita overlay sem ancoragem/fora do viewport)
      const first = safe.find((s) => typeof s.target === "string" && q(String(s.target)));
      if (first && typeof window !== "undefined") {
        const el = q(String(first.target));
        if (el) {
          if (firstObserver.current) firstObserver.current.disconnect();
          firstObserver.current = new IntersectionObserver(
            (entries) => {
              const e = entries[0];
              setFirstReady(e && e.isIntersecting && inViewport(el));
            },
            { threshold: 0.3 },
          );
          firstObserver.current.observe(el);
          // fallback imediato caso já esteja visível
          setFirstReady(inViewport(el));
        }
      }
      await raf();
    })();

    return () => {
      alive = false;
      firstObserver.current?.disconnect();
    };
  }, [computedSteps, pathname]);

  /* Política de start / persistência
     -> AGORA É AUTOMÁTICO: se não concluiu antes, inicia assim que estiver pronto */
  useEffect(() => {
    const tourParam = forcedGroupParam; // "on", "perfil", etc.
    const key = LS_KEY(pathname, activeGroup);

    // reset explícito
    if (tourParam === "reset") {
      try {
        localStorage.removeItem(key);
      } catch {}
      return;
    }

    const force =
      ["1", "true", "on", "start", "perfil", "painel", "vitrine", "demandas"].includes(
        tourParam,
      ) || !!tourParam;

    let shouldRun = false;
    try {
      shouldRun = !localStorage.getItem(key);
    } catch {
      shouldRun = true;
    }

    const ready = validNow && steps.length > 0 && firstReady;

    // AUTOMÁTICO: se é a primeira vez (shouldRun) e está pronto, inicia.
    if (ready && (force || shouldRun) && !startedRef.current) {
      startedRef.current = true;
      const t = setTimeout(() => setRun(true), 150);
      return () => clearTimeout(t);
    }
  }, [pathname, forcedGroupParam, activeGroup, steps, validNow, firstReady]);

  /* Revalidação em resize/mutações (pausa se alvo sumir) */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      if (resizeTimer.current) window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        const ok = steps.every((s) => typeof s.target === "string" && exists(String(s.target)));
        setValidNow(ok);
        if (!ok) {
          setRun(false);
          startedRef.current = false;
        }
      }, 120);
    };

    window.addEventListener("resize", onResize);

    if (!mutationObs.current) {
      mutationObs.current = new MutationObserver(() => {
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
      window.removeEventListener("resize", onResize);
      mutationObs.current?.disconnect();
      mutationObs.current = null;
    };
  }, [steps]);

  /* Persistência ao terminar/pular */
  const onCb = (data: CallBackProps) => {
    const { status } = data;
    const finished = status === STATUS.FINISHED || status === STATUS.SKIPPED;
    if (finished) {
      try {
        localStorage.setItem(LS_KEY(pathname, activeGroup), "true");
      } catch {}
      setRun(false);
      startedRef.current = false;
    }
  };

  // Se não há steps válidos ou o primeiro ainda não está pronto/visível, não renderiza Joyride
  if (!steps.length || !validNow || !firstReady) return null;

  // Estilos
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
      scrollToFirstStep={false}
      scrollOffset={getScrollOffset()}
      disableScrolling={false}
      spotlightClicks
      callback={onCb}
      locale={{ back: "Voltar", close: "Fechar", last: "Concluir", next: "Próximo", skip: "Pular" }}
      disableOverlay={false}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: mobile ? 6 : 10,
      }}
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

/* ============================================================
 * Export com Suspense (Next 14/15)
 * ============================================================ */
export default function OnboardingTour() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { usePathname, useSearchParams } from "next/navigation";

/* -------------------- Utils robustos -------------------- */
const basePath = (p: string) => (p || "/").split("?")[0].replace(/\/+$/, "") || "/";
const LS_KEY = (route: string, group?: string) =>
  `pedraum_tour_done:${route}${group ? `:${group}` : ""}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const exists = (sel: string) => {
  try { return !!document.querySelector(sel); } catch { return false; }
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

/** aguarda até ter N alvos válidos e devolve SÓ os que existem */
async function waitAndFilterTargets(
  steps: Step[],
  { minOk = 1, retries = 28, gapMs = 120 }: { minOk?: number; retries?: number; gapMs?: number } = {}
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

/* -------------------- Steps padrão por rota (fallback) -------------------- */
const ROUTE_STEPS: Array<{ pattern: string; steps: Step[] }> = [
  { pattern: "/", steps: [
    { target: ".home-hero-section", content: "Bem-vindo! Destaque principal da Pedraum.", disableBeacon: true },
    { target: ".home-hero-cta", content: "Atalho para começar: crie uma demanda ou anuncie." },
    { target: ".demandas-section", content: "Demandas recentes do mercado." },
    { target: ".machines-section", content: "Vitrine de máquinas/produtos." },
    { target: ".testimonials-section", content: "Depoimentos de quem já usa a plataforma." },
  ]},

  { pattern: "/painel", steps: [
    { target: ".painel-oportunidades, [data-tour='tile-oportunidades']", content: "Veja oportunidades enviadas para você.", disableBeacon: true },
    { target: ".painel-minhas-demandas, [data-tour='tile-minhas-demandas']", content: "Gerencie suas demandas publicadas." },
    { target: ".painel-produtos, [data-tour='tile-produtos']", content: "Gerencie seus produtos/máquinas." },
    { target: ".painel-servicos, [data-tour='tile-servicos']", content: "Gerencie seus serviços oferecidos." },
    { target: ".painel-notificacoes, [data-tour='tile-notificacoes']", content: "Notificações e novidades da sua conta." },
  ]},

  { pattern: "/perfil", steps: [
    { target: "[data-tour='perfil.avatar']", content: "Foto e dados básicos do perfil.", disableBeacon: true },
    { target: "[data-tour='perfil.atuacao']", content: "Atuação por categoria: marque o que você faz e descreva." },
    { target: "[data-tour='perfil.portfolio']", content: "Envie imagens e um PDF opcional para seu portfólio." },
    { target: "[data-tour='perfil.salvar']", content: "Clique aqui para salvar todas as alterações." },
  ]},

  { pattern: "/vitrine", steps: [
    { target: '[data-tour="vitrine.filtros"]', content: "Refine sua busca pelos filtros principais.", disableBeacon: true },
    { target: '[data-tour="vitrine.filtro-busca"]', content: "Pesquise por nome, categoria ou descrição." },
    { target: '[data-tour="vitrine.filtro-categoria"]', content: "Filtre rapidamente pela categoria do catálogo." },
    { target: '[data-tour="vitrine.filtro-estado"]', content: "Filtre por estado (depois selecione a cidade)." },
    { target: '[data-tour="vitrine.grid"]', content: "Resultados da vitrine." },
    { target: '[data-tour="vitrine.card"]', content: "Este é um card de item." },
    { target: '[data-tour="vitrine.card.botao"]', content: "Abra os detalhes do item." },
    { target: '[data-tour="vitrine.cta-novo-produto"]', content: "Publique um novo produto/máquina." },
    { target: '[data-tour="vitrine.cta-novo-servico"]', content: "Ou publique um serviço." },
  ]},
];

/* -------------------- Header primeiro (sempre) -------------------- */
function buildHeaderSteps(): Step[] {
  const hasRegister = typeof window !== "undefined" && !!document.querySelector('[data-tour="header-register"]');
  const hasLogin    = typeof window !== "undefined" && !!document.querySelector('[data-tour="header-login"]');

  const firstTarget = hasRegister
    ? '[data-tour="header-register"]'
    : hasLogin
    ? '[data-tour="header-login"]'
    : '[data-tour="header-logo"]';

  const steps: Step[] = [
    {
      target: firstTarget,
      content: hasRegister
        ? "Crie sua conta para publicar, responder demandas e falar com compradores."
        : hasLogin
        ? "Entre no seu perfil para gerenciar suas publicações e contatos."
        : "Aqui você volta sempre para o início.",
      disableBeacon: true,
    },
    { target: '[data-tour="header-logo"]', content: "Clique no logo para voltar ao início a qualquer momento." },
    { target: '[data-tour="header-nav-produtos"]', content: "Vitrine: encontre máquinas, peças e serviços com filtros avançados." },
    { target: '[data-tour="header-nav-demandas"]', content: "Feed de Demandas: veja pedidos de compradores e ofereça soluções." },
    { target: '[data-tour="header-nav-painel"]', content: "Painel: gerencie suas publicações, contatos e notificações." },
    { target: '[data-tour="header-hamburger"]', content: "No celular, use este menu para navegar rapidamente por toda a plataforma." },
  ];
  return uniqByTarget(steps);
}

/* ================================================================ */

export default function OnboardingTour() {
  const pathnameRaw = usePathname() || "/";
  const pathname = basePath(pathnameRaw);
  const search = useSearchParams();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [validNow, setValidNow] = useState(false);

  // registry de steps registrados por evento: { [group]: {order, steps[]} }
  const registryRef = useRef<Record<string, { order: number; steps: Step[] }>>({});
  const startedRef = useRef(false);
  const resizeTimer = useRef<number | null>(null);

  // Grupo ativo: se ?tour=perfil → "perfil"; senão, deduz da rota (/perfil → "perfil")
  const forcedGroupParam = (search?.get("tour") || "").toLowerCase();
  const groupFromPath = pathname.split("/")[1] || "home";
  const activeGroup = forcedGroupParam && forcedGroupParam !== "1" && forcedGroupParam !== "true" && forcedGroupParam !== "on"
    ? forcedGroupParam
    : groupFromPath;

  /* API global útil para páginas (start/expose) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).pedraumTour = {
      expose: (key: string, el: HTMLElement | null) => { if (key && el) el.setAttribute("data-tour-key", key); },
      start: (flow: string) => {
        try { localStorage.removeItem(LS_KEY(pathname, flow)); } catch {}
        const url = new URL(window.location.href);
        url.searchParams.set("tour", flow || "on");
        window.history.replaceState({}, "", url.toString());
        startedRef.current = false;
        setRun(false);
        setSteps((s) => s);
      },
    };
    return () => { delete (window as any).pedraumTour; };
  }, [pathname]);

  /* Ouve registros vindos das páginas (pedraum:tour-register) */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: any) => {
      const detail = e?.detail || {};
      const group = String(detail.group || groupFromPath || "default");
      const order = Number(detail.order ?? 1);

      // aceita steps no formato { selector, title/content } ou Joyride Step (target)
      const rawSteps: any[] = Array.isArray(detail.steps) ? detail.steps : [];
      const norm: Step[] = rawSteps
        .map((s) => {
          if (s?.target) return s as Step;
          if (s?.selector) return { ...s, target: s.selector };
          return null;
        })
        .filter(Boolean) as Step[];

      registryRef.current[group] = { order, steps: uniqByTarget(norm) };
      // força reprocessar
      setSteps((s) => s);
    };

    window.addEventListener("pedraum:tour-register", handler);
    return () => window.removeEventListener("pedraum:tour-register", handler);
  }, [groupFromPath]);

  /* Computa steps da rota + registrados (header sempre primeiro) */
  const computedSteps = useMemo(() => {
    const header = buildHeaderSteps();

    // fallback por rota
    const routeDef = ROUTE_STEPS.find((r) => r.pattern === pathname) ||
                     ROUTE_STEPS.find((r) => r.pattern === `/${groupFromPath}`);
    const routeSteps = routeDef?.steps ?? [];

    // registrados por evento (mesmo grupo da rota ou do ?tour)
    const regs = registryRef.current || {};
    const current = regs[activeGroup];

    // merge com prioridade: header (0) → registrado(order) → fallback de rota (2)
    const tagged: Array<{ order: number; steps: Step[] }> = [
      { order: 0, steps: header },
      ...(current ? [current] : []),
      { order: 2, steps: routeSteps },
    ];

    const merged = uniqByTarget(tagged.sort((a, b) => a.order - b.order).flatMap((t) => t.steps));
    return merged;
  }, [pathname, activeGroup, groupFromPath, registryRef.current]);

  /* Monta steps aguardando DOM e valida tudo antes de renderizar Joyride */
  useEffect(() => {
    let alive = true;
    startedRef.current = false;
    setRun(false);
    setSteps([]);
    setValidNow(false);

    (async () => {
      await sleep(80); // header/dom
      const safe = await waitAndFilterTargets(computedSteps, { minOk: 1, retries: 28, gapMs: 120 });
      if (!alive) return;
      setSteps(safe);
      setValidNow(safe.every((s) => typeof s.target === "string" && exists(String(s.target))));
    })();

    return () => { alive = false; };
  }, [computedSteps, pathname]);

  /* Política de start / persistência */
  useEffect(() => {
    const tourParam = forcedGroupParam;
    const force = ["1","true","on","start","perfil","painel","vitrine","demandas"].includes(tourParam);
    const key = LS_KEY(pathname, activeGroup);

    if (tourParam === "reset") {
      try { localStorage.removeItem(key); } catch {}
      return;
    }

    let shouldRun = false;
    try { shouldRun = !localStorage.getItem(key); } catch { shouldRun = true; }

    if (validNow && steps.length > 0 && (force || shouldRun) && !startedRef.current) {
      startedRef.current = true;
      const t = setTimeout(() => setRun(true), 150);
      return () => clearTimeout(t);
    }
  }, [pathname, forcedGroupParam, activeGroup, steps, validNow]);

  /* Revalida em resize/zoom */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      if (resizeTimer.current) window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        const ok = steps.every((s) => typeof s.target === "string" && exists(String(s.target)));
        setValidNow(ok);
        if (!ok) { setRun(false); startedRef.current = false; }
      }, 120);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [steps]);

  /* Persistência ao terminar */
  const onCb = (data: CallBackProps) => {
    const { status } = data;
    const finished = status === STATUS.FINISHED || status === STATUS.SKIPPED;
    if (finished) {
      try { localStorage.setItem(LS_KEY(pathname, activeGroup), "true"); } catch {}
      setRun(false);
      startedRef.current = false;
    }
  };

  if (!steps.length || !validNow) return null;

  return (
    <Joyride
      key={`${pathname}:${activeGroup}`}
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableScrolling={false}
      spotlightClicks
      callback={onCb}
      locale={{ back: "Voltar", close: "Fechar", last: "Concluir", next: "Próximo", skip: "Pular" }}
      disableOverlay={false}
      spotlightPadding={0}
      styles={{
        options: {
          primaryColor: "#f97316",
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          arrowColor: "#ffffff",
          zIndex: 10000,
        },
        tooltip: { borderRadius: 14, padding: "16px 18px" },
        buttonNext: { borderRadius: 10, fontWeight: 600 },
        buttonBack: { borderRadius: 10 },
        buttonSkip: { borderRadius: 10 },
      }}
    />
  );
}

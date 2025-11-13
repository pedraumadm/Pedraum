// components/OnboardingTour.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { usePathname, useSearchParams } from "next/navigation";

/* ============================================================
 *  >>> Onboarding sênior Pedraum — build estável v2.3 <<<
 *  - Sem scroll automático chato
 *  - Tour ativo em desktop e mobile
 *  - IDs de passo estáveis (group + target)
 *  - Grupos marcados como concluídos via localStorage
 *  - Auto-discovery por data-attributes (data-tour-step)
 *  - API global: window.pedraumTour.{start,reset,expose}
 * ============================================================ */

const TOUR_VERSION = "v2.3";

/* ---------- Storage keys ---------- */
const KEY_SEEN = `pedraum_tour_seen:${TOUR_VERSION}`; // JSON: string[]
const KEY_GROUP_DONE = (g: string) =>
  `pedraum_tour_done_group:${TOUR_VERSION}:${g}`;

/* ---------- Utils básicos ---------- */
const basePath = (p: string) =>
  (p || "/").split("?")[0].replace(/\/+$/, "") || "/";
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
  const cs = window.getComputedStyle(el);
  if (
    cs.visibility === "hidden" ||
    cs.display === "none" ||
    Number(cs.opacity) === 0
  )
    return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

const exists = (sel: string) => {
  const el = q(sel);
  return !!el && isVisible(el);
};

/* ---------- Visto/Concluído ---------- */
function getSeenSet(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(KEY_SEEN) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSeenSet(seen: Set<string>) {
  try {
    localStorage.setItem(KEY_SEEN, JSON.stringify(Array.from(seen)));
  } catch {}
}
const isGroupDone = (g: string) => {
  try {
    return !!localStorage.getItem(KEY_GROUP_DONE(g));
  } catch {
    return false;
  }
};
const markGroupDone = (g: string) => {
  try {
    localStorage.setItem(KEY_GROUP_DONE(g), "1");
  } catch {}
};

/* ---------- Placement seguro ---------- */
const safePlacement = (p?: Step["placement"]) => (isMobile() ? "bottom" : p || "auto");

/* ---------- IDs de passo: estáveis (group + target) ---------- */
const stepId = (group: string, s: Step) => {
  const t = String(s.target || "");
  return `${group}:${t}`;
};

/* ---------- Filtro de duplicados por target ---------- */
function uniqByTarget(steps: Step[]) {
  const seen = new Set<string>();
  return steps.filter((s) => {
    const key = String(s.target || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ---------- Espera elementos válidos ---------- */
async function waitAndFilterTargets(
  steps: Step[],
  {
    minOk = 1,
    retries = 42,
    gapMs = 120,
  }: { minOk?: number; retries?: number; gapMs?: number } = {},
) {
  if (typeof window === "undefined") return [];
  let tries = 0;
  while (tries < retries) {
    const ok = steps.filter(
      (s) => typeof s.target === "string" && exists(String(s.target)),
    );
    if (ok.length >= minOk) return ok;
    tries++;
    await sleep(gapMs);
    await raf();
  }
  return steps.filter(
    (s) => typeof s.target === "string" && exists(String(s.target)),
  );
}

/* ---------- Espera layout estabilizar (anti-quebra ao iniciar) ---------- */
async function waitForStableLayout(opts: { retries?: number; gapMs?: number } = {}) {
  const { retries = 50, gapMs = 80 } = opts;
  if (typeof window === "undefined") return;
  let lastH = 0,
    stableCount = 0,
    tries = 0;
  while (tries < retries) {
    await raf();
    const h = document.documentElement.scrollHeight;
    if (h === lastH) stableCount++;
    else stableCount = 0;
    lastH = h;
    // 3 leituras seguidas iguais = estável
    if (stableCount >= 3) break;
    await sleep(gapMs);
    tries++;
  }
}

/* ---------- Mobile/hambúrguer fallbacks ---------- */
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
    if (mobile && fallback[t] && !exists(t) && exists(fallback[t]))
      target = fallback[t];
    return {
      ...s,
      target,
      placement: safePlacement(s.placement),
      disableBeacon: true,
      offset: mobile ? 10 : 12,
      styles: {
        ...(s.styles || {}),
        tooltip: {
          ...(s.styles?.tooltip || {}),
          maxWidth: mobile ? 280 : 440,
        },
      },
    };
  });
}

/* ---------- Auto-discovery via data-attributes ---------- */
function getDomSelector(el: HTMLElement): string | null {
  if (!el) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tour = el.getAttribute("data-tour");
  if (tour) return `[data-tour="${tour}"]`;
  // fallback curto
  const parts: string[] = [];
  let cur: HTMLElement | null = el,
    depth = 0;
  while (cur && depth < 3) {
    let sel = cur.tagName.toLowerCase();
    if (cur.classList.length)
      sel +=
        "." +
        Array.from(cur.classList)
          .slice(0, 2)
          .map((c) => CSS.escape(c))
          .join(".");
    parts.unshift(sel);
    cur = cur.parentElement;
    depth++;
  }
  return parts.length ? parts.join(" > ") : null;
}

function autoStepsFromDOM(): Step[] {
  if (typeof window === "undefined") return [];
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-tour-step]"),
  );
  const parsed = nodes
    .map((el) => {
      const order = Number(el.getAttribute("data-tour-step") || "0");
      const content = el.getAttribute("data-tour-content") || "";
      const placement = el.getAttribute(
        "data-tour-placement",
      ) as Step["placement"] | null;
      const explicitTarget = el.getAttribute("data-tour-target");
      const target =
        explicitTarget && explicitTarget.trim().length > 0
          ? explicitTarget
          : getDomSelector(el);
      if (!content || !target) return null;
      return {
        order: isNaN(order) ? 0 : order,
        step: {
          target,
          content,
          placement: placement || undefined,
          disableBeacon: true,
        } as Step,
      };
    })
    .filter(Boolean) as { order: number; step: Step }[];
  return uniqByTarget(
    patchStepsForViewport(
      parsed.sort((a, b) => a.order - b.order).map((x) => x.step),
    ),
  );
}

/* ---------- Fallbacks por rota ---------- */
const ROUTE_STEPS: Array<{ pattern: string; steps: Step[] }> = [
  {
    pattern: "/",
    steps: [
      {
        target: ".home-hero-section, [data-tour='home.hero']",
        content:
          "Bem-vindo à Pedraum: o hub de negócios da mineração e construção.",
        disableBeacon: true,
      },
      {
        target: ".home-hero-cta, [data-tour='home.cta']",
        content:
          "Comece agora: publique um produto/serviço ou crie uma demanda.",
      },
      {
        target: ".demandas-section, [data-tour='home.demandas']",
        content: "Veja quem está comprando agora e gere leads qualificados.",
      },
      {
        target: ".machines-section, [data-tour='home.vitrine']",
        content: "Destaques da vitrine — entre e negocie direto.",
      },
    ],
  },
  {
    pattern: "/vitrine",
    steps: [
      {
        target: '[data-tour="vitrine.filtros"], .vitrine-filtros',
        content: "Refine por categoria, estado, cidade e mais.",
      },
      {
        target: '[data-tour="vitrine.filtro-busca"], .vitrine-busca',
        content: "Pesquise por nome, marca ou palavra-chave.",
      },
      {
        target: '[data-tour="vitrine.grid"], .vitrine-grid',
        content:
          "Resultados disponíveis. Clique para ver detalhes e falar no WhatsApp.",
      },
      {
        target: '[data-tour="vitrine.cta-novo-produto"], .vitrine-cta-produto',
        content: "Anuncie um produto ou máquina em minutos.",
      },
      {
        target: '[data-tour="vitrine.cta-novo-servico"], .vitrine-cta-servico',
        content: "Ofereça seu serviço e seja encontrado.",
      },
    ],
  },
  {
    pattern: "/demandas",
    steps: [
      {
        target: '[data-tour="demandas.filtros"], .demandas-filtros',
        content:
          "Selecione região, categoria e status para achar pedidos certos.",
      },
      {
        target: '[data-tour="demandas.lista"], .demandas-lista',
        content: "Escolha a demanda e apresente sua proposta.",
      },
      {
        target: '[data-tour="demandas.cta-criar"], .demandas-cta',
        content:
          "Precisa de algo? Crie um pedido e receba contatos de fornecedores.",
      },
    ],
  },
  {
    pattern: "/painel",
    steps: [
      {
        target: ".painel-oportunidades, [data-tour='tile-oportunidades']",
        content: "Alertas que combinam com seu perfil e atuação.",
      },
      {
        target: ".painel-minhas-demandas, [data-tour='tile-minhas-demandas']",
        content: "Edite, pause e acompanhe respostas.",
      },
      {
        target: ".painel-produtos, [data-tour='tile-produtos']",
        content: "Gerencie anúncios, estoque e visibilidade.",
      },
      {
        target: ".painel-servicos, [data-tour='tile-servicos']",
        content: "Mostre o que você faz e feche contratos.",
      },
      {
        target:
          ".painel-notificacoes, [data-tour='tile-notificacoes']",
        content: "Mensagens, avisos e atualizações da plataforma.",
      },
    ],
  },
  {
    pattern: "/perfil",
    steps: [
      {
        target: "[data-tour='perfil.avatar'], .perfil-avatar",
        content:
          "Complete seu perfil para aumentar a confiança nas negociações.",
      },
      {
        target: "[data-tour='perfil.atuacao'], .perfil-atuacao",
        content:
          "Marque sua atuação por categoria — isso melhora as indicações.",
      },
      {
        target:
          "[data-tour='perfil.portfolio'], .perfil-documentos-section",
        content: "Anexe provas do seu trabalho e ganhe destaque.",
      },
      {
        target: "[data-tour='perfil.salvar'], .perfil-salvar",
        content:
          "Guarde as alterações para manter seu cadastro sempre atualizado.",
      },
    ],
  },
];

/* ---------- Header (uma vez global) ---------- */
function buildHeaderSteps(): Step[] {
  const hasRegister =
    typeof window !== "undefined" &&
    !!document.querySelector('[data-tour="header-register"]');
  const hasLogin =
    typeof window !== "undefined" &&
    !!document.querySelector('[data-tour="header-login"]');

  const firstTarget = hasRegister
    ? '[data-tour="header-register"]'
    : hasLogin
    ? '[data-tour="header-login"]'
    : '[data-tour="header-logo"]';

  const raw: Step[] = [
    {
      target: firstTarget,
      content: hasRegister
        ? "Entre para publicar, responder demandas e falar com compradores."
        : hasLogin
        ? "Entre no seu perfil para gerenciar suas publicações e contatos."
        : "Aqui você volta sempre para o início.",
      disableBeacon: true,
      placement: "bottom",
    },
    {
      target: '[data-tour="header-logo"]',
      content: "Clique no logo para voltar ao início.",
      placement: "bottom",
    },
    {
      target: '[data-tour="header-nav-produtos"]',
      content: "Vitrine: máquinas, peças e serviços.",
    },
    {
      target: '[data-tour="header-nav-demandas"]',
      content: "Pedidos reais do mercado — ofereça sua solução.",
    },
    {
      target: '[data-tour="header-nav-painel"]',
      content: "Painel: gerencie suas publicações e contatos.",
    },
  ];
  return uniqByTarget(patchStepsForViewport(raw));
}

/* ---------- Rota / Grupos ---------- */
const routeGroupFrom = (pathname: string) =>
  (pathname || "/").split("/")[1] || "home";
const matchRouteSteps = (pathname: string): Step[] => {
  const c = ROUTE_STEPS.filter(
    (r) => pathname === r.pattern || pathname.startsWith(r.pattern),
  ).sort((a, b) => b.pattern.length - a.pattern.length);
  return c[0]?.steps ?? [];
};

/* ============================================================
 *                       Componente interno
 * ============================================================ */
function OnboardingInner() {
  const pathnameRaw = usePathname() || "/";
  const pathname = basePath(pathnameRaw);
  const search = useSearchParams();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [validNow, setValidNow] = useState(false);

  const startedRef = useRef(false);
  const runningRef = useRef(false);
  const resizeTimer = useRef<number | null>(null);
  const mutationObs = useRef<MutationObserver | null>(null);
  const registryRef = useRef<Record<string, { order: number; steps: Step[] }>>(
    {},
  );
  const regsVersion = useRef(0); // evita re-renders infinitos

  const forcedGroupParam = (search?.get("tour") || "").toLowerCase();
  const inferredGroup = routeGroupFrom(pathname);
  const activeGroup =
    forcedGroupParam &&
    !["1", "true", "on", "reset"].includes(forcedGroupParam)
      ? forcedGroupParam
      : inferredGroup;

  /* ---------- API global ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).pedraumTour = {
      expose: (key: string, el: HTMLElement | null) => {
        if (key && el) el.setAttribute("data-tour-key", key);
      },
      start: (flow?: string) => {
        try {
          if (flow) localStorage.removeItem(KEY_GROUP_DONE(flow));
          const url = new URL(window.location.href);
          url.searchParams.set("tour", flow || "on");
          window.history.replaceState({}, "", url.toString());
        } catch {}
        startedRef.current = false;
        setRun(false);
        setSteps((s) => s);
      },
      reset: (flow?: string) => {
        try {
          if (flow) localStorage.removeItem(KEY_GROUP_DONE(flow));
          else {
            localStorage.removeItem(KEY_SEEN);
            ["home", "vitrine", "demandas", "painel", "perfil", "admin", "header"].forEach(
              (g) => localStorage.removeItem(KEY_GROUP_DONE(g)),
            );
          }
        } catch {}
      },
    };
    return () => {
      // @ts-ignore
      delete window.pedraumTour;
    };
  }, [activeGroup]);

  /* ---------- Registro externo de passos (opcional) ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: any) => {
      const detail = e?.detail || {};
      const group = String(detail.group || inferredGroup || "default");
      const order = Number(detail.order ?? 2);
      const raw: any[] = Array.isArray(detail.steps) ? detail.steps : [];
      const norm: Step[] = raw
        .map((s) =>
          s?.target ? s : s?.selector ? { ...s, target: s.selector } : null,
        )
        .filter(Boolean) as Step[];
      registryRef.current[group] = {
        order,
        steps: uniqByTarget(patchStepsForViewport(norm)),
      };
      regsVersion.current++;
      setSteps((s) => s); // força recompute
    };
    window.addEventListener("pedraum:tour-register", handler);
    return () => window.removeEventListener("pedraum:tour-register", handler);
  }, [inferredGroup]);

  /* ---------- Merge final: header (0) -> auto (1) -> registrados (2) -> rota (3) ---------- */
  const computedTagged = useMemo(() => {
    const header = buildHeaderSteps();
    const auto = autoStepsFromDOM();
    const regs = registryRef.current[activeGroup]?.steps ?? [];
    const route = matchRouteSteps(pathname);

    const tagged: Array<{ order: number; group: string; steps: Step[] }> = [
      { order: 0, group: "header", steps: header },
      { order: 1, group: activeGroup, steps: auto },
      { order: 2, group: activeGroup, steps: regs },
      { order: 3, group: activeGroup, steps: route },
    ];
    return tagged
      .sort((a, b) => a.order - b.order)
      .flatMap((t) => t.steps.map((s) => ({ group: t.group, step: s })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeGroup, regsVersion.current]);

  /* ---------- Montagem e filtro por "ainda não vistos" ---------- */
  useEffect(() => {
    let alive = true;
    startedRef.current = false;
    runningRef.current = false;
    setRun(false);
    setSteps([]);
    setValidNow(false);

    (async () => {
      await sleep(80);

      const tourParam = (search?.get("tour") || "").toLowerCase();
      const forcing = !!tourParam && !["reset"].includes(tourParam);

      // Se o grupo já foi concluído e não está forçando, não roda
      if (isGroupDone(activeGroup) && !forcing) {
        setSteps([]);
        setValidNow(false);
        return;
      }

      const seen = getSeenSet();
      const fresh = computedTagged.filter(
        ({ group, step }) => !seen.has(stepId(group, step)),
      );

      // Se não tiver nada novo pra ver, encerra
      if (!fresh.length) {
        setSteps([]);
        setValidNow(false);
        return;
      }

      const onlySteps = fresh.map((x) => x.step);
      const safe = await waitAndFilterTargets(
        uniqByTarget(patchStepsForViewport(onlySteps)),
        {
          minOk: 1,
          retries: 48,
          gapMs: 120,
        },
      );

      if (!alive) return;

      setSteps(safe);
      const ok = safe.every(
        (s) => typeof s.target === "string" && exists(String(s.target)),
      );
      setValidNow(ok);
      await raf();
    })();

    return () => {
      alive = false;
    };
  }, [computedTagged, pathname, activeGroup, search]);

  /* ---------- Autostart com layout estável ---------- */
  useEffect(() => {
    const tourParam = (search?.get("tour") || "").toLowerCase();
    if (tourParam === "reset") {
      try {
        localStorage.removeItem(KEY_SEEN);
        ["home", "vitrine", "demandas", "painel", "perfil", "admin", "header"].forEach(
          (g) => localStorage.removeItem(KEY_GROUP_DONE(g)),
        );
      } catch {}
      return;
    }

    const force = !!tourParam && !["reset"].includes(tourParam);
    const ready = validNow && steps.length > 0;

    if (ready && (force || !startedRef.current)) {
      startedRef.current = true;
      (async () => {
        await waitForStableLayout({ retries: 50, gapMs: 80 });
        const t = window.setTimeout(() => {
          setRun(true);
          runningRef.current = true;
        }, 80);
        return () => window.clearTimeout(t);
      })();
    }
  }, [steps, validNow, search]);

  /* ---------- Revalidação dinâmica (sem derrubar no meio) ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const softRecheck = () => {
      if (resizeTimer.current) window.clearTimeout(resizeTimer.current);
      resizeTimer.current = window.setTimeout(() => {
        if (runningRef.current) return; // não invalida no meio do tour
        const ok = steps.every(
          (s) => typeof s.target === "string" && exists(String(s.target)),
        );
        setValidNow(ok);
        if (!ok) {
          setRun(false);
          startedRef.current = false;
        }
      }, 140);
    };

    window.addEventListener("resize", softRecheck);

    if (!mutationObs.current) {
      mutationObs.current = new MutationObserver(() => {
        if (runningRef.current) return;
        const ok = steps.every(
          (s) => typeof s.target === "string" && exists(String(s.target)),
        );
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

  /* ---------- Callback: marca vistos e conclui grupo ---------- */
  const onCb = (data: CallBackProps) => {
    const { status } = data;

    // marca todos como vistos
    if (typeof window !== "undefined" && steps.length) {
      const seen = getSeenSet();
      steps.forEach((s) => {
        const belongsToHeader =
          typeof s.target === "string" &&
          String(s.target).includes("header-");
        const g = belongsToHeader ? "header" : activeGroup;
        seen.add(stepId(g, s));
      });
      saveSeenSet(seen);
    }

    // conclui grupo SEM depender do DOM
    const finished = status === STATUS.FINISHED || status === STATUS.SKIPPED;
    if (finished) {
      try {
        markGroupDone(activeGroup);
        if ((steps || []).some((s) => String(s.target).includes("header-"))) {
          markGroupDone("header");
        }
      } catch {}
      setRun(false);
      runningRef.current = false;
      startedRef.current = false;
    }
  };

  // Nada para exibir
  if (!steps.length || !validNow) return null;

  const mobile = isMobile();
  const spotlightPadding = mobile ? 10 : 12;
  const disableOverlay =
    mobile && (typeof window !== "undefined"
      ? window.innerHeight < 620
      : false);

  return (
    <Joyride
      key={`${pathname}:${activeGroup}:${mobile ? "m" : "d"}`}
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      // ✅ Não deixa Joyride mexer no scroll
      scrollToFirstStep={false}
      disableScrolling
      disableScrollParentFix
      spotlightClicks
      callback={onCb}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular",
      }}
      disableOverlay={disableOverlay}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: mobile ? 8 : 10,
      }}
      styles={{
        options: {
          primaryColor: "#f97316", // laranja Pedraum
          backgroundColor: "#ffffff",
          textColor: "#0f172a",
          arrowColor: "#ffffff",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 14,
          padding: mobile ? "14px 14px" : "16px 18px",
          maxWidth: mobile ? 280 : 440,
          boxShadow:
            "0 10px 25px rgba(2,6,23,.18), 0 2px 8px rgba(2,6,23,.08)",
        },
        buttonNext: { borderRadius: 10, fontWeight: 700 },
        buttonBack: { borderRadius: 10 },
        buttonSkip: { borderRadius: 10 },
        spotlight: {
          borderRadius: 12,
          boxShadow:
            "0 0 0 2px rgba(249,115,22,.2), 0 0 0 9999px rgba(15,23,42,.45)",
        },
      }}
      spotlightPadding={spotlightPadding}
    />
  );
}

/* ---------- Export com Suspense ---------- */
export default function OnboardingTour() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

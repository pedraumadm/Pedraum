// app/painel/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, db } from "@/firebaseConfig";
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  limit,
  doc,
  type Query,
} from "firebase/firestore";
import {
  Layers,
  ClipboardList,
  MessageCircle,
  Bell,
  Users,
  Lightbulb,
  Wallet2,
  LifeBuoy,
  LogOut,
  Inbox,
  Target,
  CircleHelp,
  X,
  Briefcase,
} from "lucide-react";

// =============== Aliases de campos/flags =================
const USER_EQ_FIELDS_NOTIFS = ["usuarioId", "userId", "uid", "recipientId", "ownerId"];
const USER_EQ_FIELDS_MSGS = ["destinatarioId", "toUserId", "usuarioId", "userId", "recipientId", "ownerId"];
const USER_ARRAY_FIELDS = ["users", "participants", "members", "recipients", "threadUsers"];
const READ_FLAGS = ["lida", "lido", "read", "seen", "visualizado", "visto"];

// =============== Helpers de consulta =====================

// monta um query usando o primeiro campo que existir
function qByAnyUserField(
  colName: string,
  uid: string,
  eqFields: string[],
  extra?: (base: Query) => Query,
): Query {
  const colRef = collection(db, colName);
  for (const f of eqFields) {
    try {
      const base = query(colRef, where(f as any, "==", uid));
      return extra ? extra(base) : base;
    } catch {
      // tenta próximo alias
    }
  }
  // fallback (scan)
  return extra ? extra(colRef as unknown as Query) : (colRef as unknown as Query);
}

// contagem segura
async function safeCount(qry: Query): Promise<number> {
  try {
    const c = await getCountFromServer(qry as any);
    return c.data().count || 0;
  } catch (e: any) {
    const msg = String(e?.message || "");
    const code = e?.code || "";
    if (code === "permission-denied" || msg.includes("permission-denied")) {
      const snap = await getDocs(qry);
      return snap.size;
    }
    return 0;
  }
}

// tenta várias coleções/campos e retorna a maior contagem encontrada
async function countBy(
  colNames: string[],
  uid: string,
  ownerFields: string[],
  extra?: (base: Query) => Query,
  labelForLog?: string,
): Promise<number> {
  let best = 0;
  for (const colName of colNames) {
    for (const f of ownerFields) {
      try {
        const base = query(collection(db, colName), where(f as any, "==", uid));
        const q = extra ? extra(base) : base;
        const n = await safeCount(q);
        if (n > best) best = n;
        if (n > 0) console.debug(`[metrics] ${labelForLog || colName}: ${colName}.${f} => ${n}`);
      } catch (e) {
        console.debug(`[metrics] falha em ${colName}.${f}`, e);
      }
    }
  }
  return best;
}

// scan dos últimos N docs quando precisar inferir flags/arrays
async function smartScanCount(
  colName: string,
  uid: string,
  eqFields: string[],
  arrayFields: string[],
  considerUnread = false,
) {
  try {
    const snap = await getDocs(query(collection(db, colName), orderBy("__name__", "desc"), limit(200)));
    let total = 0;
    let unread = 0;

    for (const d of snap.docs) {
      const data = d.data() as any;

      const match =
        eqFields.some((f) => data?.[f] === uid) ||
        arrayFields.some((arr) => Array.isArray(data?.[arr]) && data[arr].includes(uid));

      if (!match) continue;

      total++;

      if (considerUnread) {
        let hasAnyFlag = false;
        let isRead = false;

        for (const flag of READ_FLAGS) {
          if (flag in data) {
            hasAnyFlag = true;
            if (data[flag] === true) isRead = true;
            if (data[flag] === false) {
              isRead = false;
              break;
            }
          }
        }
        if (hasAnyFlag && !isRead) unread++;
      }
    }

    return { total, unread };
  } catch {
    return { total: 0, unread: 0 };
  }
}

// não lidas primeiro; senão total; senão scan
async function robustUnreadOrTotal(colName: string, uid: string, eqFields: string[], arrayFields: string[]): Promise<number> {
  let unreadSum = 0;
  for (const flag of READ_FLAGS) {
    const qUnread = qByAnyUserField(colName, uid, eqFields, (base) => query(base, where(flag as any, "==", false)));
    unreadSum += await safeCount(qUnread);
  }
  if (unreadSum > 0) return unreadSum;

  const qTotal = qByAnyUserField(colName, uid, eqFields);
  const totalEq = await safeCount(qTotal);
  if (totalEq > 0) return totalEq;

  const scan = await smartScanCount(colName, uid, eqFields, arrayFields, true);
  if (scan.unread > 0) return scan.unread;
  return scan.total;
}

// =============== Componente ==============================

export default function PainelUnificado() {
  const router = useRouter();

  // gate local de auth (remove o card "Área exclusiva")
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  // dados do usuário
  const [nome, setNome] = useState("");
  const [loadingLogout, setLoadingLogout] = useState(false);

  const [metrics, setMetrics] = useState({
    maquinas: 0,
    produtos: 0,
    servicos: 0,
    leads: 0,
    mensagens: 0,
    notificacoes: 0,
    avaliacoes: 0,
    demandas: 0,
    favoritos: 0,
    propostas: 0,
    pedidos: 0,
    sugestoes: 0,
    oportunidades: 0,
    emAtendimento: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // ===== Gate de autenticação (SEM RequireAuth) =====
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setAuthChecking(false);
        router.replace("/auth/login?next=/painel");
        return;
      }
      setUser(u);
      try {
        const s = await getDoc(doc(db, "usuarios", u.uid));
        setNome(s.exists() ? ((s.data() as any)?.nome ?? "") : "");
      } catch {
        setNome("");
      } finally {
        setAuthChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  // métricas
  useEffect(() => {
    if (!user?.uid) return;
    void fetchMetrics(user.uid);
  }, [user?.uid]);

  async function fetchMetrics(uid: string) {
    setLoadingMetrics(true);
    try {
      const cMaquinas = ["machines", "maquinas"];
      const cProdutos = ["produtos", "products"];
      const cServicos = ["services", "servicos"];
      const cLeads = ["leads"];
      const cDemandas = ["demandas"];
      const cFavoritos = ["favoritos", "favorites"];
      const cPropostas = ["propostas", "proposals"];
      const cPedidos = ["pedidos", "orders"];
      const cSugestoes = ["sugestoes", "suggestions"];
      const cAval = ["avaliacoes", "reviews"];
      const cNotifs = ["notificacoes", "notifications"];
      const cMsgs = ["mensagens", "messages"];
      const cOpps = ["demandAssignments", "assignments"];

      const ownerUser = ["usuarioId", "userId", "ownerId", "uid", "autorId", "authorId"];

      const [maquinas, produtos, servicos, leads, demandas, favoritos, propostas, pedidos, sugestoes, avaliacoes] =
        await Promise.all([
          countBy(cMaquinas, uid, ownerUser, undefined, "maquinas"),
          countBy(cProdutos, uid, ownerUser, undefined, "produtos"),
          countBy(cServicos, uid, ownerUser, undefined, "servicos"),
          countBy(cLeads, uid, ownerUser, undefined, "leads"),
          countBy(cDemandas, uid, ownerUser, undefined, "demandas"),
          countBy(cFavoritos, uid, ownerUser, undefined, "favoritos"),
          countBy(cPropostas, uid, ownerUser, undefined, "propostas"),
          countBy(cPedidos, uid, ownerUser, undefined, "pedidos"),
          countBy(cSugestoes, uid, ownerUser, undefined, "sugestoes"),
          countBy(cAval, uid, ["avaliadoId", ...ownerUser], undefined, "avaliacoes"),
        ]);

      const [notificacoes, mensagens] = await Promise.all([
        robustUnreadOrTotal(cNotifs[0], uid, USER_EQ_FIELDS_NOTIFS, USER_ARRAY_FIELDS),
        robustUnreadOrTotal(cMsgs[0], uid, USER_EQ_FIELDS_MSGS, USER_ARRAY_FIELDS),
      ]);

      const oppOwnerFields = ["supplierId", "usuarioId", "userId"];
      const [oppSent, oppViewed, oppUnlocked] = await Promise.all([
        countBy(cOpps, uid, oppOwnerFields, (b) => query(b, where("status", "==", "sent")), "opp.sent"),
        countBy(cOpps, uid, oppOwnerFields, (b) => query(b, where("status", "==", "viewed")), "opp.viewed"),
        countBy(cOpps, uid, oppOwnerFields, (b) => query(b, where("status", "==", "unlocked")), "opp.unlocked"),
      ]);

      setMetrics({
        maquinas,
        produtos,
        servicos,
        leads,
        demandas,
        favoritos,
        propostas,
        pedidos,
        sugestoes,
        avaliacoes,
        notificacoes,
        mensagens,
        oportunidades: oppSent + oppViewed,
        emAtendimento: oppUnlocked,
      });
    } catch (e) {
      console.error("Erro ao buscar métricas:", e);
    } finally {
      setLoadingMetrics(false);
    }
  }

  function handleLogout() {
    setLoadingLogout(true);
    signOut(auth).finally(() => {
      setLoadingLogout(false);
      router.push("/auth/login");
    });
  }

  const initials = useMemo(() => {
    if (nome) return nome.trim().charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  }, [nome, user?.email]);

 /** ===== Registro dos passos do TOUR (grupo: painel, order: 1) ===== */
useEffect(() => {
  const steps = [
    {
      id: "painel-welcome",
      target: "[data-tour='painel-welcome']",
      title: "Seu Painel",
      content: "Aqui você acompanha tudo: oportunidades, mensagens, notificações e seus cadastros.",
      placement: "bottom",
    },
    {
      id: "painel-quick-links",
      target: "[data-tour='painel-quick-links']",
      title: "Acesso rápido",
      content: "Atalhos úteis para navegar: Oportunidades, Notificações e Serviços.",
      placement: "bottom",
    },
    {
      id: "painel-metrics",
      target: "[data-tour='painel-metrics']",
      title: "Indicadores",
      content: "Resumo das suas métricas. Vermelho destaca itens que pedem sua atenção (ex.: novas mensagens).",
      placement: "left",
    },
    {
      id: "tile-oportunidades",
      target: "[data-tour='tile-oportunidades']",
      title: "Demandas recebidas",
      content: "As demandas que chegaram até você. Desbloqueie e inicie o atendimento.",
      placement: "top",
    },
    {
      id: "tile-minhas-demandas",
      target: "[data-tour='tile-minhas-demandas']",
      title: "Minhas Demandas",
      content: "Suas demandas publicadas. Edite status, arquivos e visibilidade.",
      placement: "top",
    },
    {
      id: "tile-produtos",
      target: "[data-tour='tile-produtos']",
      title: "Produtos & Máquinas",
      content: "Gerencie suas publicações de produtos e máquinas na vitrine.",
      placement: "top",
    },
    {
      id: "tile-servicos",
      target: "[data-tour='tile-servicos']",
      title: "Meus Serviços",
      content: "Cadastre e edite serviços oferecidos (instalações, manutenção, etc.).",
      placement: "top",
    },
    {
      id: "tile-leads",
      target: "[data-tour='tile-leads']",
      title: "Contatos Interessados",
      content: "Clientes que demonstraram interesse nas suas ofertas. Converta em negócio.",
      placement: "top",
    },
    {
      id: "tile-mensagens",
      target: "[data-tour='tile-mensagens']",
      title: "Mensagens",
      content: "Converse direto com clientes. As não lidas aparecem primeiro no contador.",
      placement: "top",
    },
    {
      id: "tile-notificacoes",
      target: "[data-tour='tile-notificacoes']",
      title: "Notificações",
      content: "Avisos sobre propostas, desbloqueios e interações importantes.",
      placement: "top",
    },
    {
      id: "tile-propostas",
      target: "[data-tour='tile-propostas']",
      title: "Minhas Propostas",
      content: "Acompanhe propostas enviadas/recebidas e seus respectivos status.",
      placement: "top",
    },
    {
      id: "tile-sugestoes",
      target: "[data-tour='tile-sugestoes']",
      title: "Sugestões",
      content: "Mande ideias. Usamos esse canal para priorizar melhorias na plataforma.",
      placement: "top",
    },
    {
      id: "tile-perfil",
      target: "[data-tour='tile-perfil']",
      title: "Meu Perfil",
      content: "Atualize logo, contatos, cidades e categorias para aparecer melhor nas buscas.",
      placement: "top",
    },
    {
      id: "tile-ajuda",
      target: "[data-tour='tile-ajuda']",
      title: "Central de Ajuda",
      content: "FAQ, suporte e tickets. Se precisar, estamos por aqui.",
      placement: "top",
    },
    {
      id: "tile-financeiro",
      target: "[data-tour='tile-financeiro']",
      title: "Financeiro",
      content: "Área para faturas e pagamentos (em breve).",
      placement: "top",
    },
    {
      id: "tile-sair",
      target: "[data-tour='tile-sair']",
      title: "Sair",
      content: "Encerra sua sessão com segurança.",
      placement: "left",
    },
  ];

  // pequeno atraso: garante que o OnboardingTour já está escutando o evento
  const t = setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("pedraum:tour-register", {
        detail: { group: "painel", order: 1, steps },
      }),
    );
  }, 500);

  return () => clearTimeout(t);
}, []);


  // ===== Loader enquanto verifica auth =====
  if (authChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg,#f7fafc 0%, #f6f9fa 60%, #f1f5f9 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            className="animate-spin"
            style={{
              width: 36,
              height: 36,
              border: "4px solid #e2e8f0",
              borderTopColor: "#2563eb",
              borderRadius: "999px",
            }}
          />
          <span style={{ color: "#64748b", fontWeight: 700 }}>Carregando seu painel…</span>
        </div>
      </div>
    );
  }

  // ===== Painel =====
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#f7fafc 0%, #f6f9fa 60%, #f1f5f9 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 10px 32px 10px",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 1240,
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 8px 40px #0001, 0 2px 8px #0001",
          padding: "36px 4vw 42px 4vw",
        }}
      >
        {/* Cabeçalho */}
        <div
          data-tour="painel-welcome"
          style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              width: "100%",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 72,
                height: 72,
                background: "linear-gradient(135deg, #FB8500 0%, #2563eb 100%)",
                color: "#fff",
                borderRadius: "50%",
                fontSize: 30,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #fff",
                boxShadow: "0 6px 18px #0002",
                overflow: "hidden",
              }}
            >
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={nome || user?.email || "Usuário"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                (nome ? nome.trim().charAt(0).toUpperCase() : initials)
              )}
            </div>

            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontWeight: 800, fontSize: "1.65rem", color: "#023047", marginBottom: 2 }}>
                Bem-vindo{nome ? `, ${nome}` : ""}!
              </div>
              <div style={{ fontSize: "1.01rem", color: "#6b7680" }}>{user?.email}</div>

              {/* Acesso rápido */}
              <div
                data-tour="painel-quick-links"
                style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}
              >
                <QuickLink href="/dashboard/oportunidades" label="Ver Oportunidades" />
                <QuickLink href="/notificacoes" label="Notificações" />
                <QuickLink href="/meus-servicos" label="Meus Serviços" />
              </div>
            </div>

            {/* Métricas rápidas */}
            <div
              data-tour="painel-metrics"
              style={{ display: "flex", gap: 11, flexWrap: "wrap", justifyContent: "flex-end" }}
            >
              <MetricBadge icon={<Target size={17} />} value={loadingMetrics ? "..." : metrics.oportunidades} label="oportunidades" color="#2563eb" />
              <MetricBadge icon={<ClipboardList size={15} />} value={loadingMetrics ? "..." : metrics.emAtendimento} label="em atendimento" color="#059669" />
              <MetricBadge icon={<Layers size={17} />} value={loadingMetrics ? "..." : metrics.produtos + metrics.maquinas} label="produtos" color="#FB8500" />
              <MetricBadge icon={<Briefcase size={15} />} value={loadingMetrics ? "..." : metrics.servicos} label="serviços" color="#219ebc" />
              <MetricBadge icon={<Inbox size={15} />} value={loadingMetrics ? "..." : metrics.leads} label="contatos" color="#FB8500" />
              <MetricBadge icon={<MessageCircle size={15} />} value={loadingMetrics ? "..." : metrics.mensagens} label="mensagens" color="#2563eb" />
              <MetricBadge icon={<Bell size={15} />} value={loadingMetrics ? "..." : metrics.notificacoes} label="notificações" color="#FB8500" />
            </div>
          </div>
        </div>

        {/* Grid de Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 28,
          }}
        >
          <div data-tour="tile-oportunidades">
            <div data-tour="tile-oportunidades" className="painel-oportunidades"></div>
            <Tile
              href="/dashboard/oportunidades"
              color="#2563eb"
              bg="#f3f7ff"
              icon={<Target size={36} />}
              title="Demandas"
              desc="Novas demandas enviadas para você. Desbloqueie e atenda!"
              badge={loadingMetrics ? undefined : metrics.oportunidades}
            />
          </div>

          <div data-tour="tile-minhas-demandas">
            <div data-tour="tile-minhas-demandas" className="painel-minhas-demandas"></div>
            <Tile
              href="/minhas-demandas"
              color="#219ebc"
              bg="#e0f7fa"
              icon={<ClipboardList size={36} />}
              title="Minhas Demandas"
              desc="Gerencie suas Demandas publicadas."
              badge={loadingMetrics ? undefined : metrics.demandas}
            />
          </div>
 <div data-tour="tile-perfil">
  <div data-tour="tile-perfil"></div>
            <Tile href="/perfil" color="#2563eb" bg="#f3f7ff" icon={<Users size={36} />} title="Meu Perfil" desc="Gerencie seus dados pessoais e de empresa." />
          </div>
          <div data-tour="tile-produtos">
            <div data-tour="tile-produtos" className="painel-produtos"></div>
            <Tile
              href="/meus-produtos"
              color="#FB8500"
              bg="#fff7ed"
              icon={<Layers size={36} />}
              title="Meus Produtos/Máquinas"
              desc="Gerencie seus produtos e máquinas."
              badge={loadingMetrics ? undefined : metrics.produtos + metrics.maquinas}
            />
          </div>

          <div data-tour="tile-servicos">
            <div data-tour="tile-servicos" className="painel-servicos"></div>
            <Tile
              href="/meus-servicos"
              color="#219ebc"
              bg="#e0f7fa"
              icon={<Briefcase size={36} />}
              title="Meus Serviços"
              desc="Gerencie serviços e soluções oferecidas."
              badge={loadingMetrics ? undefined : metrics.servicos}
            />
          </div>

          <div data-tour="tile-leads">
            
            <div data-tour="tile-leads"></div>
            <Tile
              href="/meus-leads"
              color="#FB8500"
              bg="#fff7ed"
              icon={<Inbox size={36} />}
              title="Contatos Interessados"
              desc="Veja clientes interessados nas suas ofertas."
              badge={loadingMetrics ? undefined : metrics.leads}
            />
          </div>

          <div data-tour="tile-mensagens">
            <Tile
              href="/mensagens"
              color="#2563eb"
              bg="#f3f7ff"
              icon={<MessageCircle size={36} />}
              title="Mensagens"
              desc="Converse com clientes e negocie direto."
              badge={loadingMetrics ? undefined : metrics.mensagens}
            />
          </div>

          <div data-tour="tile-notificacoes">
            <div data-tour="tile-notificacoes" className="painel-notificacoes"></div>
            <Tile
              href="/notificacoes"
              color="#FB8500"
              bg="#fff7ed"
              icon={<Bell size={36} />}
              title="Notificações"
              desc="Mostra não lidas primeiro; cai para total."
              badge={loadingMetrics ? undefined : metrics.notificacoes}
            />
          </div>

          <div data-tour="tile-propostas">
            <Tile
              href="/minhas-propostas"
              color="#2563eb"
              bg="#f3f7ff"
              icon={<ClipboardList size={36} />}
              title="Minhas Propostas"
              desc="Acompanhe propostas enviadas e recebidas."
              badge={loadingMetrics ? undefined : metrics.propostas}
            />
          </div>

          <div data-tour="tile-sugestoes">
            <Tile
              href="/sugestoes"
              color="#FB8500"
              bg="#fff7ed"
              icon={<Lightbulb size={36} />}
              title="Sugestões"
              desc="Envie ideias para melhorar a plataforma."
              badge={loadingMetrics ? undefined : metrics.sugestoes}
            />
          </div>

          {/* informativos */}
          <div >
            <Tile href="/perfil" color="#2563eb" bg="#f3f7ff" icon={<Users size={36} />} title="Meu Perfil" desc="Gerencie seus dados pessoais e de empresa." />
          </div>

          <div data-tour="tile-ajuda">
            <Tile href="/ajuda" color="#059669" bg="#ecfdf5" icon={<LifeBuoy size={36} />} title="Central de Ajuda" desc="FAQ, suporte e abertura de tickets." />
          </div>

          <div data-tour="tile-financeiro">
            <Tile href="/financeiro" color="#6d28d9" bg="#f9fafb" icon={<Wallet2 size={36} />} title="Financeiro" desc="Pagamentos e notas (em breve)." />
          </div>

          {/* Sair */}
          <div data-tour="tile-sair">
            <button
              onClick={handleLogout}
              disabled={loadingLogout}
              style={{
                background: "#fff3ea",
                border: "1.5px solid #ffb680",
                borderRadius: 22,
                boxShadow: "0 8px 36px #0001",
                padding: "32px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                color: "#E85D04",
                fontWeight: 700,
                fontSize: "1.05rem",
                minHeight: 185,
                position: "relative",
                cursor: loadingLogout ? "not-allowed" : "pointer",
              }}
              className="group hover:shadow-xl hover:scale-[1.03] transition"
              aria-label="Sair da conta"
              title="Encerrar sessão"
            >
              <LogOut size={36} className="mb-2 group-hover:scale-110 transition-transform duration-200" />
              <span style={{ color: "#E85D04", fontWeight: 800, fontSize: 19 }}>
                {loadingLogout ? "Saindo..." : "Sair"}
              </span>
              <span style={{ color: "#495668", fontSize: ".97rem", marginTop: 1 }}>Encerrar sessão na plataforma.</span>
            </button>
          </div>
        </div>
      </section>

      <footer
        style={{
          marginTop: 34,
          paddingTop: 24,
          borderTop: "1.5px solid #e5e7eb",
          textAlign: "center",
          fontSize: 15,
          color: "#6c7780",
        }}
      >
        © {new Date().getFullYear()} Pedraum Brasil · Painel do Usuário.
      </footer>
    </main>
  );
}

// =================== Componentes ========================

function MetricBadge({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#f6f9fa",
        borderRadius: 13,
        padding: "6px 14px",
        fontSize: ".97rem",
        color: "#023047",
        fontWeight: 700,
        border: `1px solid ${color}30`,
        boxShadow: "0 2px 6px #0000000f",
      }}
    >
      <span style={{ color, display: "flex", alignItems: "center" }}>{icon}</span>
      <span>{value}</span>
      <span style={{ marginLeft: 2, color: "#5a7b8b", fontWeight: 500, fontSize: ".91em" }}>{label}</span>
    </div>
  );
}

/** Popover de ajuda (hover + clique). */
function InfoBubble({ text, color = "#023047" }: { text: string; color?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      style={{ position: "absolute", top: 10, right: 10, zIndex: 5 }}
    >
      <button
        aria-label="Ajuda desta seção"
        style={{
          background: "#fff",
          border: `1px solid ${color}25`,
          borderRadius: 999,
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 2px 8px #0002",
          cursor: "pointer",
        }}
      >
        <CircleHelp size={16} color={color} />
      </button>

      {open && (
        <div
          role="dialog"
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            maxWidth: 280,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            boxShadow: "0 10px 28px #0002, 0 4px 10px #0001",
            padding: "10px 12px",
            fontSize: ".96rem",
            color: "#334155",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <strong style={{ color: "#023047", fontSize: ".98rem" }}>O que é isto?</strong>
            <button onClick={() => setOpen(false)} aria-label="Fechar" style={{ background: "transparent", border: 0, cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ lineHeight: 1.35 }}>{text}</p>
        </div>
      )}
    </div>
  );
}

function Tile({
  href,
  color,
  bg,
  icon,
  title,
  desc,
  badge,
}: {
  href: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: number;
}) {
  const showBadge = typeof badge === "number";
  const isZero = badge === 0;

  return (
    <Link href={href} className="group" style={{ textDecoration: "none" }}>
      <div
        style={{
          background: bg,
          border: `1.5px solid ${color}25`,
          borderRadius: 22,
          boxShadow: "0 8px 36px #0001",
          padding: "32px 10px 28px 10px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
          transition: "box-shadow .16s, transform .13s, border-color .13s",
          minHeight: 185,
          position: "relative",
        }}
        className="hover:shadow-xl hover:scale-[1.035] transition group"
      >
        <div style={{ color: color, marginBottom: 12, position: "relative", display: "flex", alignItems: "center" }}>
          {icon}
          {showBadge && (
            <span
              style={{
                position: "absolute",
                top: -10,
                right: -13,
                background: isZero ? "#94a3b8" : "#e63946",
                color: "#fff",
                fontSize: 13,
                fontWeight: 900,
                padding: "3.5px 10px",
                borderRadius: 11,
                boxShadow: "0 2px 8px #0003",
                animation: isZero ? "none" : "pulse-badge 1.2s infinite",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <span
          style={{
            fontWeight: 800,
            color: "#023047",
            fontSize: 21,
            marginBottom: 3,
            textAlign: "center",
            letterSpacing: ".2px",
          }}
        >
          {title}
        </span>
        <span style={{ color: "#64748b", fontSize: "1.02rem", textAlign: "center", marginTop: 1, lineHeight: 1.35 }}>
          {desc}
        </span>

        <InfoBubble text={desc} color={color} />
      </div>

      <style jsx>{`
        @keyframes pulse-badge {
          0% { transform: scale(1); box-shadow: 0 0 0 0 #e6394655; }
          70% { transform: scale(1.09); box-shadow: 0 0 0 8px #e6394600; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 #e6394600; }
      `}</style>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        color: "#023047",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 2px 10px #00000008",
      }}
      className="hover:shadow-md hover:scale-[1.02] transition"
    >
      {label}
    </Link>
  );
}

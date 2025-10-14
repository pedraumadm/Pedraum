// app/demandas/[id]/page.tsx
"use client";

import AuthGateRedirect from "@/components/AuthGateRedirect";
import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { registerView } from "@/lib/registerView";
import { auth, db } from "@/firebaseConfig";
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query as fsQuery,
  where,
  limit,
  getDocs,
  orderBy,
} from "firebase/firestore";
import {
  MapPin,
  CheckCircle2,
  Copy,
  PhoneCall,
  Tag,
  Calendar,
  BadgeCheck,
  Image as ImageIcon,
  Eye,
  Hourglass,
  ShieldCheck,
  Zap,
  ChevronRight,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// === PDF & Thumbs (somente no cliente)
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), {
  ssr: false,
});
const PDFThumb = dynamic(() => import("@/components/PDFThumb"), { ssr: false });

/* ======================= Types ======================= */
type Pricing = {
  amount?: number;
  currency?: string;
  exclusive?: boolean;
  cap?: number;
};
type AssignmentStatus =
  | "sent"
  | "viewed"
  | "unlocked"
  | "won"
  | "lost"
  | "refunded";
type Assignment = {
  id: string;
  demandId: string;
  supplierId: string;
  status: AssignmentStatus;
  pricing?: Pricing;
  paymentRef?: string;
  unlockedAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

type DemandFire = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  subcategoria?: string;
  outraCategoriaTexto?: string;

  estado?: string;
  cidade?: string;
  prazo?: string;
  orcamento?: string;

  imagens?: string[];
  imagem?: string; // fallback

  // contatos
  autorNome?: string;
  autorEmail?: string;
  autorWhatsapp?: string;

  // legados
  whatsapp?: string;
  email?: string;
  nomeContato?: string;

  userId?: string;
  liberadoPara?: string[];
  priceCents?: number;
  pricingDefault?: { amount?: number; currency?: string };
  createdAt?: any;
  expiraEm?: any;
  status?: "aberta" | "andamento" | "fechada" | "expirada";
  visivel?: boolean;

  visualizacoes?: number; // novo campo
  lastViewedAt?: any;

  // PDF
  pdfUrl?: string;
};

type Perfil = {
  id: string;
  role?: string;
  tipo?: string;
  plano?: string;
  planoExpiraEm?: string;
  isPatrocinador?: boolean;
  email?: string;

  categoriasAtuacaoPairs?: Array<{ categoria?: string; subcategoria?: string }>;
  categoriasAtuacao?: string[];
};

type DemandaMini = {
  id: string;
  titulo?: string;
  categoria?: string;
  cidade?: string;
  estado?: string;
  priceCents?: number;
  createdAt?: any;
};

/* ======================= Const ======================= */
const DEFAULT_PRICE_CENTS = 1990;
const WPP_PEDRAUM = process.env.NEXT_PUBLIC_PEDRAUM_WPP || "5531990903613";
const WPP_SPONSOR_MSG = encodeURIComponent(
  "Quero me tornar patrocinador. Como funciona, e quais as vantagens?",
);
const WPP_SPONSOR_URL = `https://wa.me/${WPP_PEDRAUM}?text=${WPP_SPONSOR_MSG}`;

/* ======================= Utils ======================= */
function currencyCents(cents?: number) {
  const n = Number(cents ?? 0);
  if (!n) return "R$ 0,00";
  return `R$ ${(n / 100).toFixed(2).replace(".", ",")}`;
}
function initials(t?: string) {
  if (!t) return "PD";
  const parts = t.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "PD";
}
function toDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function parsePrazoStr(p?: string): Date | null {
  if (!p) return null;
  const d = new Date(p);
  return isNaN(d.getTime()) ? null : d;
}
function msToDHMS(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { d, h, m, s };
}
function resolveStatus(d: DemandFire): {
  key: DemandFire["status"] | "aberta";
  label: string;
  color: string;
} {
  if (d.status) {
    switch (d.status) {
      case "andamento":
        return {
          key: "andamento",
          label: "Em andamento",
          color: "var(--st-blue)",
        };
      case "fechada":
        return { key: "fechada", label: "Fechada", color: "var(--st-gray)" };
      case "expirada":
        return { key: "expirada", label: "Expirada", color: "var(--st-red)" };
      default:
        return { key: "aberta", label: "Aberta", color: "var(--st-green)" };
    }
  }
  const exp = toDate(d.expiraEm) || parsePrazoStr(d.prazo);
  if (exp && exp.getTime() < Date.now()) {
    return { key: "expirada", label: "Expirada", color: "var(--st-red)" };
  }
  return { key: "aberta", label: "Aberta", color: "var(--st-green)" };
}
function isPerfilPatrocinador(perfil?: Perfil | null): boolean {
  if (!perfil) return false;
  const flag =
    perfil.isPatrocinador ||
    perfil.role === "patrocinador" ||
    perfil.tipo === "patrocinador" ||
    perfil.plano === "patrocinador";
  if (!flag) return false;
  if (perfil.planoExpiraEm) {
    return new Date(perfil.planoExpiraEm) > new Date();
  }
  return true;
}
const notEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

/* ======================= Página ======================= */
export default function DemandaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [uid, setUid] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const [demanda, setDemanda] = useState<(DemandFire & { id: string }) | null>(
    null,
  );
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [relacionadas, setRelacionadas] = useState<DemandaMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Relógio
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Registrar view (uma vez por aba/sessão e por ID)
  useEffect(() => {
    if (!id) return;
    try {
      const key = `viewed_demand_${id}`;
      if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        registerView(String(id)).catch(() => {});
      }
    } catch {
      // silencioso
    }
  }, [id]);

  // Auth + Perfil
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUid(u ? u.uid : null);
      if (u?.uid) {
        try {
          const s = await getDoc(doc(db, "usuarios", u.uid));
          setPerfil(
            s.exists() ? { id: u.uid, ...(s.data() as any) } : { id: u.uid },
          );
        } catch {
          setPerfil({ id: u.uid });
        }
      } else {
        setPerfil(null);
      }
    });
    return () => unsub();
  }, []);

  // categorias do usuário
  const userCats: string[] = useMemo(() => {
    if (!perfil) return [];
    const pairs = Array.isArray(perfil.categoriasAtuacaoPairs)
      ? (perfil.categoriasAtuacaoPairs as Array<{ categoria?: string }>)
      : [];
    if (pairs.length) {
      const cats = pairs.map((p) => p?.categoria ?? "").filter(notEmptyString);
      return Array.from(new Set<string>(cats)).slice(0, 10);
    }
    const legacy = Array.isArray(perfil.categoriasAtuacao)
      ? (perfil.categoriasAtuacao as unknown[])
      : [];
    const legacyCats = legacy.filter(notEmptyString);
    return Array.from(new Set<string>(legacyCats)).slice(0, 10);
  }, [perfil]);

  function demandaCategoryMatch(d?: DemandFire | null, myCats?: string[]) {
    if (!d || !myCats || !myCats.length) return false;
    const cat = (d.categoria || "").trim();
    if (cat && myCats.includes(cat)) return true;
    const arr = Array.isArray((d as any).categorias)
      ? ((d as any).categorias as unknown[])
      : [];
    return arr.filter(notEmptyString).some((c) => myCats.includes(c));
  }

  // Realtime: Demanda + Assignment
  useEffect(() => {
    if (!uid) return;

    const demRef = doc(db, "demandas", String(id));
    const unsubDem = onSnapshot(demRef, (snap) => {
      if (!snap.exists()) setDemanda(null);
      else setDemanda({ id: snap.id, ...(snap.data() as DemandFire) });
    });

    const aRef = doc(db, "demandAssignments", `${id}_${uid}`);
    const unsubA = onSnapshot(aRef, async (snap) => {
      if (snap.exists()) {
        const a = { id: snap.id, ...(snap.data() as any) } as Assignment;
        setAssignment(a);
        if (a.status === "sent") {
          try {
            await updateDoc(aRef, {
              status: "viewed",
              updatedAt: serverTimestamp(),
            });
          } catch {}
        }
      } else {
        setAssignment(null);
      }
      setLoading(false);
    });

    return () => {
      unsubDem();
      unsubA();
    };
  }, [id, uid]);

  // pós-checkout UX
  useEffect(() => {
    const s1 = searchParams.get("status");
    const s2 = searchParams.get("collection_status");
    if (s1 === "approved" || s2 === "approved") {
      setMsg("Pagamento aprovado! Liberando contato…");
      const t = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const s1 = searchParams.get("status");
    const s2 = searchParams.get("collection_status");
    if ((s1 === "approved" || s2 === "approved") && uid && id) {
      (async () => {
        try {
          await fetch("/api/mp/unlock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ demandId: String(id), userId: uid }),
          });
        } catch {}
      })();
    }
  }, [searchParams, uid, id]);

  // Meta
  const adminPriceCents = Number(
    demanda?.priceCents ??
      demanda?.pricingDefault?.amount ??
      DEFAULT_PRICE_CENTS,
  );
  const title = demanda?.titulo || "Demanda";
  const description = demanda?.descricao || "";
  const category = demanda?.categoria || "Sem categoria";
  const subcat = demanda?.subcategoria || demanda?.outraCategoriaTexto || "";
  const uf = demanda?.estado || "—";
  const city = demanda?.cidade || "—";
  const prazoStr = demanda?.prazo || "";
  const orcamento = demanda?.orcamento || "—";
  const views = Number(
    demanda?.visualizacoes ?? (demanda as any)?.viewCount ?? 0,
  ); // compatibilidade com legado

  // Contato
  const contatoNome =
    (demanda?.autorNome && demanda.autorNome.trim()) ||
    (demanda?.nomeContato && demanda.nomeContato.trim()) ||
    "";

  const contatoEmail =
    (demanda?.autorEmail && demanda.autorEmail.trim()) ||
    (demanda?.email && demanda.email.trim()) ||
    "";

  const contatoWpp =
    (demanda?.autorWhatsapp && demanda.autorWhatsapp.trim()) ||
    (demanda?.whatsapp && demanda.whatsapp.trim()) ||
    "";
  const wppDigits = contatoWpp ? String(contatoWpp).replace(/\D/g, "") : "";

  // Assignment virtual
  const effectiveAssignment: Assignment | null = useMemo(() => {
    if (!uid || !demanda) return assignment;
    if (assignment) return assignment;
    return {
      id: `${id}_${uid}`,
      demandId: String(id),
      supplierId: uid,
      status: "sent",
      pricing: {
        amount: adminPriceCents,
        currency: "BRL",
        exclusive: false,
        cap: 3,
      },
      createdAt: null,
      updatedAt: null,
    };
  }, [assignment, demanda, id, uid, adminPriceCents]);

  // Regras de acesso
  const isOwner = !!(demanda?.userId && uid && demanda.userId === uid);
  const patrocinioAtivo = isPerfilPatrocinador(perfil);
  const contatoLiberadoPorPatrocinio =
    patrocinioAtivo && demandaCategoryMatch(demanda, userCats);
  const liberadoPorArray = !!(
    demanda?.liberadoPara &&
    uid &&
    Array.isArray(demanda.liberadoPara) &&
    demanda.liberadoPara.includes(uid)
  );
  const isUnlockedByAssignment = effectiveAssignment?.status === "unlocked";

  const [liberadoPorSubdoc, setLiberadoPorSubdoc] = useState<boolean>(false);
  useEffect(() => {
    if (!uid || !demanda?.id) {
      setLiberadoPorSubdoc(false);
      return;
    }
    (async () => {
      try {
        const s = await getDoc(doc(db, "demandas", demanda.id, "acessos", uid));
        setLiberadoPorSubdoc(s.exists());
      } catch {
        setLiberadoPorSubdoc(false);
      }
    })();
  }, [uid, demanda?.id]);

  const unlocked =
    isOwner ||
    liberadoPorArray ||
    isUnlockedByAssignment ||
    liberadoPorSubdoc ||
    contatoLiberadoPorPatrocinio;

  // Imagens
  const imagens: string[] = useMemo(() => {
    const base = Array.isArray(demanda?.imagens)
      ? (demanda!.imagens as unknown[])
      : [];
    const arr = base.filter(notEmptyString);
    if (!arr.length && demanda?.imagem) arr.push(String(demanda.imagem));
    return arr;
  }, [demanda?.imagens, demanda?.imagem]);

  const [imgIdx, setImgIdx] = useState(0);
  const [imgOk, setImgOk] = useState<boolean>(false);
  const imgPrincipal = imagens[imgIdx] || "/images/no-image.png";
  useEffect(() => {
    setImgIdx(0);
    setImgOk(!!imagens.length);
  }, [imagens.length]);

  // Lightbox de imagens
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Status + Countdown
  const statusInfo = resolveStatus(demanda || ({} as DemandFire));
  const expDate: Date | null =
    toDate(demanda?.expiraEm) || parsePrazoStr(prazoStr);
  const timeLeft = useMemo(() => {
    if (!expDate) return null;
    return msToDHMS(expDate.getTime() - now);
  }, [expDate, now]);
  const expShown =
    !!timeLeft && timeLeft.d + timeLeft.h + timeLeft.m + timeLeft.s > 0;

  // Relacionadas
  useEffect(() => {
    (async () => {
      try {
        if (!demanda?.categoria) {
          setRelacionadas([]);
          return;
        }

        const col = collection(db, "demandas");

        let snaps;
        try {
          const q1 = fsQuery(
            col,
            where("categoria", "==", demanda.categoria),
            orderBy("createdAt", "desc"),
            limit(10),
          );
          snaps = await getDocs(q1);
        } catch {
          const q2 = fsQuery(
            col,
            where("categoria", "==", demanda.categoria),
            limit(20),
          );
          snaps = await getDocs(q2);
        }

        const rows: DemandaMini[] = [];
        snaps.forEach((s) => {
          if (s.id === demanda.id) return;
          const d = s.data() as DemandFire;

          const raw =
            d.priceCents ?? d.pricingDefault?.amount ?? DEFAULT_PRICE_CENTS;
          const cents = Number(raw);
          const normalized =
            !Number.isFinite(cents) || cents <= 0 ? DEFAULT_PRICE_CENTS : cents;

          rows.push({
            id: s.id,
            titulo: d.titulo,
            categoria: d.categoria,
            cidade: d.cidade,
            estado: d.estado,
            priceCents: normalized,
            createdAt: d.createdAt,
          });
        });

        rows.sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        );
        setRelacionadas(rows.slice(0, 10));
      } catch {
        setRelacionadas([]);
      }
    })();
  }, [demanda?.id, demanda?.categoria]);

  // Ações
  async function ensureAssignmentDoc() {
    if (!uid) return;
    const aRef = doc(db, "demandAssignments", `${id}_${uid}`);
    const aSnap = await getDoc(aRef);

    const pricing = {
      amount: adminPriceCents,
      currency: "BRL",
      exclusive: false,
      cap: 3,
    };

    if (!aSnap.exists()) {
      await setDoc(aRef, {
        demandId: String(id),
        supplierId: uid,
        status: "viewed",
        pricing,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const cur = (aSnap.data() as any)?.pricing?.amount;
      if (Number(cur) !== adminPriceCents) {
        await updateDoc(aRef, { pricing, updatedAt: serverTimestamp() });
      }
    }
  }

  async function atender() {
    if (!uid) return;
    const texto = encodeURIComponent(
      `Olá! Quero atender esta demanda: "${title}" (ID: ${id})`,
    );
    window.open(`https://wa.me/5531990903613?text=${texto}`, "_blank");
  }

  function copy(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setMsg("Copiado!");
    setTimeout(() => setMsg(null), 1500);
  }

  function share() {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const data = { title, text: "Veja esta demanda no Pedraum", url };
      // @ts-ignore
      if (navigator.share) navigator.share(data);
      else if (url) {
        navigator.clipboard.writeText(url);
        setMsg("Link copiado!");
        setTimeout(() => setMsg(null), 1500);
      }
    } catch {}
  }

  // ====== PDF (igual ao produto) ======
  const pdfUrl: string | undefined = (demanda as any)?.pdfUrl || undefined;
  const pdfSrc = pdfUrl
    ? `/api/pdf-proxy?file=${encodeURIComponent(pdfUrl)}`
    : undefined;

  const [pdfOpen, setPdfOpen] = useState(false);
  const pdfThumbCoverRef = useRef<HTMLDivElement | null>(null);
  const [pdfThumbReady, setPdfThumbReady] = useState(false);
  const [pdfThumbWidth, setPdfThumbWidth] = useState(520);

  useEffect(() => {
    if (!pdfSrc) return;
    const el = pdfThumbCoverRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPdfThumbReady(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setPdfThumbWidth(Math.max(220, Math.min(560, Math.floor(w - 16))));
    });
    ro.observe(el);

    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, [pdfSrc]);

  /* ======================= RENDER ======================= */

  if (loading) {
    return (
      <RequireAuth>
        <section className="op-wrap">
          <div className="op-skel" />
          <style jsx>{baseCss}</style>
        </section>
      </RequireAuth>
    );
  }

  if (!demanda) {
    return (
      <RequireAuth>
        <section className="op-wrap">
          <div className="op-header">
            <Link href="/demandas" className="op-link-voltar">
              &lt; Voltar
            </Link>
          </div>
          <div className="op-card p">Oportunidade não encontrada.</div>
          <style jsx>{baseCss}</style>
        </section>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <section className="op-wrap">
        {/* Topo */}
        <div className="op-header">
          <button onClick={() => router.back()} className="op-link-voltar">
            &lt; Voltar
          </button>
          <div className="op-actions">
            <button className="op-share" onClick={share}>
              <Share2 size={16} /> Compartilhar
            </button>
            {msg && <span className="op-msg">{msg}</span>}
          </div>
        </div>

        {/* Header */}
        <div className="op-headbar">
          <h1 className="op-title">{title}</h1>
          <div className="op-headbar-right">
            <span
              className="op-badge"
              style={{ borderColor: statusInfo.color, color: statusInfo.color }}
            >
              <ShieldCheck size={14} /> {statusInfo.label}
            </span>
            <span className="op-views">
              <Eye size={16} /> {views} visualizações
            </span>
            {expShown && (
              <span className="op-countdown">
                <Hourglass size={16} />
                <b>{timeLeft?.d}d</b> {timeLeft?.h}h {timeLeft?.m}m{" "}
                {timeLeft?.s}s
              </span>
            )}
          </div>
        </div>

        {/* Grid principal */}
        <div className="op-grid">
          {/* ===== MÍDIA (coluna esquerda) ===== */}
          <div className="op-media">
            {/* Imagem principal com Lightbox */}
            {imagens.length > 0 && imgOk ? (
              <>
                <div
                  className="op-img-wrap"
                  role="button"
                  tabIndex={0}
                  title="Clique para ampliar"
                  onClick={() => setLightboxOpen(true)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    setLightboxOpen(true)
                  }
                >
                  <img
                    src={imgPrincipal}
                    alt={title}
                    className="op-img"
                    onLoad={() => setImgOk(true)}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "/images/no-image.png";
                      setImgOk(false);
                    }}
                  />
                  <span className="op-zoom-hint">Clique para ampliar</span>
                </div>

                {imagens.length > 1 && (
                  <div className="op-thumbs op-thumbs-scroll">
                    {imagens.map((img, idx) => (
                      <img
                        key={idx}
                        src={img || "/images/no-image.png"}
                        alt={`Imagem ${idx + 1}`}
                        className={`op-thumb ${idx === imgIdx ? "op-thumb--active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setImgIdx(idx);
                          setLightboxOpen(true);
                        }}
                        onError={(e) =>
                          ((e.currentTarget as HTMLImageElement).src =
                            "/images/no-image.png")
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="op-noimg">
                <div className="op-noimg-badge">
                  <ImageIcon size={18} /> Sem fotos
                </div>
                <div className="op-noimg-avatar">{initials(title)}</div>
                <div className="op-noimg-title" title={title}>
                  {title}
                </div>
                <div className="op-noimg-meta">
                  <span>
                    <Tag size={16} /> {category}
                    {subcat ? ` • ${subcat}` : ""}
                  </span>
                  <span>
                    <MapPin size={16} /> {city}, {uf}
                  </span>
                </div>
              </div>
            )}

            {/* ===== THUMB DO PDF (se houver) ===== */}
            {pdfSrc && (
              <div
                className="op-pdf-thumb"
                role="button"
                tabIndex={0}
                title="Abrir anexo (PDF)"
                onClick={() => setPdfOpen(true)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && setPdfOpen(true)
                }
              >
                <div className="op-pdf-thumb-cover" ref={pdfThumbCoverRef}>
                  <span className="pdf-badge">PDF</span>
                  {pdfThumbReady ? (
                    <PDFThumb src={pdfSrc} width={pdfThumbWidth} />
                  ) : (
                    <div className="pdf-thumb-skeleton" />
                  )}
                </div>
                <div className="op-pdf-thumb-meta">
                  <div className="titulo">Documento em PDF desta demanda</div>
                  <div className="cta">Clique para abrir</div>
                </div>
              </div>
            )}

            {/* ===== CTA (abaixo da mídia) ===== */}
            <div className="op-cta">
              {!unlocked ? (
                <>
                  <div className="op-cta-highlight">
                    <h3 className="op-cta-title">
                      <Zap size={18} /> Desbloqueie o contato e fale direto com
                      o cliente
                    </h3>

                    <ul className="op-benefits">
                      <li>⚡ Acesso imediato ao WhatsApp e E-mail</li>
                      <li>💼 Oportunidade ativa procurando solução</li>
                    </ul>

                    <button
                      onClick={atender}
                      disabled={paying || false}
                      className="op-btn-laranja op-btn-big"
                      aria-disabled={paying || false}
                      style={{
                        background: paying ? "#d1d5db" : "#FB8500",
                        cursor: paying ? "not-allowed" : "pointer",
                      }}
                    >
                      {paying ? "Abrindo pagamento…" : "Atender agora"}
                    </button>

                    <div className="op-cta-note">
                      Após o pagamento aprovado, o contato é liberado
                      automaticamente nesta página.
                    </div>
                  </div>
                </>
              ) : (
                <div className="op-contact">
                  <div className="op-contact-title">
                    <CheckCircle2 size={18} /> Contato liberado
                  </div>

                  <div className="op-contact-grid">
                    <div>
                      <div className="op-contact-label">Nome</div>
                      <div className="op-contact-value">
                        {contatoNome || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="op-contact-label">E-mail</div>
                      <div className="op-contact-value">
                        {contatoEmail || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="op-contact-label">
                        WhatsApp / Telefone
                      </div>
                      <div className="op-contact-wpp">
                        <span className="op-contact-value">
                          {contatoWpp || "—"}
                        </span>
                        {contatoWpp && (
                          <button
                            onClick={() => copy(String(contatoWpp))}
                            className="op-copy"
                            title="Copiar"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {wppDigits && (
                    <a
                      target="_blank"
                      href={`https://wa.me/${wppDigits}?text=${encodeURIComponent(
                        `Olá! Vi sua demanda "${title}" no Pedraum e posso te atender.`,
                      )}`}
                      className="op-btn-azul"
                    >
                      <PhoneCall size={16} /> Abrir WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== INFOS (coluna direita) ===== */}
          <div className="op-info">
            {/* Meta list */}
            <div className="op-meta-list">
              <span>
                <Tag size={18} /> {category}
                {subcat ? ` • ${subcat}` : ""}
              </span>
              <span>
                <MapPin size={18} /> {city}, {uf}
              </span>
              <span>
                <Calendar size={18} /> Prazo: {prazoStr || "—"}
              </span>
              <span>
                <BadgeCheck size={18} /> Orçamento: {orcamento}
              </span>
            </div>

            {/* Descrição */}
            {description && (
              <div className="op-desc-card">
                <div className="op-desc-header">
                  <span className="op-desc-badge">Descrição</span>
                </div>
                <div className="op-desc-body">{description}</div>
              </div>
            )}

            {/* Upsell patrocinador */}
            {!patrocinioAtivo && (
              <div className="op-upsell">
                <div className="op-upsell-left">
                  <strong>Seja Patrocinador</strong> e veja contatos sem pagar
                  por demanda nas suas categorias.
                </div>
                <a
                  href={WPP_SPONSOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="op-upsell-btn"
                >
                  Conhecer planos <ChevronRight size={16} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Relacionadas */}
        {relacionadas.length > 0 && (
          <div className="op-recomenda">
            <h3>Você também pode querer atender</h3>
            <div className="op-carousel">
              {relacionadas.map((d) => (
                <Link
                  key={d.id}
                  href={`/demandas/${d.id}`}
                  className="op-card-mini"
                >
                  <div
                    className="op-card-mini-title"
                    title={d.titulo || "Demanda"}
                  >
                    {d.titulo || "Demanda"}
                  </div>
                  <div className="op-card-mini-meta">
                    {d.categoria || "—"} • {d.cidade || "—"}
                    {d.estado ? `, ${d.estado}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ===== Lightbox Imagens ===== */}
        <AnimatePresence>
          {lightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lb-overlay"
              onClick={() => setLightboxOpen(false)}
            >
              <motion.img
                key={imgIdx}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "spring", duration: 0.25 }}
                src={imagens[imgIdx] || "/images/no-image.png"}
                alt={title}
                className="lb-img"
                onClick={(e) => e.stopPropagation()}
                onError={(e) =>
                  ((e.currentTarget as HTMLImageElement).src =
                    "/images/no-image.png")
                }
              />

              {imagens.length > 1 && (
                <>
                  <button
                    aria-label="Anterior"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImgIdx(
                        (i) => (i - 1 + imagens.length) % imagens.length,
                      );
                    }}
                    className="lb-nav lb-left"
                  >
                    ‹
                  </button>
                  <button
                    aria-label="Próxima"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImgIdx((i) => (i + 1) % imagens.length);
                    }}
                    className="lb-nav lb-right"
                  >
                    ›
                  </button>
                </>
              )}

              <button
                aria-label="Fechar"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(false);
                }}
                className="lb-close"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Modal PDF ===== */}
        <AnimatePresence>
          {pdfOpen && pdfSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pdf-overlay"
              onClick={() => setPdfOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: "spring", duration: 0.25 }}
                className="pdf-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  aria-label="Fechar"
                  onClick={() => setPdfOpen(false)}
                  className="pdf-close"
                >
                  ×
                </button>
                <div className="pdf-container">
                  <DrivePDFViewer fileUrl={pdfSrc} height={undefined as any} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CSS */}
        <style jsx>{baseCss}</style>
        <AuthGateRedirect />
      </section>
    </RequireAuth>
  );
}

/* ======================= CSS ======================= */
const baseCss = `
:root{ --st-green:#10b981; --st-blue:#176684; --st-red:#e11d48; --st-gray:#6b7280; }

.op-wrap{max-width:1200px;margin:0 auto;padding:24px 0 60px 0;background:#f8fbfd}
.op-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.op-actions{display:flex;align-items:center;gap:8px}
.op-link-voltar{color:#219ebc;font-size:1rem;text-decoration:underline;background:none;border:none;cursor:pointer}
.op-share{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5eef6;border-radius:999px;padding:6px 10px;color:#176684;font-weight:800}
.op-share:hover{background:#f4faff}
.op-msg{font-size:.9rem;font-weight:800;color:#0c4a6e;background:#e3f2ff;border:1.5px solid #cfe8ff;border-radius:999px;padding:6px 12px}

.op-headbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:6px 2px 12px 2px}
.op-title{font-size:1.8rem;font-weight:900;color:#023047;letter-spacing:-.4px;margin:0}
.op-headbar-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.op-badge{display:inline-flex;align-items:center;gap:6px;border:2px solid;border-radius:999px;padding:6px 10px;font-weight:900;background:#fff}
.op-views{display:inline-flex;align-items:center;gap:6px;color:#334155;font-weight:700}
.op-countdown{display:inline-flex;align-items:center;gap:6px;color:#7c2d12;background:#fff7ed;border:1.5px solid #ffedd5;border-radius:999px;padding:6px 10px;font-weight:800}

.op-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:32px;margin-top:10px}

/* mídia */
.op-media{display:flex;flex-direction:column;align-items:center;gap:16px}
.op-img-wrap{position:relative;width:100%;max-width:560px;cursor:zoom-in}
.op-img{width:100%;max-width:560px;aspect-ratio:4/3;border-radius:22px;object-fit:cover;box-shadow:0 4px 32px #0001;background:#fff}
.op-zoom-hint{position:absolute;right:12px;bottom:12px;background:#0000006b;color:#fff;font-size:12px;font-weight:800;padding:6px 8px;border-radius:8px}

/* placeholder */
.op-noimg{
  width:100%;max-width:560px;aspect-ratio:4/3;border-radius:22px;
  border:1.5px dashed #dbe7ef;background:linear-gradient(135deg,#f3f9ff 0%,#f7fbff 60%,#ffffff 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  position:relative;box-shadow:0 4px 32px #0001;padding:14px;text-align:center;
}
.op-noimg-badge{
  position:absolute;top:12px;left:12px;background:#fff;border:1px solid #e6eef6;border-radius:999px;
  padding:6px 10px;display:inline-flex;gap:6px;align-items:center;font-weight:800;color:#176684;font-size:.88rem
}
.op-noimg-avatar{
  width:84px;height:84px;border-radius:18px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#219ebc22,#fb850022), #e8f4fb;border:1px solid #d9e8f2;
  font-weight:900;font-size:1.4rem;color:#0b3b4a;letter-spacing:.5px;margin-bottom:10px
}
.op-noimg-title{max-width:88%;font-size:1.12rem;font-weight:900;color:#023047;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.op-noimg-meta{margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:.96rem;color:#334155}
.op-noimg-meta span{display:inline-flex;align-items:center;gap:6px}

/* thumbs */
.op-thumbs{display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;justify-content:center}
.op-thumbs-scroll{overflow-x:auto;padding-bottom:6px}
.op-thumbs-scroll::-webkit-scrollbar{height:6px}
.op-thumbs-scroll::-webkit-scrollbar-thumb{background:#d9e7ef;border-radius:999px}
.op-thumb{width:76px;height:76px;border-radius:12px;object-fit:cover;border:2px solid #fff;box-shadow:0 1px 8px #0002;background:#fff;cursor:pointer;opacity:.92;transition:transform .1s, opacity .1s}
.op-thumb:hover{transform:translateY(-1px);opacity:1}
.op-thumb--active{outline:2px solid #219ebc}

/* infos */
.op-info{display:flex;flex-direction:column;gap:18px;min-width:320px}
.op-meta-list{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;font-size:1.02rem;color:#222}
.op-meta-list span{display:flex;align-items:center;gap:8px;color:#334155;font-weight:700}

/* CTA */
.op-cta{background:#fff;border-radius:16px;border:1.5px solid #eef2f6;padding:18px;box-shadow:0 2px 16px #0000000d;display:flex;flex-direction:column;gap:12px}

/* CTA forte */
.op-cta-highlight{background:#fff4eb;border:2px solid #fbc98f;border-radius:18px;padding:18px;box-shadow:0 4px 18px #fb850033;text-align:center}
.op-cta-title{display:flex;align-items:center;justify-content:center;gap:8px;font-size:1.08rem;font-weight:900;color:#b45309;margin-bottom:10px}
.op-benefits{text-align:left;margin:0 auto 12px;max-width:460px;color:#78350f;font-weight:600;line-height:1.5}
.op-benefits li{margin-bottom:6px}

.op-btn-laranja{width:100%;border:none;border-radius:10px;padding:14px 0;font-weight:800;font-size:1.12rem;box-shadow:0 2px 10px #fb850022;transition:background .14s, transform .12s}
.op-btn-laranja:not([aria-disabled="true"]):hover{background:#e17000 !important;transform:translateY(-1px)}
.op-btn-big{padding:16px 0;font-size:1.15rem}
.op-cta-note{font-size:.86rem;color:#9a6c00}

/* upsell */
.op-upsell{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:14px;padding:10px 12px}
.op-upsell-left{color:#0f172a;font-weight:800}
.op-upsell-btn{display:inline-flex;align-items:center;gap:6px;background:#219ebc;color:#fff;border-radius:10px;padding:8px 12px;text-decoration:none;font-weight:800}
.op-upsell-btn:hover{background:#176684}

/* contato liberado */
.op-contact{border:1.5px solid #d1fae5;background:#ecfdf5;border-radius:14px;padding:14px}
.op-contact-title{display:flex;align-items:center;gap:8px;color:#065f46;font-weight:800;margin-bottom:6px}
.op-contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.op-contact-label{font-size:.75rem;color:#6b7280;font-weight:800}
.op-contact-value{font-weight:700;color:#111827}
.op-contact-wpp{display:flex;align-items:center;gap:8px}
.op-copy{display:inline-flex;align-items:center;gap:4px;font-size:.78rem;color:#334155;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:4px 8px}
.op-btn-azul{margin-top:10px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:10px;padding:13px 0;font-weight:800;font-size:1.05rem;background:#219ebc;color:#fff;text-decoration:none;box-shadow:0 2px 10px #219ebc22;transition:background .14s, transform .12s}
.op-btn-azul:hover{background:#176684;transform:translateY(-1px)}

/* descrição */
.op-desc-card{
  width:100%;
  max-width:560px;
  background:#ffffff;
  border:1.5px solid #e6eef6;
  border-radius:18px;
  box-shadow:0 4px 18px rgba(2,48,71,0.06);
  padding:14px 16px;
  margin-top:12px;
}
.op-desc-header{ display:flex;align-items:center;justify-content:space-between;margin-bottom:8px }
.op-desc-badge{
  display:inline-flex;align-items:center;gap:6px;
  background:#f1f7ff;border:1px solid #dbeafe;color:#0b4a6e;
  font-weight:900;font-size:.95rem;border-radius:999px;padding:6px 10px
}
.op-desc-body{ font-size:1.12rem;line-height:1.75;color:#1f2937;white-space:pre-wrap }

/* carrossel */
.op-recomenda{margin-top:34px}
.op-recomenda h3{font-size:1.25rem;font-weight:800;color:#023047;margin-bottom:12px}
.op-carousel{display:flex;gap:14px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x mandatory}
.op-carousel::-webkit-scrollbar{height:8px}
.op-carousel::-webkit-scrollbar-thumb{background:#d9e7ef;border-radius:999px}
.op-card-mini{flex:0 0 240px;scroll-snap-align:start;background:#fff;border:1.5px solid #e5e7eb;border-radius:14px;padding:14px;box-shadow:0 2px 10px #0000000a;transition:transform .15s;text-decoration:none}
.op-card-mini:hover{transform:translateY(-2px)}
.op-card-mini-title{font-weight:800;color:#111827;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.op-card-mini-meta{font-size:.9rem;color:#555;margin-bottom:2px}

/* skeleton */
.op-skel{
  height:420px;
  border-radius:22px;
  background:linear-gradient(90deg,#eef5fb 25%,#f5faff 37%,#eef5fb 63%);
  background-size:400% 100%;
  animation:opShimmer 1.3s infinite;
  box-shadow:0 2px 16px #0001
}
@keyframes opShimmer{
  0%{background-position:100% 0}
  100%{background-position:0 0}
}

/* ===== Lightbox ===== */
.lb-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,0.85);
  z-index:1100;display:flex;align-items:center;justify-content:center
}
.lb-img{
  max-width:92vw;max-height:88vh;object-fit:contain;
  border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.45)
}
.lb-nav{
  position:fixed;top:50%;transform:translateY(-50%);
  width:46px;height:46px;border-radius:999px;border:1px solid #ffffff44;
  background:#00000055;color:#fff;font-size:30px;display:grid;place-items:center;
  cursor:pointer;z-index:1101
}
.lb-left{left:24px}
.lb-right{right:24px}
.lb-close{
  position:fixed;top:18px;right:22px;width:40px;height:40px;border-radius:999px;
  border:1px solid #ffffff44;background:#00000055;color:#fff;font-size:26px;
  display:grid;place-items:center;cursor:pointer;z-index:1101
}

/* ===== PDF Thumb + Modal ===== */
.op-pdf-thumb{
  width:100%;max-width:560px;border:1.5px solid #eef2f6;border-radius:16px;
  background:#fff;box-shadow:0 2px 14px rgba(0,0,0,0.06);overflow:hidden;
  cursor:zoom-in;margin-top:8px;transition:transform .12s, box-shadow .12s
}
.op-pdf-thumb:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,0.08)}
.op-pdf-thumb-cover{
  position:relative;padding:8px;display:grid;place-items:center;min-height:140px;
  background:linear-gradient(180deg,#f8fbff,#ffffff)
}
.pdf-badge{
  position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;font-weight:900;
  font-size:12px;padding:4px 8px;border-radius:999px;letter-spacing:.4px
}
.pdf-thumb-skeleton{
  width:100%;height:160px;border-radius:8px;
  background:linear-gradient(90deg,#f2f6fb 25%,#e9eef5 37%,#f2f6fb 63%);
  background-size:400% 100%;animation:pdfShimmer 1.2s infinite
}
@keyframes pdfShimmer{
  0%{background-position:100% 0}
  100%{background-position:0 0}
}
.op-pdf-thumb-meta{
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:10px 12px;border-top:1px solid #eef2f6
}
.op-pdf-thumb-meta .titulo{color:#023047;font-weight:900}
.op-pdf-thumb-meta .cta{color:#219ebc;font-weight:800;font-size:.92rem}

.pdf-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,0.75);
  z-index:1100;display:flex;align-items:center;justify-content:center;padding:4vw
}
.pdf-modal{
  background:#fff;border-radius:14px;width:min(1100px,96vw);height:min(85vh,900px);
  overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.35)
}
.pdf-close{
  position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:999px;
  border:1px solid #e5e7eb;background:#fff;font-size:22px;font-weight:900;cursor:pointer;z-index:1
}
.pdf-container{width:100%;height:100%}

/* ===== Responsivo ===== */
@media (max-width: 1024px){
  .op-grid{grid-template-columns:1fr;gap:22px}
  .op-wrap{padding:16px 2vw 48px 2vw}
  .op-img{max-width:100%;aspect-ratio:4/3}
  .op-meta-list{grid-template-columns:1fr}
  .op-headbar{flex-direction:column;align-items:flex-start;gap:10px}
}
`;

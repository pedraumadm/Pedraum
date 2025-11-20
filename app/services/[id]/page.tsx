// app/services/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  Tag,
  Calendar,
  MapPin,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Layers,
  Share2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// ❌ Removido RequireAuth – página será pública
import dynamic from "next/dynamic";

// === PDF & Thumbs (somente no client)
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), {
  ssr: false,
});
const PDFThumb = dynamic(() => import("@/components/PDFThumb"), { ssr: false });

/* ======================= Tipos ======================= */
type ServiceDoc = {
  id: string;
  userId?: string; // compat
  vendedorId?: string;
  prestadorNome?: string;
  prestadorWhatsapp?: string;

  titulo?: string;
  descricao?: string;

  categoria?: string;
  estado?: string;
  abrangencia?: string;
  disponibilidade?: string;

  preco?: number | string | null;

  imagens?: string[];
  createdAt?: any;
  expiraEm?: any;
  tipo?: string;

  // >>> ajuste o nome do campo de PDF aqui se necessário
  pdfUrl?: string;
};

/* ======================= Utils ======================= */
function toDate(ts?: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function isNovo(createdAt?: any) {
  const d = toDate(createdAt);
  if (!d) return false;
  const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}
function isExpired(createdAt?: any, expiraEm?: any) {
  const now = Date.now();
  const expDate = toDate(expiraEm);
  if (expiraEm && expDate) return now > expDate.getTime();
  const created = toDate(createdAt);
  if (!created) return false;
  const plus45 = new Date(created);
  plus45.setDate(plus45.getDate() + 45);
  return now > plus45.getTime();
}
function currency(preco: any) {
  if (preco === "Sob consulta" || preco === "" || preco == null) return "";
  const n = Number(preco);
  if (isNaN(n) || n <= 0) return "";
  return `R$ ${n.toLocaleString("pt-BR")}`;
}
function resumo(str: string = "", len = 160) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len - 3) + "...";
}
const notEmpty = (v: unknown): v is string =>
  typeof v === "string" && !!v.trim();

/* ======================= Modal de contato ======================= */
function ModalContato({
  open,
  onClose,
  usuario,
  service,
}: {
  open: boolean;
  onClose: () => void;
  usuario: any;
  service: ServiceDoc;
}) {
  const [form, setForm] = useState({
    nome: usuario?.nome || "",
    telefone: usuario?.telefone || "",
    email: usuario?.email || "",
    cidade: usuario?.cidade || "",
    cnpj: usuario?.cnpj || "",
    mensagem: "",
  });

  useEffect(() => {
    if (open && usuario) {
      setForm({
        nome: usuario?.nome || "",
        telefone: usuario?.telefone || "",
        email: usuario?.email || "",
        cidade: usuario?.cidade || "",
        cnpj: usuario?.cnpj || "",
        mensagem: "",
      });
    }
  }, [open, usuario]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="sv-lb-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="sv-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="sv-modal-close"
              aria-label="Fechar"
              onClick={onClose}
            >
              ×
            </button>

            <h2 className="sv-modal-title">Fale com o prestador</h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const user = auth.currentUser;
                if (!user) {
                  alert("Faça login para entrar em contato.");
                  return;
                }
                await addDoc(collection(db, "leads"), {
                  createdAt: serverTimestamp(),
                  tipo: "servico",
                  serviceId: service.id,
                  serviceTitle: service.titulo || "",
                  vendedorId: service.vendedorId || service.userId || "",
                  prestadorNome: service.prestadorNome || "",
                  nome: form.nome,
                  telefone: form.telefone,
                  email: form.email,
                  cidade: form.cidade,
                  cnpj: form.cnpj,
                  mensagem: form.mensagem,
                  status: "novo",
                  statusPagamento: "pendente",
                  valorLead: 12,
                  metodoPagamento: "mercado_pago",
                  paymentLink: "",
                  pagoEm: "",
                  liberadoEm: "",
                  idTransacao: "",
                  isTest: false,
                  imagens: Array.isArray(service.imagens)
                    ? service.imagens
                    : [],
                });
                alert("Mensagem enviada com sucesso!");
                onClose();
              }}
              className="sv-modal-form"
            >
              <input
                name="nome"
                placeholder="Nome completo"
                value={form.nome}
                onChange={handleChange}
                required
                className="sv-input"
              />
              <input
                name="telefone"
                placeholder="Telefone / WhatsApp"
                value={form.telefone}
                onChange={handleChange}
                required
                className="sv-input"
              />
              <input
                name="email"
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={handleChange}
                required
                className="sv-input"
              />
              <input
                name="cidade"
                placeholder="Cidade"
                value={form.cidade}
                onChange={handleChange}
                className="sv-input"
              />
              <input
                name="cnpj"
                placeholder="CNPJ (opcional)"
                value={form.cnpj}
                onChange={handleChange}
                className="sv-input"
              />
              <textarea
                name="mensagem"
                placeholder="Mensagem/interesse (opcional)"
                value={form.mensagem}
                onChange={handleChange}
                className="sv-input"
                rows={3}
              />
              <button type="submit" className="sv-btn-laranja">
                Enviar mensagem
              </button>
              <span className="sv-modal-note">
                A Pedraum Brasil não participa das negociações nem garante
                pagamentos, entregas ou resultados.
              </span>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ======================= Página ======================= */
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [service, setService] = useState<ServiceDoc | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // galeria
  const [imgIndex, setImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // relacionados
  const [relacionados, setRelacionados] = useState<ServiceDoc[]>([]);
  const carrosselRef = useRef<HTMLDivElement>(null);

  // ====== PDF ======
  const [pdfOpen, setPdfOpen] = useState(false);
  const pdfThumbCoverRef = useRef<HTMLDivElement | null>(null);
  const [pdfThumbReady, setPdfThumbReady] = useState(false);
  const [pdfThumbWidth, setPdfThumbWidth] = useState(520);

  // ====== Auth: apenas para preencher modal (página é pública) ======
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uref = doc(db, "usuarios", user.uid);
        const usnap = await getDoc(uref);
        if (usnap.exists()) {
          const u = usnap.data() as any;
          setUsuarioLogado({
            nome: u.nome || user.displayName || "",
            telefone: u.whatsapp || u.telefone || "",
            email: user.email || "",
            cidade: u.cidade || "",
            cnpj: u.cpfCnpj || "",
          });
        } else {
          setUsuarioLogado({
            nome: user.displayName || "",
            telefone: "",
            email: user.email || "",
            cidade: "",
            cnpj: "",
          });
        }
      } else {
        setUsuarioLogado(null);
      }
      setCarregandoUsuario(false);
    });
    return () => unsub();
  }, []);

  // carregar serviço
  useEffect(() => {
    (async () => {
      if (!id) return;
      const ref = doc(db, "services", String(id));
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = { id: snap.id, ...(snap.data() as any) } as ServiceDoc;
      if (!data.vendedorId && data.userId) data.vendedorId = data.userId;
      setService(data);
    })();
  }, [id]);

  // relacionados
  useEffect(() => {
    (async () => {
      if (!service?.categoria) {
        setRelacionados([]);
        return;
      }
      const qy = query(
        collection(db, "services"),
        where("categoria", "==", service.categoria),
        limit(20),
      );
      const snap = await getDocs(qy);
      const list: ServiceDoc[] = [];
      snap.forEach((d) => {
        if (d.id !== service.id) list.push({ id: d.id, ...(d.data() as any) });
      });
      const ativos = list
        .filter((x) => !isExpired(x.createdAt, x.expiraEm))
        .sort(
          (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
        );
      setRelacionados(ativos.slice(0, 12));
    })();
  }, [service?.id, service?.categoria]);

  // ===== PDF config (lazy & responsivo) =====
  const pdfUrl: string | undefined = (service as any)?.pdfUrl || undefined;
  const pdfSrc = pdfUrl
    ? `/api/pdf-proxy?file=${encodeURIComponent(pdfUrl)}`
    : undefined;

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

  // página ainda carregando / sem serviço
  if (!service) {
    return (
      <section className="sv-wrap">
        <div className="sv-skel" />
        <style jsx>{baseCss}</style>
      </section>
    );
  }

  const imagens: string[] = Array.isArray(service.imagens)
    ? service.imagens.filter(notEmpty)
    : [];
  const imgPrincipal = imagens[imgIndex] || "/images/no-image.png";
  const expirado = isExpired(service.createdAt, service.expiraEm);
  const precoFmt = currency(service.preco);
  const podeMostrarPreco = Boolean(precoFmt);

  const whatsLink = service.prestadorWhatsapp
    ? `https://wa.me/${service.prestadorWhatsapp.replace(
        /\D/g,
        "",
      )}?text=${encodeURIComponent(
        `Olá! Tenho interesse no serviço "${service?.titulo || ""}".`,
      )}`
    : "";

  // ========= Helper para exigir login só nos CTAs =========
  function goToLogin() {
    const redirectTarget =
      typeof id === "string" ? `/services/${id}` : "/vitrine";
    const encoded = encodeURIComponent(redirectTarget);
    router.push(`/auth/login?redirect=${encoded}`);
  }

  const handleContatoClick = () => {
    if (expirado || carregandoUsuario) return;

    if (!auth.currentUser) {
      goToLogin();
      return;
    }

    setModalOpen(true);
  };

  const handleWhatsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (expirado || !whatsLink) return;

    if (!auth.currentUser) {
      goToLogin();
      return;
    }

    window.open(whatsLink, "_blank");
  };

  const conteudo = (
    <section className="sv-wrap">
      {/* Topo / ações */}
      <div className="sv-header">
        <button onClick={() => router.back()} className="sv-voltar">
          &lt; Voltar
        </button>
        <button
          className="sv-share"
          onClick={() => {
            try {
              const url =
                typeof window !== "undefined" ? window.location.href : "";
              const data = {
                title: service.titulo || "Serviço",
                text: "Veja este serviço no Pedraum",
                url,
              };
              // @ts-ignore
              if (navigator.share) navigator.share(data);
              else if (url) navigator.clipboard.writeText(url);
            } catch {}
          }}
        >
          <Share2 size={16} /> Compartilhar
        </button>
      </div>

      {/* Grid principal */}
      <div className="sv-grid">
        {/* ===== MÍDIA ===== */}
        <div className="sv-media">
          <div
            className="sv-img-wrap"
            role="button"
            tabIndex={0}
            title={imagens.length ? "Clique para ampliar" : undefined}
            onClick={() => imagens.length && setLightboxOpen(true)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") &&
              imagens.length &&
              setLightboxOpen(true)
            }
          >
            <img
              src={imgPrincipal}
              alt={service.titulo || "Serviço"}
              className="sv-img"
              onError={(e) =>
                ((e.currentTarget as HTMLImageElement).src =
                  "/images/no-image.png")
              }
            />
            {imagens.length > 0 && (
              <span className="sv-zoom-hint">Clique para ampliar</span>
            )}
          </div>

          {imagens.length > 1 && (
            <div className="sv-thumbs sv-thumbs-scroll">
              {imagens.map((img, idx) => (
                <img
                  key={idx}
                  src={img || "/images/no-image.png"}
                  alt={`Imagem ${idx + 1}`}
                  className={`sv-thumb ${idx === imgIndex ? "sv-thumb--active" : ""}`}
                  onClick={() => setImgIndex(idx)}
                  onError={(e) =>
                    ((e.currentTarget as HTMLImageElement).src =
                      "/images/no-image.png")
                  }
                />
              ))}
            </div>
          )}

          {/* Thumb do PDF, se houver */}
          {pdfSrc && (
            <div
              className="sv-pdf-thumb"
              role="button"
              tabIndex={0}
              title="Abrir anexo (PDF)"
              onClick={() => setPdfOpen(true)}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setPdfOpen(true)
              }
            >
              <div className="sv-pdf-thumb-cover" ref={pdfThumbCoverRef}>
                <span className="sv-pdf-badge">PDF</span>
                {pdfThumbReady ? (
                  <PDFThumb src={pdfSrc} width={pdfThumbWidth} />
                ) : (
                  <div className="sv-pdf-skel" />
                )}
              </div>
              <div className="sv-pdf-thumb-meta">
                <div className="titulo">Documento em PDF deste serviço</div>
                <div className="cta">Clique para abrir</div>
              </div>
            </div>
          )}

          {/* CTA principal */}
          <div className="sv-cta">
            {podeMostrarPreco && <div className="sv-preco">{precoFmt}</div>}

            <button
              className="sv-btn-laranja"
              onClick={handleContatoClick}
              disabled={expirado || carregandoUsuario}
              aria-disabled={expirado || carregandoUsuario}
              style={{
                background: expirado ? "#d1d5db" : undefined,
                cursor: expirado ? "not-allowed" : "pointer",
              }}
            >
              {expirado ? "Expirado" : "Entrar em Contato"}
            </button>

            {whatsLink && !expirado && (
              <a
                href={whatsLink}
                onClick={handleWhatsClick}
                className="sv-btn-azul"
              >
                WhatsApp do prestador
              </a>
            )}
          </div>
        </div>

        {/* ===== INFOS ===== */}
        <div className="sv-info">
          <div className="sv-title-row">
            <h1 className="sv-title">
              <Wrench size={26} className="sv-title-icon" />
              {service.titulo || "Serviço"}
            </h1>

            <div className="sv-badges">
              {isNovo(service.createdAt) && !expirado && (
                <span className="sv-badge sv-badge--novo">NOVO</span>
              )}
              {expirado && (
                <span className="sv-badge sv-badge--exp">EXPIRADO</span>
              )}
            </div>
          </div>

          <div className="sv-meta-list">
            {service.categoria && (
              <span>
                <Layers size={18} /> {service.categoria}
              </span>
            )}
            {service.disponibilidade && (
              <span>
                <Calendar size={18} /> {service.disponibilidade}
              </span>
            )}
            {service.estado && (
              <span>
                <MapPin size={18} /> {service.estado}
              </span>
            )}
            {service.abrangencia && (
              <span>
                <Tag size={18} /> {service.abrangencia}
              </span>
            )}
          </div>

          {service.descricao && (
            <div className="sv-desc-card">
              <div className="sv-desc-badge">Resumo</div>
              <div className="sv-desc-body">
                {resumo(service.descricao, 260)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Descrição completa (sem cardzão) */}
      {service.descricao && (
        <div className="sv-desc-full">
          <div className="sv-desc-title">Descrição Completa</div>
          <div className="sv-desc-text">{service.descricao}</div>
        </div>
      )}

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <div className="sv-rel-wrap">
          <div className="sv-rel-header">
            <h3>Serviços relacionados</h3>
            <div className="sv-rel-nav">
              <button
                aria-label="Voltar"
                onClick={() =>
                  carrosselRef.current?.scrollBy({
                    left: -320,
                    behavior: "smooth",
                  })
                }
              >
                <ChevronLeft />
              </button>
              <button
                aria-label="Avançar"
                onClick={() =>
                  carrosselRef.current?.scrollBy({
                    left: 320,
                    behavior: "smooth",
                  })
                }
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="sv-rel" ref={carrosselRef}>
            {relacionados.map((r) => {
              const precoR = currency(r.preco);
              const img =
                (Array.isArray(r.imagens) && r.imagens[0]) ||
                "/images/no-image.png";
              return (
                <Link
                  key={r.id}
                  href={`/services/${r.id}`}
                  className="sv-rel-card"
                >
                  <div className="sv-rel-img">
                    <img
                      src={img}
                      alt={r.titulo || "Serviço"}
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src =
                          "/images/no-image.png")
                      }
                    />
                  </div>
                  <div className="sv-rel-body">
                    <div className="sv-rel-title">{r.titulo || "Serviço"}</div>
                    {r.categoria && (
                      <div className="sv-rel-cat">{r.categoria}</div>
                    )}
                    {precoR && <div className="sv-rel-preco">{precoR}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Lightbox de imagens ===== */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sv-lb-overlay"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.img
              key={imgIndex}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", duration: 0.25 }}
              src={imagens[imgIndex] || "/images/no-image.png"}
              alt={service.titulo || "Serviço"}
              className="sv-lb-img"
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
                    setImgIndex(
                      (i) => (i - 1 + imagens.length) % imagens.length,
                    );
                  }}
                  className="sv-lb-nav sv-lb-left"
                >
                  ‹
                </button>
                <button
                  aria-label="Próxima"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImgIndex((i) => (i + 1) % imagens.length);
                  }}
                  className="sv-lb-nav sv-lb-right"
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
              className="sv-lb-close"
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
            className="sv-pdf-ovl"
            onClick={() => setPdfOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", duration: 0.25 }}
              className="sv-pdf-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label="Fechar"
                onClick={() => setPdfOpen(false)}
                className="sv-pdf-close"
              >
                ×
              </button>
              <div className="sv-pdf-container">
                <DrivePDFViewer fileUrl={pdfSrc} height={undefined as any} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{baseCss}</style>
    </section>
  );

  // ✅ Página PÚBLICA – sem RequireAuth. Só os CTAs exigem login.
  return (
    <>
      {conteudo}

      {service && (
        <ModalContato
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          usuario={usuarioLogado}
          service={service}
        />
      )}
    </>
  );
}

/* ======================= CSS (único <style jsx>) ======================= */
const baseCss = `
:root{ --sv-blue:#176684; }

.sv-wrap{max-width:1200px;margin:0 auto;padding:24px 0 60px 0;background:#f8fbfd}

.sv-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.sv-voltar{color:#219ebc;font-size:1rem;text-decoration:underline;background:none;border:none;cursor:pointer}
.sv-share{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5eef6;border-radius:999px;padding:6px 10px;color:#176684;font-weight:800}
.sv-share:hover{background:#f4faff}

.sv-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:32px;margin-top:10px}

/* ===== Mídia ===== */
.sv-media{display:flex;flex-direction:column;align-items:center;gap:16px}
.sv-img-wrap{position:relative;width:100%;max-width:560px;cursor:zoom-in}
.sv-img{width:100%;max-width:560px;aspect-ratio:4/3;border-radius:22px;object-fit:cover;box-shadow:0 4px 32px #0001;background:#fff}
.sv-zoom-hint{position:absolute;right:12px;bottom:12px;background:#0000006b;color:#fff;font-size:12px;font-weight:800;padding:6px 8px;border-radius:8px}

/* thumbs */
.sv-thumbs{display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;justify-content:center}
.sv-thumbs-scroll{overflow-x:auto;padding-bottom:6px}
.sv-thumbs-scroll::-webkit-scrollbar{height:6px}
.sv-thumbs-scroll::-webkit-scrollbar-thumb{background:#d9e7ef;border-radius:999px}
.sv-thumb{width:76px;height:76px;border-radius:12px;object-fit:cover;border:2px solid #fff;box-shadow:0 1px 8px #0002;background:#fff;cursor:pointer;opacity:.92;transition:transform .1s, opacity .1s}
.sv-thumb:hover{transform:translateY(-1px);opacity:1}
.sv-thumb--active{outline:2px solid #219ebc}

/* PDF Thumb */
.sv-pdf-thumb{width:100%;max-width:560px;border:1.5px solid #eef2f6;border-radius:16px;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,0.06);overflow:hidden;cursor:zoom-in;transition:transform .12s, box-shadow .12s}
.sv-pdf-thumb:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,0.08)}
.sv-pdf-thumb-cover{position:relative;padding:8px;display:grid;place-items:center;min-height:140px;background:linear-gradient(180deg,#f8fbff,#ffffff)}
.sv-pdf-badge{position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;font-weight:900;font-size:12px;padding:4px 8px;border-radius:999px;letter-spacing:.4px}
.sv-pdf-skel{width:100%;height:160px;border-radius:8px;background:linear-gradient(90deg,#f2f6fb 25%,#e9eef5 37%,#f2f6fb 63%);background-size:400% 100%;animation:svPdfShimmer 1.2s infinite}
@keyframes svPdfShimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.sv-pdf-thumb-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-top:1px solid #eef2f6}
.sv-pdf-thumb-meta .titulo{color:#023047;font-weight:900}
.sv-pdf-thumb-meta .cta{color:#219ebc;font-weight:800;font-size:.92rem}

/* CTA leve */
.sv-cta{width:100%;max-width:560px;display:flex;flex-direction:column;gap:10px}
.sv-preco{font-size:2.1rem;font-weight:900;color:#fb8500;letter-spacing:.5px}

/* ===== Infos ===== */
.sv-info{display:flex;flex-direction:column;gap:18px;min-width:320px}
.sv-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.sv-title{font-size:1.9rem;font-weight:900;color:#023047;letter-spacing:-.4px;margin:0;display:flex;align-items:center;gap:8px}
.sv-title-icon{color:#fb8500}
.sv-badges{display:flex;align-items:center;gap:8px}
.sv-badge{display:inline-block;font-size:.82rem;font-weight:900;padding:5px 12px;border-radius:999px;color:#fff}
.sv-badge--novo{background:#10b981}
.sv-badge--exp{background:#9ca3af}

.sv-meta-list{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;font-size:1.02rem;color:#222}
.sv-meta-list span{display:flex;align-items:center;gap:8px;color:#334155;font-weight:700}

/* resumo (cartão leve) */
.sv-desc-card{
  width:100%;max-width:560px;background:#ffffff;border:1.5px solid #e6eef6;border-radius:18px;
  box-shadow:0 4px 18px rgba(2,48,71,0.06);padding:14px 16px;margin-top:6px
}
.sv-desc-badge{display:inline-flex;align-items:center;gap:6px;background:#f1f7ff;border:1px solid #dbeafe;color:#0b4a6e;font-weight:900;font-size:.95rem;border-radius:999px;padding:6px 10px}
.sv-desc-body{font-size:1.06rem;line-height:1.6;color:#1f2937}

/* descrição completa — SEM CARD */
.sv-desc-full{margin-top:34px;padding:0}
.sv-desc-title{font-size:1.45rem;font-weight:900;color:#023047;margin-bottom:12px}
.sv-desc-text{font-size:1.05rem;color:#111827;white-space:pre-wrap}

/* relacionados */
.sv-rel-wrap{margin-top:40px}
.sv-rel-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sv-rel-header h3{font-size:1.25rem;color:#023047;font-weight:900;margin:0}
.sv-rel-nav button{width:38px;height:38px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;margin-left:8px}
.sv-rel{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(240px,1fr);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}
.sv-rel-card{scroll-snap-align:start;border:1.5px solid #eef2f6;border-radius:14px;background:#fff;text-decoration:none;color:inherit;overflow:hidden;box-shadow:0 2px 12px #0000000a;transition:transform .12s, box-shadow .12s;display:flex;flex-direction:column}
.sv-rel-card:hover{transform:translateY(-2px);box-shadow:0 6px 18px #00000014}
.sv-rel-img{width:100%;height:140px;background:#f3f6fa;display:flex;align-items:center;justify-content:center;overflow:hidden}
.sv-rel-img img{width:100%;height:100%;object-fit:cover}
.sv-rel-body{padding:12px}
.sv-rel-title{font-weight:800;font-size:1rem;color:#023047;margin-bottom:4px}
.sv-rel-cat{font-size:.86rem;color:#219ebc;font-weight:700}
.sv-rel-preco{margin-top:6px;color:#fb8500;font-weight:900}

/* buttons */
.sv-btn-laranja{width:100%;border:none;border-radius:10px;padding:14px 0;font-weight:800;font-size:1.12rem;background:#fb8500;color:#fff;box-shadow:0 2px 10px #fb850022;transition:background .14s, transform .12s}
.sv-btn-laranja:not([aria-disabled="true"]):hover{background:#e17000;transform:translateY(-1px)}
.sv-btn-azul{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:10px;padding:13px 0;font-weight:800;font-size:1.05rem;background:#219ebc;color:#fff;text-decoration:none;box-shadow:0 2px 10px #219ebc22;transition:background .14s, transform .12s}
.sv-btn-azul:hover{background:#176684;transform:translateY(-1px)}

/* skeleton */
.sv-skel{
  height:420px;border-radius:22px;background:linear-gradient(90deg,#eef5fb 25%,#f5faff 37%,#eef5fb 63%);
  background-size:400% 100%;animation:svShimmer 1.3s infinite;box-shadow:0 2px 16px #0001
}
@keyframes svShimmer{0%{background-position:100% 0}100%{background-position:0 0}}

/* Lightbox imagens */
.sv-lb-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1100;display:flex;align-items:center;justify-content:center}
.sv-lb-img{max-width:92vw;max-height:88vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.45)}
.sv-lb-nav{position:fixed;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:999px;border:1px solid #ffffff44;background:#00000055;color:#fff;font-size:30px;display:grid;place-items:center;cursor:pointer;z-index:1101}
.sv-lb-left{left:24px}
.sv-lb-right{right:24px}
.sv-lb-close{position:fixed;top:18px;right:22px;width:40px;height:40px;border-radius:999px;border:1px solid #ffffff44;background:#00000055;color:#fff;font-size:26px;display:grid;place-items:center;cursor:pointer;z-index:1101}

/* Modal de contato */
.sv-modal{background:#fff;border-radius:18px;box-shadow:0 10px 36px #0003;padding:38px;max-width:440px;width:98vw;position:relative}
.sv-modal-close{position:absolute;top:16px;right:20px;font-size:22px;background:none;border:1px solid #e5e7eb;border-radius:999px;width:36px;height:36px;color:#176684;cursor:pointer;font-weight:900}
.sv-modal-title{font-size:1.42rem;font-weight:900;color:#023047;margin-bottom:16px}
.sv-modal-form{display:flex;flex-direction:column;gap:13px}
.sv-input{border:1.5px solid #d4e3ed;border-radius:8px;padding:11px 14px;font-size:1rem;margin-bottom:2px;outline:none;transition:border .15s}
.sv-input:focus{border:1.5px solid #219EBC}
.sv-modal-note{font-size:.8rem;margin-top:6px;color:#777;text-align:center}

/* PDF modal */
.sv-pdf-ovl{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1100;display:flex;align-items:center;justify-content:center;padding:4vw}
.sv-pdf-modal{background:#fff;border-radius:14px;width:min(1100px,96vw);height:min(85vh,900px);overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.35)}
.sv-pdf-close{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;font-size:22px;font-weight:900;cursor:pointer;z-index:1}
.sv-pdf-container{width:100%;height:100%}

/* Responsivo */
@media (max-width: 1024px){
  .sv-grid{grid-template-columns:1fr;gap:22px}
  .sv-wrap{padding:16px 2vw 48px 2vw}
  .sv-img{max-width:100%;aspect-ratio:4/3}
  .sv-meta-list{grid-template-columns:1fr}
}
`;

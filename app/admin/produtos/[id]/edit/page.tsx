"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useTaxonomia } from "@/hooks/useTaxonomia";

import ImageUploader from "@/components/ImageUploader";
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

import {
  Loader2,
  Loader as LoaderIcon,
  Trash2,
  Save,
  ChevronLeft,
  Upload,
  FileText,
  Image as ImageIcon,
  Tag,
  List,
  DollarSign,
  Calendar,
  MapPin,
  BookOpen,
} from "lucide-react";

/* ===================== Curadoria: tipos ===================== */
type ProdutoStatus = "em_curadoria" | "aprovado" | "recusado" | "ajustes_solicitados" | "pausado";

/* ===================== Ações sem mensagens ao anunciante ===================== */
async function approveAndPublishProduct(produtoId: string) {
  const ref = doc(db, "produtos", produtoId);
  await updateDoc(ref, {
    status: "aprovado",
    visivel: true,
    curadoriaStatus: "aprovado",
    curadoriaBy: "admin",
    curadoriaAt: serverTimestamp(),
    approvedBy: "admin",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function rejectProduct(produtoId: string) {
  const ref = doc(db, "produtos", produtoId);
  await updateDoc(ref, {
    status: "recusado",
    visivel: false,
    curadoriaStatus: "recusado",
    curadoriaBy: "admin",
    curadoriaAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function backToPendingProduct(produtoId: string) {
  const ref = doc(db, "produtos", produtoId);
  await updateDoc(ref, {
    status: "em_curadoria",
    visivel: false,
    curadoriaStatus: "pendente",
    curadoriaBy: "admin",
    curadoriaAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* ===================== Constantes ===================== */
const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const condicoes = [
  "Novo com garantia",
  "Novo sem garantia",
  "Reformado com garantia",
  "Reformado",
  "No estado que se encontra",
];

export default function AdminEditProdutoPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-[#023047]">Carregando…</div>}>
      <AdminEditProdutoPage />
    </Suspense>
  );
}

function AdminEditProdutoPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // 🔗 Taxonomia unificada (Firestore > fallback local)
  const { categorias, loading: taxLoading } = useTaxonomia();

  const [produto, setProduto] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [curating, setCurating] = useState(false);

  // feedback geral
  const [msg, setMsg] = useState("");

  // imagens e PDF
  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // form (sem status/visivel para não sobrescrever curadoria)
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    subcategoria: "",
    ano: "",
    condicao: "",
    tipo: "produto",
    cidade: "",
    estado: "",
  });

  // cidades por UF (IBGE)
  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  /* ===================== Carrega produto e usuário ===================== */
  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      try {
        const prodSnap = await getDoc(doc(db, "produtos", id));
        if (!prodSnap.exists()) {
          setProduto(null);
          setLoading(false);
          return;
        }
        const data = prodSnap.data() as any;
        setProduto({ id, ...data });

        setForm({
          nome: data.nome || "",
          descricao: data.descricao || "",
          preco: data.preco != null ? String(data.preco) : "",
          categoria: data.categoria || "",
          subcategoria: data.subcategoria || "",
          ano: data.ano != null ? String(data.ano) : "",
          condicao: data.condicao || "",
          tipo: data.tipo || "produto",
          cidade: data.cidade || "",
          estado: data.estado || "",
        });

        setImagens(Array.isArray(data.imagens) ? data.imagens : []);
        setPdfUrl(data.pdfUrl || null);

        if (data.userId) {
          const userSnap = await getDoc(doc(db, "usuarios", data.userId));
          if (userSnap.exists()) setUser(userSnap.data());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  /* ===================== IBGE: cidades por UF ===================== */
  useEffect(() => {
    let abort = false;

    async function fetchCidades(uf: string) {
      if (!uf) {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as Array<{ nome: string }>;
        if (abort) return;

        const nomes = data
          .map((m) => m.nome)
          .sort((a, b) => a.localeCompare(b, "pt-BR"));

        if (form.cidade && !nomes.includes(form.cidade)) nomes.unshift(form.cidade);
        setCidades(nomes);
      } catch {
        if (!abort) setCidades((prev) => (prev.length ? prev : form.cidade ? [form.cidade] : []));
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }

    fetchCidades(form.estado);
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.estado]);

  /* ===================== Helpers ===================== */
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target as any;
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "categoria" ? { subcategoria: "" } : null),
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  const subcategoriasDisponiveis = useMemo(
    () => categorias.find((c) => c.nome === form.categoria)?.subcategorias || [],
    [categorias, form.categoria],
  );

  /* ===================== Persistência (Salvar) ===================== */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    if (!form.nome || !form.categoria || !form.subcategoria || !form.cidade || !form.estado) {
      setMsg("Preencha os campos obrigatórios.");
      setSaving(false);
      return;
    }
    if (imagens.length === 0) {
      setMsg("Envie pelo menos uma imagem.");
      setSaving(false);
      return;
    }

    try {
      await updateDoc(doc(db, "produtos", id), {
        nome: form.nome,
        descricao: form.descricao,
        categoria: form.categoria,
        subcategoria: form.subcategoria,
        cidade: form.cidade,
        estado: form.estado,
        condicao: form.condicao,
        tipo: form.tipo,
        preco: form.preco ? parseFloat(form.preco) : null,
        ano: form.ano ? Number(form.ano) : null,
        imagens,
        pdfUrl: pdfUrl || null,
        updatedAt: serverTimestamp(),
      });
      setMsg("Alterações salvas com sucesso!");
      setTimeout(() => setMsg(""), 4000);
    } catch {
      setMsg("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    setSaving(true);
    setMsg("");
    try {
      await deleteDoc(doc(db, "produtos", id));
      router.push("/admin/produtos");
    } catch {
      setMsg("Erro ao excluir produto.");
      setSaving(false);
    }
  }

  /* ===================== UI ===================== */
  if (loading)
    return (
      <div
        style={{ padding: 48, textAlign: "center", color: "#219EBC", fontWeight: 800 }}
      >
        <LoaderIcon size={30} className="animate-spin" /> Carregando...
      </div>
    );
  if (!produto)
    return (
      <div style={{ padding: 48, color: "red", textAlign: "center" }}>
        Produto não encontrado.
      </div>
    );

  const status: ProdutoStatus = (produto.status as ProdutoStatus) || "em_curadoria";
  const visivel: boolean = !!produto.visivel;
  const blocked = user?.status === "banido" || user?.status === "suspenso";

  // ações de curadoria simples (sem mensagens ao anunciante) + refresh
  const wrap = (fn: () => Promise<void>) => async () => {
    try {
      setCurating(true);
      await fn();
      try {
        router.refresh?.();
      } catch {}
      try {
        const fresh = await getDoc(doc(db, "produtos", id));
        if (fresh.exists()) setProduto({ id, ...fresh.data() });
      } catch {}
    } finally {
      setCurating(false);
    }
  };

  const doApprove = wrap(async () => {
    if (blocked) return alert("Usuário suspenso/banido. Ação bloqueada.");
    await approveAndPublishProduct(id);
  });

  const doReject = wrap(async () => {
    await rejectProduct(id);
  });

  const doBack = wrap(async () => {
    await backToPendingProduct(id);
  });

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "42px 2vw 60px 2vw",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 4px 28px #0001",
      }}
    >
      <Link
        href="/admin/produtos"
        style={{
          color: "#2563eb",
          fontWeight: 700,
          marginBottom: 28,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          textDecoration: "none",
        }}
      >
        <ChevronLeft size={18} /> Voltar para Produtos
      </Link>

      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 900,
          color: "#023047",
          margin: "0 0 25px 0",
        }}
      >
        Editar Produto (Admin)
      </h1>

      {/* Proprietário */}
      <div
        style={{
          background: "#f3f6fa",
          borderRadius: 12,
          padding: 18,
          marginBottom: 12,
          border: "1.6px solid #e8eaf0",
        }}
      >
        <div style={{ fontWeight: 800, color: "#219EBC", marginBottom: 6 }}>
          Proprietário do Produto
        </div>
        <div><b>Nome:</b> {user?.nome || "—"}</div>
        <div><b>E-mail:</b> {user?.email || "—"}</div>
        <div><b>UserID:</b> {produto.userId || "—"}</div>
      </div>

      {/* Bloqueio por status do dono */}
      {(user?.status === "banido" || user?.status === "suspenso") && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
            padding: 12,
            borderRadius: 10,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Este usuário está <b>{String(user?.status)}</b>. Publicação e aprovação estão bloqueadas.
        </div>
      )}

      {/* Datas */}
      <div style={{ color: "#64748b", fontSize: ".98rem", marginBottom: 12 }}>
        <div>
          <b>Criado em:</b>{" "}
          {produto.createdAt?.seconds
            ? new Date(produto.createdAt.seconds * 1000).toLocaleString("pt-BR")
            : "—"}
        </div>
        <div>
          <b>Atualizado em:</b>{" "}
          {produto.updatedAt?.seconds
            ? new Date(produto.updatedAt.seconds * 1000).toLocaleString("pt-BR")
            : "—"}
        </div>
      </div>

      {/* ===== Status + Ações (3 botões) ===== */}
      <div style={{ margin: "8px 0 18px", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              fontWeight: 900,
              fontSize: 12,
              ...(status === "aprovado"
                ? { background: "#ecfdf5", color: "#065f46" }
                : status === "recusado"
                ? { background: "#fff1f2", color: "#9f1239" }
                : status === "pausado"
                ? { background: "#f1f5f9", color: "#111827" }
                : { background: "#f1f5f9", color: "#111827" }),
            }}
          >
            Status: {status} • Visível: <b>{visivel ? "Sim" : "Não"}</b>
          </span>
          <div style={{ flex: 1 }} />

          {/* Apenas 3 botões: Aprovar, Rejeitar, Voltar p/ curadoria */}
          {status !== "aprovado" && (
            <button
              type="button"
              onClick={doApprove}
              disabled={blocked || curating}
              style={primaryBtn}
            >
              {curating ? "Processando…" : "Aprovar"}
            </button>
          )}

          {status !== "recusado" && (
            <button
              type="button"
              onClick={doReject}
              disabled={curating}
              style={dangerBtn}
            >
              {curating ? "Processando…" : "Rejeitar"}
            </button>
          )}

          <button
            type="button"
            onClick={doBack}
            disabled={curating}
            style={ghostBtn}
          >
            {curating ? "Processando…" : "Voltar p/ curadoria"}
          </button>
        </div>
      </div>

      {/* Mensagem (salvar) */}
      {msg && (
        <div
          style={{
            background: msg.toLowerCase().includes("sucesso") ? "#f7fafc" : "#fff7f7",
            color: msg.toLowerCase().includes("sucesso") ? "#16a34a" : "#b91c1c",
            border: `1.5px solid ${msg.toLowerCase().includes("sucesso") ? "#c3f3d5" : "#ffdada"}`,
            padding: "12px 0",
            borderRadius: 11,
            textAlign: "center",
            marginBottom: 15,
            fontWeight: 700,
          }}
        >
          {msg}
        </div>
      )}

      {/* ======= Uploads (imagens + PDF) ======= */}
      <div
        className="rounded-2xl border"
        style={{
          background: "linear-gradient(180deg,#f8fbff, #ffffff)",
          borderColor: "#e6ebf2",
          padding: "18px",
          marginBottom: 16,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-slate-700" />
          <h3 className="text-slate-800 font-black tracking-tight">Arquivos do anúncio</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Imagens */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: "#e6ebf2",
              background:
                "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff",
            }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-sky-700" />
              <strong className="text-[#0f172a]">Imagens *</strong>
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-lg border border-dashed p-3">
                <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
              </div>
              <p className="text-xs text-slate-500 mt-2">Envie até 5 imagens (JPG/PNG).</p>
            </div>
          </div>

          {/* PDF */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: "#e6ebf2",
              background:
                "radial-gradient(1200px 300px at -200px -200px, #fff1e6 0%, transparent 60%), #ffffff",
            }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <strong className="text-[#0f172a]">Ficha técnica (PDF) — opcional</strong>
            </div>
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-lg border border-dashed p-3">
                <PDFUploader initialUrl={pdfUrl ?? undefined} onUploaded={setPdfUrl} />
              </div>

              {pdfUrl ? (
                <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                  <DrivePDFViewer
                    fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`}
                    height={300}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Anexe manuais, especificações ou ficha técnica (até 8MB).
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======= Form ======= */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Nome */}
        <FormField label="Nome *" icon={<Tag size={15} />}>
          <input name="nome" value={form.nome} onChange={handleChange} style={inputStyle} required />
        </FormField>

        {/* Descrição */}
        <FormField label="Descrição *" icon={<BookOpen size={15} />}>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            style={{ ...inputStyle, height: 110 }}
            required
          />
        </FormField>

        {/* Grade de campos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preço */}
          <FormField label="Preço (R$)" icon={<DollarSign size={15} />}>
            <input
              name="preco"
              value={form.preco}
              onChange={handleChange}
              type="number"
              style={inputStyle}
              placeholder="Ex: 15000"
              min={0}
              step={0.01}
            />
          </FormField>

          {/* Ano */}
          <FormField label="Ano" icon={<Calendar size={15} />}>
            <input
              name="ano"
              value={form.ano}
              onChange={handleChange}
              type="number"
              style={inputStyle}
              placeholder="Ex: 2021"
              min={1900}
            />
          </FormField>

          {/* Categoria */}
          <FormField label="Categoria *" icon={<List size={15} />}>
            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              style={inputStyle}
              required
            >
              <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
              {categorias.map((cat) => (
                <option key={cat.slug ?? cat.nome} value={cat.nome}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </FormField>

          {/* Subcategoria */}
          <FormField label="Subcategoria *" icon={<Tag size={15} />}>
            <select
              name="subcategoria"
              value={form.subcategoria}
              onChange={handleChange}
              style={inputStyle}
              required
              disabled={!form.categoria}
            >
              <option value="">
                {form.categoria ? "Selecione" : "Selecione a categoria primeiro"}
              </option>
              {subcategoriasDisponiveis.map((sub: any) => (
                <option key={sub.slug ?? sub.nome} value={sub.nome}>
                  {sub.nome}
                </option>
              ))}
            </select>
          </FormField>

          {/* Condição */}
          <FormField label="Condição" icon={<Tag size={15} />}>
            <select name="condicao" value={form.condicao} onChange={handleChange} style={inputStyle}>
              <option value="">Selecione</option>
              {condicoes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>

          {/* Estado */}
          <FormField label="Estado *" icon={<MapPin size={15} />}>
            <select name="estado" value={form.estado} onChange={handleChange} style={inputStyle} required>
              <option value="">Selecione</option>
              {estados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Cidade */}
        <FormField label="Cidade *" icon={<MapPin size={15} />}>
          <select
            name="cidade"
            value={form.cidade}
            onChange={handleChange}
            style={inputStyle}
            required
            disabled={!form.estado || carregandoCidades}
          >
            <option value="">
              {carregandoCidades
                ? "Carregando..."
                : form.estado
                ? "Selecione a cidade"
                : "Selecione primeiro o estado"}
            </option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        {/* Botões */}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "linear-gradient(90deg,#fb8500,#219ebc)",
              color: "#fff",
              border: "none",
              borderRadius: 13,
              padding: "14px 26px",
              fontWeight: 900,
              fontSize: 18,
              cursor: saving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 40px rgba(251,133,0,0.25)",
            }}
          >
            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={18} />}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            style={{
              background: "#fff0f0",
              color: "#d90429",
              border: "1.5px solid #ffe5e5",
              borderRadius: 12,
              padding: "14px 26px",
              fontWeight: 800,
              fontSize: 16,
              cursor: saving ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Trash2 size={18} /> Excluir Produto
          </button>
        </div>
      </form>
    </section>
  );
}

/* ===================== UI helpers ===================== */
function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

/* ===================== Estilos ===================== */
const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#023047",
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
  letterSpacing: -0.2,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1.6px solid #e5e7eb",
  fontSize: 16,
  color: "#0f172a",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 2,
  outline: "none",
  marginTop: 2,
  minHeight: 46,
  boxShadow: "0 0 0 0 rgba(0,0,0,0)",
};

/* ===================== Botões de curadoria ===================== */
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  fontWeight: 900,
  fontSize: "0.95rem",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  boxShadow: "0 2px 14px #0001",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "#f8fafc",
  color: "#0f172a",
  border: "1.5px solid #e5e7eb",
  fontWeight: 800,
  fontSize: "0.95rem",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};
const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "#e11d48",
};

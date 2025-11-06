// app/edit-service/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import ImageUploader from "@/components/ImageUploader";
import { db, auth } from "@/firebaseConfig";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Loader2,
  ArrowLeft,
  Save,
  Tag,
  DollarSign,
  Layers,
  MapPin,
  CalendarClock,
  Upload,
  Info,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { useTaxonomia } from "@/hooks/useTaxonomia";

/* ===== PDF (client-only) ===== */
const PDFUploader = dynamic(() => import("@/components/PDFUploader"), { ssr: false });
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), { ssr: false });

/* ================== Constantes ================== */
const estados = [
  "BRASIL",
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
const UFS_SET = new Set<string>(UFS);

const disponibilidades = [
  "Manhã",
  "Tarde",
  "Noite",
  "Integral",
  "24 horas",
  "Sob consulta",
] as const;

/* ================== Helpers ================== */
function normalize(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

type SubAny = { nome: string; slug?: string; subcategorias?: SubAny[] };

type ServiceDoc = {
  titulo?: string;
  descricao?: string;

  categoria?: string;
  subcategoria?: string;
  itemFinal?: string;

  preco?: number | string;
  estado?: string;

  disponibilidade?: string;

  // Cobertura
  atendeBrasil?: boolean;
  ufsAtendidas?: string[];
  abrangencia?: string;
  abrangenciaLabel?: string;

  // mídia
  imagens?: string[];
  pdfUrl?: string | null;

  // autor (opcional)
  prestadorNome?: string;
  prestadorEmail?: string;
  prestadorWhatsapp?: string;
};

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const { categorias: taxCats, loading: taxLoading } = useTaxonomia() as {
    categorias: SubAny[];
    loading: boolean;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form espelhado ao create-service
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",

    categoria: "",
    outrosCategoriaTexto: "", // usado apenas se categoria === "Outros"

    preco: "",
    estado: "",

    disponibilidade: "",

    atendeBrasil: false,
    ufsAtendidas: [] as string[],

    prestadorNome: "",
    prestadorEmail: "",
    prestadorWhatsapp: "",
  });

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const isOutros = form.categoria === "Outros";
  const subcategoriaFixa = "Serviços";

  /* ========== carregar documento ========== */
  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, "services", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setLoading(false);
          return;
        }
        const data = (snap.data() as ServiceDoc) || {};

        // hidratar form
        setForm((prev) => ({
          ...prev,
          titulo: data.titulo || "",
          descricao: data.descricao || "",
          categoria: data.categoria === "Outros (livre)" ? "Outros" : (data.categoria || ""),
          outrosCategoriaTexto:
            (data.categoria === "Outros (livre)" ? (data.itemFinal || "") : (data.itemFinal || "")) || "",
          preco: data.preco !== undefined && data.preco !== null ? String(data.preco) : "",
          estado: data.estado || "",
          disponibilidade: data.disponibilidade || "",

          atendeBrasil: !!data.atendeBrasil,
          ufsAtendidas: Array.isArray(data.ufsAtendidas) ? data.ufsAtendidas : [],

          prestadorNome: data.prestadorNome || "",
          prestadorEmail: data.prestadorEmail || "",
          prestadorWhatsapp: data.prestadorWhatsapp || "",
        }));

        setImagens(Array.isArray(data.imagens) ? data.imagens : []);
        setPdfUrl(data.pdfUrl ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ========== handlers ========== */
  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>,
  ) {
    const { name, value } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "categoria" ? { outrosCategoriaTexto: "" } : null),
    }));
  }

  const precoPreview = useMemo(() => {
    if (!form.preco) return "Sob consulta";
    const n = Number(form.preco);
    if (Number.isNaN(n)) return "Sob consulta";
    return `R$ ${n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [form.preco]);

  function toggleUfAtendida(uf: string) {
    if (uf === "BRASIL") {
      setForm((f) => ({
        ...f,
        atendeBrasil: !f.atendeBrasil,
        ufsAtendidas: !f.atendeBrasil ? ["BRASIL"] : [],
      }));
      return;
    }
    const val = String(uf).trim().toUpperCase();
    if (!UFS_SET.has(val)) return;

    if (form.atendeBrasil) {
      setForm((f) => ({ ...f, atendeBrasil: false, ufsAtendidas: [val] }));
      return;
    }

    const has = form.ufsAtendidas.includes(val);
    setForm((f) => ({
      ...f,
      ufsAtendidas: has ? f.ufsAtendidas.filter((u) => u !== val) : [...f.ufsAtendidas, val],
    }));
  }

  function buildAbrangenciaLabel(atendeBrasil: boolean, ufs: string[]) {
    if (atendeBrasil) return "Brasil inteiro";
    const list = (ufs || []).filter((u) => u !== "BRASIL");
    if (list.length === 0) return "";
    if (list.length === 1) return list[0];
    if (list.length <= 4) return list.join(", ");
    return `${list.length} UFs`;
  }

  /* ========== salvar ========== */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const user = auth.currentUser; // opcional para auditoria
      // preço: número ou "Sob consulta"
      let preco: number | string = "Sob consulta";
      if (form.preco.trim() !== "") {
        const n = Number(form.preco);
        if (!Number.isNaN(n) && n >= 0) preco = Number(n.toFixed(2));
      }

      const finalCategoria = isOutros ? "Outros (livre)" : form.categoria;
      const categoriaPath = isOutros
        ? ["Outros", "Serviços", form.outrosCategoriaTexto.trim()].filter(Boolean)
        : [form.categoria || "", subcategoriaFixa].filter(Boolean);

      const categoriaPathLabel = categoriaPath.join(" > ");
      const abrangenciaLabel = buildAbrangenciaLabel(form.atendeBrasil, form.ufsAtendidas);

      // keywords para busca
      const searchBase = normalize(
        [
          form.titulo,
          form.descricao,
          categoriaPathLabel,
          form.estado,
          abrangenciaLabel,
          form.disponibilidade,
          form.prestadorNome,
        ]
          .filter(Boolean)
          .join(" "),
      );

      await updateDoc(doc(db, "services", id), {
        // principais
        titulo: form.titulo || "",
        descricao: form.descricao || "",

        categoria: finalCategoria || "",
        subcategoria: subcategoriaFixa,
        itemFinal: isOutros ? form.outrosCategoriaTexto.trim() : "",

        categoriaPath,
        categoriaPathLabel,

        preco,
        estado: form.estado || "",

        // cobertura
        atendeBrasil: !!form.atendeBrasil,
        ufsAtendidas: form.atendeBrasil
          ? ["BRASIL"]
          : Array.from(new Set((form.ufsAtendidas || []).map((u) => String(u).trim().toUpperCase()))),

        abrangencia: abrangenciaLabel,
        abrangenciaLabel,

        disponibilidade: form.disponibilidade || "",

        // mídia
        imagens: imagens || [],
        imagesCount: Array.isArray(imagens) ? imagens.length : 0,
        pdfUrl: pdfUrl || null,

        // autor (mantém se já havia)
        prestadorNome: form.prestadorNome || "",
        prestadorEmail: form.prestadorEmail || "",
        prestadorWhatsapp: form.prestadorWhatsapp || "",

        // busca e atualização
        searchKeywords: searchBase.split(/\s+/).slice(0, 60),
        updatedAt: serverTimestamp(),

        // (não mexe em status/expiraEm aqui)
        ...(user?.uid ? { lastEditedBy: user.uid } : null),
      });

      router.push("/services");
    } catch (err) {
      console.error(err);
      // opcional: feedback visual
      alert("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px] text-blue-700">
        <Loader2 className="animate-spin mr-2" />
        Carregando serviço...
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <main
        className="min-h-screen flex flex-col items-center py-8 px-2 sm:px-4"
        style={{ background: "linear-gradient(135deg, #f7f9fb, #ffffff 45%, #e0e7ef)" }}
      >
        <section
          style={{
            maxWidth: 960,
            width: "100%",
            background: "#fff",
            borderRadius: 22,
            boxShadow: "0 4px 32px #0001",
            padding: "34px 2vw 42px 2vw",
            marginTop: 10,
            border: "1px solid #eef2f7",
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 text-blue-700"
              title="Voltar"
            >
              <ArrowLeft size={22} />
            </button>
            <h1 style={{ fontSize: "2.0rem", fontWeight: 900, color: "#023047", letterSpacing: "-1px" }}>
              Editar Serviço
            </h1>
          </div>

          {/* Dica topo */}
          <div style={hintCardStyle}>
            <Info className="w-5 h-5" />
            <p style={{ margin: 0 }}>
              Atualize as informações do seu anúncio. Imagens e PDF são opcionais, mas ajudam na conversão.
            </p>
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* ================= Uploads (Imagens + PDF) ================= */}
            <div className="rounded-2xl border" style={{ background: "linear-gradient(180deg,#f8fbff, #ffffff)", borderColor: "#e6ebf2", padding: "18px" }}>
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-slate-700" />
                <h3 className="text-slate-800 font-black tracking-tight">Arquivos do anúncio</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Imagens */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff" }}>
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-sky-700" />
                    <strong className="text-[#0f172a]">Imagens do Serviço</strong>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="rounded-lg border border-dashed p-3">
                      <ImageUploader imagens={imagens} setImagens={setImagens} max={5} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Envie até 5 imagens (JPG/PNG). Dica: use fotos nítidas e com boa iluminação.</p>
                  </div>
                </div>

                {/* PDF */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #fff1e6 0%, transparent 60%), #ffffff" }}>
                  <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <strong className="text-[#0f172a]">Documento (PDF) — opcional</strong>
                  </div>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="rounded-lg border border-dashed p-3">
                      <PDFUploader initialUrl={pdfUrl || undefined} onUploaded={setPdfUrl} />
                    </div>

                    {pdfUrl ? (
                      <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                        <DrivePDFViewer fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`} height={300} />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Anexe um portfólio, escopo, certificado ou ficha técnica (até ~8MB).</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ================= Principais ================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label style={labelStyle}>
                  <Tag size={15} /> Título do Serviço
                </label>
                <input
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Ex: Manutenção corretiva em britador"
                  maxLength={80}
                  autoComplete="off"
                />
                <div style={smallInfoStyle}>{form.titulo.length}/80</div>
              </div>

              <div>
                <label style={labelStyle}>
                  <DollarSign size={15} /> Valor (R$)
                </label>
                <input
                  name="preco"
                  value={form.preco}
                  onChange={handleChange}
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  placeholder="Ex: 1200 (opcional)"
                  autoComplete="off"
                />
                <div style={smallInfoStyle}>Pré-visualização: {precoPreview}</div>
              </div>

              <div>
                <label style={labelStyle}>
                  <Layers size={15} /> Categoria
                </label>
                <select name="categoria" value={form.categoria} onChange={handleChange} style={inputStyle}>
                  <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
                  {taxCats.map((cat) => (
                    <option key={cat.nome} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-500 mt-1">
                  Subcategoria aplicada automaticamente: <b>Serviços</b>
                </div>
              </div>

              {isOutros && (
                <div>
                  <label style={labelStyle}>Detalhe a categoria (livre)</label>
                  <input
                    name="outrosCategoriaTexto"
                    value={form.outrosCategoriaTexto}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Descreva sua categoria"
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>
                  <MapPin size={15} /> Estado (UF) / Sua localização
                </label>
                <select name="estado" value={form.estado} onChange={handleChange} style={inputStyle}>
                  <option value="">Selecione</option>
                  {estados.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  <CalendarClock size={15} /> Disponibilidade
                </label>
                <select name="disponibilidade" value={form.disponibilidade} onChange={handleChange} style={inputStyle}>
                  <option value="">Selecione</option>
                  {disponibilidades.map((disp) => (
                    <option key={disp} value={disp}>
                      {disp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ===== Cobertura / UFs (igual Perfil) ===== */}
            <div className="card">
              <div className="card-title">Cobertura / UFs Atendidas</div>

              <label className="checkbox" style={{ marginBottom: 10 }}>
                <input type="checkbox" checked={form.atendeBrasil} onChange={() => toggleUfAtendida("BRASIL")} />
                <span>Atendo o Brasil inteiro</span>
              </label>

              {!form.atendeBrasil && (
                <>
                  <div className="label" style={{ marginTop: 8 }}>
                    Selecione UFs
                  </div>
                  <div className="grid grid-cols-8 gap-2 max-sm:grid-cols-4">
                    {UFS.map((uf) => {
                      const checked = form.ufsAtendidas.includes(uf);
                      return (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => toggleUfAtendida(uf)}
                          className="pill"
                          style={{
                            background: checked ? "#219EBC" : "#f3f6fa",
                            color: checked ? "#fff" : "#023047",
                            borderColor: checked ? "#1a7a93" : "#e6e9ef",
                          }}
                          title={checked ? "Selecionado" : "Clique para selecionar"}
                        >
                          {checked && <Check size={12} />}
                          {uf}
                        </button>
                      );
                    })}
                  </div>
                  {form.ufsAtendidas.length === 0 && (
                    <div className="hint">Dica: selecione pelo menos 1 UF ou marque “Brasil inteiro”.</div>
                  )}
                </>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label style={labelStyle}>
                <Tag size={15} /> Descrição detalhada
              </label>
              <textarea
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                style={{ ...inputStyle, height: 110 }}
                placeholder="Descreva o serviço, experiência, materiais, área de atendimento, diferenciais, etc."
                rows={4}
                maxLength={400}
              />
              <div style={smallInfoStyle}>{form.descricao.length}/400</div>
            </div>

            {/* Dados do prestador (opcional aqui) */}
            <div style={sectionCardStyle}>
              <h3 style={sectionTitleStyle}>
                <Info className="w-5 h-5 text-orange-500" /> Seus dados (editáveis)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input
                    name="prestadorNome"
                    value={form.prestadorNome}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <input
                    name="prestadorEmail"
                    value={form.prestadorEmail}
                    onChange={handleChange}
                    style={inputStyle}
                    type="email"
                    placeholder="seuemail@exemplo.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp (opcional)</label>
                  <input
                    name="prestadorWhatsapp"
                    value={form.prestadorWhatsapp}
                    onChange={handleChange}
                    style={inputStyle}
                    placeholder="(xx) xxxxx-xxxx"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>

            {/* Botão principal */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "linear-gradient(90deg,#fb8500,#219ebc)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 13,
                  padding: "14px 22px",
                  fontWeight: 900,
                  fontSize: 18,
                  boxShadow: "0 4px 18px #fb850033",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {saving ? <Loader2 className="animate-spin inline-block mr-2" /> : <Save className="inline-block mr-2" />}
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>

          {/* estilos iguais ao create/perfil */}
          <style jsx>{`
            .card {
              background: #fff;
              border-radius: 20px;
              box-shadow: 0 4px 28px #0001;
              padding: 24px 22px;
              border: 1px solid #e6ebf2;
            }
            .card-title {
              font-weight: 900;
              color: #023047;
              font-size: 1.2rem;
              margin-bottom: 14px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .label {
              font-weight: 800;
              color: #023047;
              margin-bottom: 6px;
              display: block;
            }
            .checkbox {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-weight: 800;
              color: #023047;
            }
            .pill {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              border: 1px solid #e6e9ef;
              border-radius: 999px;
              padding: 8px 12px;
              font-weight: 800;
              font-size: 0.95rem;
              transition: transform 0.02s, filter 0.15s;
            }
            .pill:active {
              transform: translateY(1px);
            }
            .hint {
              margin-top: 8px;
              font-size: 12px;
              color: #64748b;
            }
          `}</style>
        </section>
      </main>
    </Suspense>
  );
}

/* ---------- estilos compartilhados ---------- */
const labelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#023047",
  marginBottom: 4,
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 14,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1.6px solid #e5e7eb",
  fontSize: 16,
  color: "#1f2937",
  background: "#f8fafc",
  fontWeight: 600,
  marginBottom: 8,
  outline: "none",
  marginTop: 4,
  minHeight: 46,
};
const sectionCardStyle: React.CSSProperties = {
  background: "#f3f6fa",
  borderRadius: 12,
  padding: "24px 18px",
  border: "1.6px solid #e8eaf0",
  marginBottom: 6,
};
const sectionTitleStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
  marginBottom: 12,
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const hintCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#eef6ff",
  border: "1.6px solid #dbeafe",
  color: "#0c4a6e",
  padding: "12px 14px",
  borderRadius: 14,
  marginBottom: 16,
};
const smallInfoStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
};

// app/edit-produto/[id]/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Loader2,
  Save,
  Tag,
  DollarSign,
  Calendar,
  MapPin,
  BookOpen,
  Package,
  List,
  FileText,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

import { db, auth } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import ImageUploader from "@/components/ImageUploader";
import { useTaxonomia } from "@/hooks/useTaxonomia";

const PDFUploader = dynamic(() => import("@/components/PDFUploader"), {
  ssr: false,
});
const DrivePDFViewer = dynamic(() => import("@/components/DrivePDFViewer"), {
  ssr: false,
});

const condicoes = [
  "Novo com garantia",
  "Novo sem garantia",
  "Reformado com garantia",
  "Reformado",
  "No estado que se encontra",
];

const estados = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

type Produto = {
  id?: string;
  tipo?: "produto" | string;
  nome: string;
  categoria: string;
  subcategoria: string;
  preco: number | null;
  estado: string;
  cidade: string;
  ano: number | null;
  condicao: string;
  descricao: string;
  imagens: string[];
  pdfUrl?: string | null;
  hasWarranty?: boolean;
  warrantyMonths?: number | null;
  userId?: string;
  status?: string;
  visivel?: boolean;
  createdAt?: any;
  expiraEm?: Timestamp;
  updatedAt?: any;
};

/* ===================== Page Wrapper ===================== */
export default function EditProdutoPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-[#023047]">Carregando…</div>}>
      <EditProdutoPage />
    </Suspense>
  );
}

/* ===================== Page ===================== */
function EditProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const { categorias, loading: taxLoading } = useTaxonomia();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    categoria: "",
    subcategoria: "",
    preco: "",
    estado: "",
    cidade: "",
    ano: "",
    condicao: "",
    descricao: "",
    hasWarranty: false,
    warrantyMonths: "",
  });

  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  // ==== Carrega produto e valida dono ====
  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      setCarregando(true);
      setErro(null);
      try {
        const ref = doc(db, "produtos", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Produto não encontrado.");

        const data = snap.data() as Produto;

        const user = auth.currentUser;
        if (!user || (data.userId && data.userId !== user.uid)) {
          throw new Error("Você não tem permissão para editar este produto.");
        }

        setImagens(Array.isArray(data.imagens) ? data.imagens : []);
        setPdfUrl(data.pdfUrl || null);

        setForm({
          nome: data.nome || "",
          categoria: data.categoria || "",
          subcategoria: data.subcategoria || "",
          preco: data.preco != null ? String(data.preco) : "",
          estado: data.estado || "",
          cidade: data.cidade || "",
          ano: data.ano != null ? String(data.ano) : "",
          condicao: data.condicao || "",
          descricao: data.descricao || "",
          hasWarranty: !!data.hasWarranty,
          warrantyMonths:
            data.hasWarranty && data.warrantyMonths != null
              ? String(data.warrantyMonths)
              : "",
        });
      } catch (e: any) {
        if (active) setErro(e.message || "Erro ao carregar produto.");
      } finally {
        if (active) setCarregando(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  // ==== Cidades por UF (IBGE) ====
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
        if (form.cidade && !nomes.includes(form.cidade)) {
          nomes.unshift(form.cidade);
        }
        setCidades(nomes);
      } catch {
        if (!abort)
          setCidades((prev) =>
            prev.length ? prev : form.cidade ? [form.cidade] : [],
          );
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }
    fetchCidades(form.estado);
    return () => {
      abort = true;
    };
  }, [form.estado]);

  // ==== Handlers ====
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value, type, checked } = e.target as any;

    if (name === "hasWarranty") {
      setForm((f) => ({
        ...f,
        hasWarranty: checked,
        warrantyMonths: checked ? f.warrantyMonths : "",
      }));
      return;
    }

    if (name === "condicao") {
      const v = value as string;
      const autoHas = v.includes("com garantia")
        ? true
        : v.includes("sem garantia")
          ? false
          : form.hasWarranty;
      setForm((f) => ({ ...f, condicao: v, hasWarranty: autoHas }));
      return;
    }

    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "categoria" ? { subcategoria: "" } : null),
      ...(name === "estado" ? { cidade: "" } : null),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setSalvando(true);

    try {
      if (
        !form.nome ||
        !form.estado ||
        !form.cidade ||
        !form.descricao ||
        !form.categoria ||
        !form.subcategoria ||
        !form.ano ||
        !form.condicao
      ) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }
      if (imagens.length === 0) {
        throw new Error("Envie pelo menos uma imagem.");
      }
      if (form.hasWarranty) {
        const wm = Number(form.warrantyMonths);
        if (!wm || wm <= 0)
          throw new Error("Informe um prazo de garantia válido (em meses).");
      }

      const ref = doc(db, "produtos", id);
      await updateDoc(ref, {
        tipo: "produto",
        nome: form.nome,
        categoria: form.categoria,
        subcategoria: form.subcategoria,
        preco: form.preco ? parseFloat(form.preco) : null,
        estado: form.estado,
        cidade: form.cidade,
        ano: form.ano ? Number(form.ano) : null,
        condicao: form.condicao,
        descricao: form.descricao,
        imagens,
        pdfUrl: pdfUrl || null,
        hasWarranty: !!form.hasWarranty,
        warrantyMonths: form.hasWarranty ? Number(form.warrantyMonths) : null,
        updatedAt: serverTimestamp(),
      });

      setOk("Alterações salvas com sucesso!");
      setTimeout(() => router.push("/meus-produtos"), 900);
    } catch (e: any) {
      setErro(e.message || "Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  }

  const subcategoriasDisponiveis = useMemo(
    () =>
      categorias.find((c) => c.nome === form.categoria)?.subcategorias || [],
    [form.categoria, categorias],
  );

  if (carregando || taxLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin mb-3" size={38} />
        <div className="text-lg font-bold text-[#219EBC]">
          Carregando produto…
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f9fb] via-white to-[#e0e7ef] flex flex-col items-center py-8 px-2 sm:px-4">
      {/* ... resto igual, mas os <select> de Categoria/Subcategoria agora usam categorias do hook */}
    </main>
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  startAt,
  endAt,
  where,
} from "firebase/firestore";
import {
  Loader as LoaderIcon,
  ArrowLeft,
  Save,
  Tag,
  Users,
  Filter,
  DollarSign,
  Search,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  Undo2,
  Trash2,
  Star,
} from "lucide-react";

/* ===== Tipos ===== */
type Usuario = {
  id: string;
  nome?: string;
  email?: string;
  whatsapp?: string;
  telefone?: string;
  estado?: string;
  ufs?: string[];
  cidade?: string;
  categorias?: string[];
  photoURL?: string;
};

type Vendedor = {
  email: string;
  userId: string;
  status: "ofertado" | "pendente" | "pago";
  dataPagamento?: any; // timestamp/string
};

type LeadDoc = {
  titulo?: string; // opcionalmente exibir no topo (não obrigatório)
  nome?: string;
  email?: string;
  telefone?: string;
  valor?: number;
  tipo?: "produto" | "máquina" | "serviço" | "demanda" | "";
  status?: "pendente" | "pago" | "vendido" | "cancelado" | "contatado" | "";
  premium?: boolean;
  origem?: string;
  observacao?: string;
  comprador?: string;
  adminObs?: string;
  vendedoresLiberados?: Vendedor[];
  vendedoresUserIds?: string[];
  createdAt?: any;
  userId?: string;
};

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const leadId =
    typeof params?.id === "string" ? params.id : (params?.id as string[])[0];

  /* ===== estado base ===== */
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  /* ===== form do lead ===== */
  const [form, setForm] = useState<any>({
    nome: "",
    email: "",
    telefone: "",
    valor: "",
    tipo: "",
    status: "",
    premium: false,
    origem: "",
    observacao: "",
    comprador: "",
    adminObs: "",
  });

  const [createdAt, setCreatedAt] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  /* ===== vendedores adicionados ao lead ===== */
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  /* ===== catálogo de usuários (para adicionar vendedores) ===== */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [paging, setPaging] = useState<{ last?: any; ended?: boolean }>({
    ended: false,
  });

  /* ===== filtros/busca ===== */
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("");
  const [fUF, setFUF] = useState("");
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const debounceRef = useRef<any>(null);

  /* ===== preço por lead (R$), salvo em "valor" (number) ===== */
  const [valorReais, setValorReais] = useState<string>("");

  /* ===== carregar lead ===== */
  useEffect(() => {
    async function fetchLead() {
      if (!leadId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "leads", leadId));
        if (!snap.exists()) {
          alert("Lead não encontrado.");
          router.push("/admin/leads");
          return;
        }
        const data = snap.data() as LeadDoc;

        setForm({
          nome: data.nome || "",
          email: data.email || "",
          telefone: data.telefone || "",
          valor: data.valor ?? "",
          tipo: data.tipo || "",
          status: data.status || "",
          premium: !!data.premium,
          origem: data.origem || "",
          observacao: data.observacao || "",
          comprador: data.comprador || "",
          adminObs: data.adminObs || "",
        });
        setVendedores(data.vendedoresLiberados || []);
        setValorReais(centavosParaReais((data.valor ?? 0) * 100)); // exibição como reais

        setUserId(data.userId || "");
        setCreatedAt(
          data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000).toLocaleString("pt-BR")
            : "",
        );

        // filtros iniciais por conveniência (não obrigatório)
        setFCat(data.tipo || "");
        setFUF(""); // livre por padrão
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [leadId, router]);

  /* ===== catálogo base (ordenado por nome, paginação leve) ===== */
  useEffect(() => {
    loadUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsuarios(reset = false) {
    setLoadingUsuarios(true);
    try {
      const base = query(
        collection(db, "usuarios"),
        orderBy("nome"),
        limit(40),
      );
      let qBuild: any = base;
      if (!reset && paging.last) qBuild = query(base, startAfter(paging.last));
      const snap = await getDocs(qBuild);
      const list: Usuario[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setUsuarios((prev) => (reset ? list : [...prev, ...list]));
      setPaging({
        last: snap.docs[snap.docs.length - 1],
        ended: snap.size < 40,
      });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  /* ===== busca por nome/email/ID (com debounce) ===== */
  async function executarBuscaNow(term: string) {
    setLoadingUsuarios(true);
    try {
      const t = term.trim();
      if (!t) {
        await loadUsuarios(true);
        return;
      }
      const resultados = new Map<string, Usuario>();

      // 1) por ID (doc)
      if (t.length >= 8) {
        try {
          const byId = await getDoc(doc(db, "usuarios", t));
          if (byId.exists())
            resultados.set(byId.id, { id: byId.id, ...(byId.data() as any) });
        } catch {}
      }

      // 2) e-mail exato
      if (t.includes("@")) {
        const qEmailExato = query(
          collection(db, "usuarios"),
          where("email", "==", t.toLowerCase()),
        );
        const s1 = await getDocs(qEmailExato);
        s1.forEach((d) =>
          resultados.set(d.id, { id: d.id, ...(d.data() as any) }),
        );
      }

      // 3) prefixo por nome
      const tCap = t.charAt(0).toUpperCase() + t.slice(1);
      const qNome = query(
        collection(db, "usuarios"),
        orderBy("nome"),
        startAt(tCap),
        endAt(tCap + "\uf8ff"),
        limit(50),
      );
      const s2 = await getDocs(qNome);
      s2.forEach((d) =>
        resultados.set(d.id, { id: d.id, ...(d.data() as any) }),
      );

      // 4) prefixo por email (se houver índice)
      const tLower = t.toLowerCase();
      try {
        const qEmail = query(
          collection(db, "usuarios"),
          orderBy("email"),
          startAt(tLower),
          endAt(tLower + "\uf8ff"),
          limit(50),
        );
        const s3 = await getDocs(qEmail);
        s3.forEach((d) =>
          resultados.set(d.id, { id: d.id, ...(d.data() as any) }),
        );
      } catch {}

      setUsuarios(Array.from(resultados.values()));
      setPaging({ ended: true });
    } finally {
      setLoadingUsuarios(false);
    }
  }

  function executarBusca() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => executarBuscaNow(busca), 400);
  }

  useEffect(() => {
    executarBusca();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  /* ===== filtragem local (categoria/UF) ===== */
  const candidatos = useMemo(() => {
    return usuarios.filter((u) => {
      const hitCat =
        !fCat || u.categorias?.includes(fCat) || fCat === form.tipo;
      const hitUF = !fUF || u.ufs?.includes(fUF) || u.estado === fUF;
      return hitCat && hitUF;
    });
  }, [usuarios, fCat, fUF, form.tipo]);

  /* ===== helpers ===== */
  function reaisParaCentavos(val: string): number {
    const n = Number(val.replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }
  function centavosParaReais(c: number | undefined): string {
    const v = (c ?? 0) / 100;
    return v.toFixed(2).replace(".", ",");
  }

  /* ===== handlers form ===== */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value, type, checked } = e.target as any;
    setForm({ ...form, [name]: type === "checkbox" ? !!checked : value });
  }

  /* ===== vendedores: add/remover/alterar status ===== */
  function addVendedoresSelecionados() {
    if (selUsuarios.length === 0) {
      alert(
        "Selecione pelo menos um usuário na lista para adicionar como vendedor.",
      );
      return;
    }
    const novos: Vendedor[] = [];
    selUsuarios.forEach((uid) => {
      // evitar duplicado por userId
      if (!vendedores.some((v) => v.userId === uid)) {
        const u = usuarios.find((x) => x.id === uid);
        novos.push({
          email: (u?.email || "sem-email").toLowerCase(),
          userId: uid,
          status: "ofertado",
        });
      }
    });
    if (!novos.length) {
      alert("Todos os selecionados já estão na lista de vendedores.");
      return;
    }
    setVendedores((prev) => [...prev, ...novos]);
    setSelUsuarios([]);
  }

  function removeVendedor(userId: string) {
    setVendedores((prev) => prev.filter((v) => v.userId !== userId));
  }

  function setStatusVendedor(userId: string, status: Vendedor["status"]) {
    setVendedores((prev) =>
      prev.map((v) => {
        if (v.userId !== userId) return v;
        return {
          ...v,
          status,
          dataPagamento:
            status === "pago" ? new Date().toISOString() : undefined,
        };
      }),
    );
  }

  /* ===== seleção de usuários ===== */
  function toggleUsuario(id: string, checked: boolean) {
    setSelUsuarios((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  }
  function selecionarTodosVisiveis() {
    setSelUsuarios((prev) =>
      Array.from(new Set([...prev, ...candidatos.map((c) => c.id)])),
    );
  }
  function limparSelecao() {
    setSelUsuarios([]);
  }

  /* ===== salvar ===== */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const valorNumber = reaisParaCentavos(valorReais) / 100; // armazenar como número em reais
      const payload: LeadDoc = {
        nome: form.nome?.trim(),
        email: form.email?.trim().toLowerCase(),
        telefone: form.telefone?.trim(),
        valor: valorNumber,
        tipo: form.tipo || "",
        status: form.status || "",
        premium: !!form.premium,
        origem: form.origem?.trim(),
        observacao: form.observacao?.trim(),
        comprador: form.comprador?.trim(),
        adminObs: form.adminObs?.trim(),
        vendedoresLiberados: vendedores,
        vendedoresUserIds: vendedores.map((v) => v.userId),
        // audit
        createdAt: undefined,
        userId: userId || undefined,
      };

      await updateDoc(doc(db, "leads", leadId), {
        ...payload,
        updatedAt: serverTimestamp(),
      });

      alert("Lead atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar lead.");
    }
    setSalvando(false);
  }

  /* ===== render ===== */
  if (loading) {
    return (
      <div style={centerBox}>
        <LoaderIcon className="animate-spin" size={28} />
        &nbsp; Carregando lead...
      </div>
    );
  }

  return (
    <section
      style={{ maxWidth: 1240, margin: "0 auto", padding: "42px 2vw 60px 2vw" }}
    >
      <Link href="/admin/leads" style={backLink}>
        <ArrowLeft size={19} /> Voltar
      </Link>

      <div style={gridWrap}>
        {/* ===== Card: Editar Lead ===== */}
        <div style={card}>
          <h2 style={cardTitle}>Editar Lead</h2>

          <div style={metaLine}>
            <div>
              <b>ID:</b> {leadId}
            </div>
            {createdAt && (
              <div>
                <b>Criado:</b> {createdAt}
              </div>
            )}
            {userId && (
              <div>
                <b>UserID:</b> {userId}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Nome</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  placeholder="Ex.: João da Silva"
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>E-mail</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                  style={input}
                />
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Telefone</label>
                <input
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <DollarSign size={16} /> Valor do lead (R$)
                  </span>
                </label>
                <input
                  value={valorReais}
                  onChange={(e) => setValorReais(e.target.value)}
                  placeholder="Ex.: 49,90"
                  style={input}
                />
                <div style={hintText}>
                  Salvo como número em reais (ex.: 49.9).
                </div>
              </div>
            </div>

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Tipo</label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="">Selecione</option>
                  <option value="produto">Produto</option>
                  <option value="máquina">Máquina</option>
                  <option value="serviço">Serviço</option>
                  <option value="demanda">Demanda</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={input}
                >
                  <option value="">Selecione</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="vendido">Vendido</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="contatado">Contatado</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                <input
                  type="checkbox"
                  name="premium"
                  checked={!!form.premium}
                  onChange={handleChange}
                />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Star size={16} color="#f59e0b" /> Premium
                </span>
              </label>
            </div>

            <label style={label}>Origem / Interesse</label>
            <input
              name="origem"
              value={form.origem}
              onChange={handleChange}
              placeholder="Ex.: Instagram, Formulário..."
              style={input}
            />

            <div style={twoCols}>
              <div style={{ flex: 1 }}>
                <label style={label}>Comprador (nome/email)</label>
                <input
                  name="comprador"
                  value={form.comprador}
                  onChange={handleChange}
                  placeholder="Ex.: Maria (maria@email.com)"
                  style={input}
                />
              </div>
            </div>

            <label style={label}>Observação</label>
            <textarea
              name="observacao"
              value={form.observacao}
              onChange={handleChange}
              placeholder="Notas gerais do lead..."
              style={{ ...input, minHeight: 90, resize: "vertical" }}
            />

            <label style={label}>Observação (Admin)</label>
            <textarea
              name="adminObs"
              value={form.adminObs}
              onChange={handleChange}
              placeholder="Somente visível ao admin..."
              style={{ ...input, minHeight: 90, resize: "vertical" }}
            />

            <div style={{ ...twoCols, marginTop: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" disabled={salvando} style={primaryBtn}>
                  <Save size={20} />{" "}
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ===== Card: Buscar usuários e adicionar como vendedores ===== */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Users size={20} color="#2563eb" /> Adicionar vendedores a este
              lead
            </span>
          </h2>

          {/* filtros e busca */}
          <div style={{ ...twoCols, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={label}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Search size={16} /> Buscar por nome, e-mail ou ID
                </span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" ? executarBuscaNow(busca) : undefined
                  }
                  placeholder="Digite e tecle Enter ou clique em Buscar"
                  style={{ ...input, paddingLeft: 36 }}
                />
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 12,
                    color: "#a3a3a3",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> Categoria
                </label>
                <select
                  value={fCat}
                  onChange={(e) => setFCat(e.target.value)}
                  style={{ ...input, width: 160 }}
                >
                  <option value="">Todas</option>
                  {form.tipo && <option value={form.tipo}>{form.tipo}</option>}
                </select>
              </div>
              <div>
                <label style={miniLabel}>
                  <Filter size={13} /> UF
                </label>
                <select
                  value={fUF}
                  onChange={(e) => setFUF(e.target.value)}
                  style={{ ...input, width: 120 }}
                >
                  <option value="">Todas</option>
                  {[
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
                  ].map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => loadUsuarios(true)}
                style={ghostBtn}
              >
                <RefreshCw size={16} /> Atualizar
              </button>
              <button
                type="button"
                onClick={() => executarBuscaNow(busca)}
                style={ghostBtn}
              >
                <Search size={16} /> Buscar
              </button>
            </div>
          </div>

          {/* lista de candidatos */}
          <div
            style={{
              border: "1.5px solid #eaeef4",
              borderRadius: 14,
              overflow: "hidden",
              marginTop: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                background: "#f8fafc",
                borderBottom: "1px solid #eef2f7",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#334155",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                <Users size={16} /> Usuários
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Selecionados: <b>{selUsuarios.length}</b>
              </div>
            </div>

            <div style={{ maxHeight: "56vh", overflow: "auto" }}>
              {candidatos.map((u) => {
                const nome = u.nome || u.email || `Usuário ${u.id}`;
                const contato = u.whatsapp || u.telefone || "—";
                const regioes = u.ufs?.length
                  ? u.ufs.join(", ")
                  : u.estado || "—";
                const cats = u.categorias?.length
                  ? u.categorias.join(", ")
                  : "—";
                const already = vendedores.some((v) => v.userId === u.id);
                const selected = selUsuarios.includes(u.id);

                // status do vendedor se já adicionado
                const vend = vendedores.find((v) => v.userId === u.id);
                const pay =
                  vend?.status === "pago"
                    ? "paid"
                    : vend?.status === "pendente"
                      ? "pending"
                      : "none";

                return (
                  <label
                    key={u.id}
                    style={rowItem(
                      already ? "#f1fff6" : selected ? "#f1f5ff" : "#fff",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected || already}
                      disabled={already}
                      onChange={(e) => toggleUsuario(u.id, e.target.checked)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {nome}
                        </span>
                        {already && (
                          <span style={selPill}>
                            <CheckCircle2 size={12} /> adicionado
                          </span>
                        )}
                        {already && vend?.status && (
                          <span
                            style={
                              vend.status === "pago"
                                ? pillPayGreen
                                : pillPayYellow
                            }
                          >
                            <CreditCard size={12} /> {vend.status}
                          </span>
                        )}
                      </div>
                      <div style={subLine}>
                        {u.email || "—"} • {contato} • {u.cidade || "—"}/
                        {regioes}
                      </div>
                      <div style={subMicro}>Categorias: {cats}</div>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      #{u.id}
                    </span>
                  </label>
                );
              })}

              {!loadingUsuarios && candidatos.length === 0 && (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  Nenhum usuário encontrado. Ajuste a busca ou os filtros.
                </div>
              )}

              {loadingUsuarios && (
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  <LoaderIcon className="animate-spin" size={16} />{" "}
                  Carregando...
                </div>
              )}
            </div>

            {!paging.ended && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 10,
                  background: "#f8fafc",
                  borderTop: "1px solid #eef2f7",
                }}
              >
                <button
                  type="button"
                  onClick={() => loadUsuarios(false)}
                  style={ghostBtn}
                >
                  Carregar mais
                </button>
              </div>
            )}
          </div>

          {/* ações sobre a lista */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={selecionarTodosVisiveis}
              style={ghostBtn}
            >
              Selecionar visíveis
            </button>
            <button type="button" onClick={limparSelecao} style={ghostBtn}>
              Limpar seleção
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={addVendedoresSelecionados}
              disabled={selUsuarios.length === 0}
              style={primaryBtn}
            >
              <Users size={18} /> Adicionar{" "}
              {selUsuarios.length > 0 ? `(${selUsuarios.length})` : ""}
            </button>
          </div>
        </div>

        {/* ===== Card: Vendedores do lead (controle admin) ===== */}
        <div style={card}>
          <h2 style={cardTitle}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Users size={20} color="#2563eb" /> Vendedores deste lead
            </span>
          </h2>

          {vendedores.length === 0 ? (
            <div style={emptyBox}>Nenhum vendedor adicionado ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {vendedores.map((v) => (
                <VendedorRow
                  key={v.userId}
                  v={v}
                  onPago={() => setStatusVendedor(v.userId, "pago")}
                  onPendente={() => setStatusVendedor(v.userId, "pendente")}
                  onOfertado={() => setStatusVendedor(v.userId, "ofertado")}
                  onRemover={() => removeVendedor(v.userId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ===== Row Vendedor (com fetch leve do usuário) ===== */
function VendedorRow({
  v,
  onPago,
  onPendente,
  onOfertado,
  onRemover,
}: {
  v: Vendedor;
  onPago: () => void;
  onPendente: () => void;
  onOfertado: () => void;
  onRemover: () => void;
}) {
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getDoc(doc(db, "usuarios", v.userId));
        if (s.exists()) setUser({ id: s.id, ...(s.data() as any) });
      } catch {}
    })();
  }, [v.userId]);

  const nome = user?.nome || user?.email || `Usuário ${v.userId}`;
  const contato = user?.whatsapp || user?.telefone || "—";
  const cidadeUf = `${user?.cidade || "—"}/${user?.estado || "—"}`;
  const pago = v.status === "pago";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 800,
          }}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={nome}
              style={{ width: 28, height: 28, borderRadius: "50%" }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {(nome || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nome}
          </span>
        </div>
        <div style={subLine}>
          {user?.email || v.email || "—"} • {contato} • {cidadeUf}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={
            v.status === "pago"
              ? pillPayGreen
              : v.status === "pendente"
                ? pillPayYellow
                : selPill
          }
        >
          <CreditCard size={12} /> {v.status}
        </span>
        {pago && v.dataPagamento && (
          <span style={pillPrice}>
            Pago em {new Date(v.dataPagamento).toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {v.status !== "pago" && (
          <button onClick={onPago} style={miniBtnGreen}>
            <CreditCard size={14} /> Marcar pago
          </button>
        )}
        {v.status !== "pendente" && (
          <button onClick={onPendente} style={miniBtnYellow}>
            <Undo2 size={14} /> Pendente
          </button>
        )}
        {v.status !== "ofertado" && (
          <button onClick={onOfertado} style={miniBtnBlue}>
            <Tag size={14} /> Ofertado
          </button>
        )}
        <button onClick={onRemover} style={miniBtnDanger}>
          <Trash2 size={14} /> Remover
        </button>
      </div>
    </div>
  );
}

/* ===== estilos (mesmos do demandas/edit) ===== */
const backLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 18,
  color: "#2563eb",
  fontWeight: 800,
  fontSize: 16,
  textDecoration: "none",
};
const gridWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 18,
};
const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 2px 16px #0001",
  padding: "26px 22px",
};
const cardTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.55rem",
  color: "#023047",
  marginBottom: 10,
};
const metaLine: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 12,
  color: "#94a3b8",
  fontSize: 13,
};
const twoCols: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
};
const label: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 15,
  color: "#2563eb",
  marginBottom: 7,
  marginTop: 14,
  display: "block",
};
const miniLabel: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 12,
  color: "#64748b",
  marginBottom: 6,
  display: "block",
};
const input: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "12px 13px",
  borderRadius: 10,
  border: "1.5px solid #e5e7eb",
  fontSize: 16,
  color: "#023047",
  background: "#f8fafc",
  fontWeight: 600,
  outline: "none",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  fontWeight: 900,
  fontSize: "1rem",
  padding: "12px 16px",
  borderRadius: 12,
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

const rowItem = (bg: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: bg,
});
const selPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#3730a3",
  border: "1px solid #e0e7ff",
  fontSize: 11,
  fontWeight: 800,
};
const pillPayGreen: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #a7f3d0",
  fontSize: 11,
  fontWeight: 800,
};
const pillPayYellow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  fontSize: 11,
  fontWeight: 800,
};
const pillPrice: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  fontSize: 11,
  fontWeight: 800,
};
const miniBtnGreen: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#16a34a",
  color: "#fff",
  border: "1px solid #16a34a",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #16a34a22",
};
const miniBtnYellow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#f59e0b",
  color: "#fff",
  border: "1px solid #f59e0b",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #f59e0b22",
};
const miniBtnBlue: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#2563eb",
  color: "#fff",
  border: "1px solid #2563eb",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #2563eb22",
};
const miniBtnDanger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#e11d48",
  color: "#fff",
  border: "1px solid #e11d48",
  fontWeight: 800,
  fontSize: 12,
  padding: "8px 10px",
  borderRadius: 9,
  cursor: "pointer",
  boxShadow: "0 2px 10px #e11d4822",
};

const subLine: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const subMicro: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const hintText: React.CSSProperties = {
  fontSize: 11,
  color: "#94a3b8",
  marginTop: 6,
};
const centerBox: React.CSSProperties = {
  minHeight: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#2563eb",
};
const emptyBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #e2e8f0",
  borderRadius: 12,
  padding: 16,
  color: "#475569",
};

/* ===== responsividade: mesma quebra do demandas/edit ===== */
if (typeof window !== "undefined") {
  const styleId = "pedraum-edit-lead-responsive";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.innerHTML = `
    @media (min-width: 1100px) {
      section > div[style*="grid-template-columns: 1fr"] {
        grid-template-columns: 1fr 1fr !important;
      }
      div[style*="grid-template-columns: 1.2fr 1fr auto"] {
        grid-template-columns: 1.2fr 1fr auto !important;
      }
    }
    @media (max-width: 640px) {
      div[style*="grid-template-columns: 1.2fr 1fr auto"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
}

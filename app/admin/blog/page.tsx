"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const snap = await getDocs(collection(db, "blog"));
      setPosts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }
    fetchPosts();
  }, []);

  async function handleDelete(id: string) {
    if (window.confirm("Tem certeza que deseja excluir este post?")) {
      await deleteDoc(doc(db, "blog", id));
      setPosts((posts) => posts.filter((p) => p.id !== id));
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "40px 0 0 0",
      }}
    >
      <div
        style={{
          maxWidth: 1220,
          margin: "0 auto",
          background: "white",
          borderRadius: 22,
          boxShadow: "0 2px 32px #0001",
          padding: "38px 24px 30px 24px",
          minHeight: 480,
          marginBottom: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              fontWeight: 900,
              fontSize: "2rem",
              color: "#023047",
              letterSpacing: "-1px",
            }}
          >
            📝 Blog - Posts Publicados
          </h1>
          <Link href="/admin/blog/create" legacyBehavior>
            <a
              style={{
                background: "#FB8500",
                color: "#fff",
                fontWeight: 700,
                borderRadius: 15,
                padding: "11px 26px",
                fontSize: "1rem",
                boxShadow: "0 2px 16px #0001",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={21} /> Novo Post
            </a>
          </Link>
        </div>
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "white",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  color: "#2563eb",
                  fontWeight: 700,
                  borderBottom: "1.5px solid #e5e7eb",
                }}
              >
                <th style={thStyle}>Título</th>
                <th style={thStyle}>Resumo</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Ações</th>
                <th style={thStyle}>ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 48,
                      textAlign: "center",
                      color: "#219EBC",
                      fontWeight: 700,
                    }}
                  >
                    Carregando posts...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 48,
                      textAlign: "center",
                      color: "#aaa",
                      fontWeight: 600,
                    }}
                  >
                    Nenhum post encontrado.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr
                    key={post.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={tdStyle}>{post.titulo}</td>
                    <td style={tdStyle}>{post.resumo}</td>
                    <td style={tdStyle}>{post.data || "-"}</td>
                    <td style={tdStyle}>
                      <Link href={`/admin/blog/${post.id}/edit`} legacyBehavior>
                        <a style={actionBtn}>
                          <Pencil
                            size={16}
                            style={{ marginBottom: -3, marginRight: 4 }}
                          />
                          Editar
                        </a>
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id)}
                        style={actionBtnDelete}
                      >
                        <Trash2
                          size={16}
                          style={{ marginBottom: -3, marginRight: 4 }}
                        />
                        Excluir
                      </button>
                    </td>
                    <td
                      style={{ ...tdStyle, color: "#888", fontSize: "0.91rem" }}
                    >
                      {post.id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        @media (max-width: 950px) {
          h1 { font-size: 1.3rem !important; }
          .admin-table th, .admin-table td { font-size: 0.95rem !important; }
          main > div { padding: 16px 3vw !important; }
        }
        @media (max-width: 600px) {
          main > div { padding: 0 !important; }
          table { font-size: 0.95rem; }
          thead { display: none; }
          tbody tr { display: block; margin-bottom: 18px; border-radius: 14px; box-shadow: 0 2px 16px #0001; background: white; }
          tbody td { display: block; padding: 12px 18px; border: none !important; }
          tbody td:last-child { padding-bottom: 18px; }
        }
      `}</style>
    </main>
  );
}

const thStyle = {
  padding: "15px 8px",
  textAlign: "left" as const,
  color: "#023047",
  fontWeight: 700 as const,
  background: "#f9fafb",
  fontSize: "1rem",
};
const tdStyle = {
  padding: "13px 8px",
  color: "#222",
  fontWeight: 500 as const,
  fontSize: "1.04rem",
};
const actionBtn = {
  background: "#e8f0fe",
  color: "#2563eb",
  border: "none",
  borderRadius: "7px",
  padding: "6px 15px",
  marginRight: 10,
  fontWeight: 700,
  fontSize: "1rem",
  cursor: "pointer",
  textDecoration: "none" as const,
  transition: "background .15s",
};
const actionBtnDelete = {
  ...actionBtn,
  background: "#feecec",
  color: "#e53935",
};

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface BlogPost {
  id: string;
  titulo: string;
  resumo?: string;
  imagem?: string;
  createdAt?: any;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const q = query(collection(db, "blog"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPosts(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BlogPost),
      );
      setLoading(false);
    }
    fetchPosts();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 px-2 sm:px-4 min-h-[70vh]">
      <div className="flex items-center gap-2 mb-7">
        <Newspaper size={32} className="text-orange-500" />
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-900">
          Blog
        </h1>
      </div>
      {loading ? (
        <div className="text-blue-800 py-20 text-center animate-pulse">
          Carregando posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-gray-400 text-lg text-center py-16">
          Nenhum post ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col hover:shadow-2xl transition-all min-h-[210px]"
            >
              {post.imagem && (
                <img
                  src={post.imagem}
                  alt={post.titulo}
                  className="rounded-t-2xl w-full object-cover max-h-48"
                  style={{ minHeight: 100 }}
                />
              )}
              <div className="p-6 flex flex-col flex-1">
                <Link href={`/blog/${post.id}`}>
                  <h2 className="font-bold text-xl text-blue-900 mb-2 hover:text-orange-600 transition">
                    {post.titulo}
                  </h2>
                </Link>
                {post.resumo && (
                  <p className="text-gray-600 text-base mb-4 line-clamp-3">
                    {post.resumo}
                  </p>
                )}
                <div className="flex-1" />
                <Link
                  href={`/blog/${post.id}`}
                  className="mt-2 inline-flex items-center gap-2 text-orange-600 font-semibold text-sm hover:underline"
                  style={{ alignSelf: "flex-end" }}
                >
                  Ler mais
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

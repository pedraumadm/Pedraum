// =============================
// components/BlogPostCard.tsx
// =============================

"use client";

import Link from "next/link";

interface BlogPostCardProps {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  imagem: string;
}

export default function BlogPostCard({
  id,
  slug,
  titulo,
  resumo,
  imagem,
}: BlogPostCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="bg-white border border-gray-200 rounded-2xl shadow hover:shadow-md transition-all overflow-hidden"
    >
      <img src={imagem} alt={titulo} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="text-lg font-bold text-[#023047] mb-1">{titulo}</h3>
        <p className="text-sm text-gray-700 line-clamp-3 min-h-[60px]">
          {resumo}
        </p>
      </div>
    </Link>
  );
}

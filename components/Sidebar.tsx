// =============================
// components/Sidebar.tsx
// =============================

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import {
  LayoutDashboard,
  PlusSquare,
  List,
  User,
  MessageCircle,
  Star,
  Bell,
  ShoppingCart,
  Handshake,
  BookOpen,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie =
      "userLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/auth/login");
  };

  return (
    <aside className="w-64 bg-[#023047] text-white p-6 space-y-6">
      <h2 className="text-2xl font-bold">Painel</h2>
      <nav className="space-y-4">
        <Link
          href="/painel"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <LayoutDashboard className="w-5 h-5" /> Visão Geral
        </Link>
        <Link
          href="/create-machine"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <PlusSquare className="w-5 h-5" /> Cadastrar Máquina
        </Link>
        <Link
          href="/machines"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <List className="w-5 h-5" /> Ver Máquinas
        </Link>
        <Link
          href="/meus-anuncios"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <List className="w-5 h-5" /> Meus Anúncios
        </Link>
        <Link
          href="/perfil"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <User className="w-5 h-5" /> Meu Perfil
        </Link>
        <Link
          href="/mensagens"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <MessageCircle className="w-5 h-5" /> Mensagens
        </Link>
        <Link
          href="/favoritos"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <Star className="w-5 h-5" /> Favoritos
        </Link>
        <Link
          href="/avaliacoes"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <Star className="w-5 h-5" /> Avaliações
        </Link>
        <Link
          href="/notificacoes"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <Bell className="w-5 h-5" /> Notificações
        </Link>
        <Link
          href="/checkout"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <ShoppingCart className="w-5 h-5" /> Checkout
        </Link>
        <Link
          href="/parceiros"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <Handshake className="w-5 h-5" /> Parceiros
        </Link>
        <Link
          href="/blog"
          className="flex items-center gap-2 hover:text-[#FFB703]"
        >
          <BookOpen className="w-5 h-5" /> Blog
        </Link>
      </nav>
      <button
        onClick={handleLogout}
        className="mt-10 flex items-center gap-2 text-sm bg-[#FB8500] hover:bg-[#FFB703] transition-colors px-4 py-2 rounded-xl"
      >
        <LogOut className="w-4 h-4" /> Sair
      </button>
    </aside>
  );
}

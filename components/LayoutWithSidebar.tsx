"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { LogOut, LayoutDashboard, User, PlusSquare, List } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function LayoutWithSidebar({ children }: LayoutProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie =
      "userLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/auth/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-[#023047] text-white p-6 space-y-6">
        <h2 className="text-2xl font-bold">Painel</h2>
        <nav className="space-y-4">
          <a
            href="/painel"
            className="flex items-center gap-2 hover:text-[#FFB703]"
          >
            <LayoutDashboard className="w-5 h-5" /> Visão Geral
          </a>
          <a
            href="/create-machine"
            className="flex items-center gap-2 hover:text-[#FFB703]"
          >
            <PlusSquare className="w-5 h-5" /> Cadastrar Máquina
          </a>
          <a
            href="/machines"
            className="flex items-center gap-2 hover:text-[#FFB703]"
          >
            <List className="w-5 h-5" /> Ver Máquinas
          </a>
          <a
            href="/perfil"
            className="flex items-center gap-2 hover:text-[#FFB703]"
          >
            <User className="w-5 h-5" /> Meu Perfil
          </a>
        </nav>
        <button
          onClick={handleLogout}
          className="mt-10 flex items-center gap-2 text-sm bg-[#FB8500] hover:bg-[#FFB703] transition-colors px-4 py-2 rounded-xl"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </aside>

      <main className="flex-1 bg-[#F6F9FA] p-10">{children}</main>
    </div>
  );
}

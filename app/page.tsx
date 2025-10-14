"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

import HeroRevamp from "@/components/HeroRevamp"; // novo hero com banners
import FeaturesSection from "@/components/FeaturesSection";
import MachinesShowcase from "@/components/MachinesShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import DemandasShowcase from "@/components/DemandasShowcase";
import SectionTransition from "@/components/SectionTransition";
import NewsletterSection from "@/components/NewsletterSection";
import BlogShowcase from "@/components/BlogShowcase";

import HeroClassic from "@/components/HeroClassic";
import HowItWorks from "@/components/HowItWorks";
import CTAWide from "@/components/CTAWide";
import StatsBar from "@/components/StatsBar";
import SuppliersServices from "@/components/SuppliersServices";
import Hero from "@/components/Hero";

// Tipos...
interface Machine {
  id: string;
  nome: string;
  preco: string;
  imagens: string[];
  promovida?: boolean;
}
interface Demanda {
  id: string;
  categoria: string;
  descricao: string;
}

export default function HomePage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const machinesQuery = query(
          collection(db, "machines"),
          orderBy("createdAt", "desc"),
          limit(8),
        );
        const demandasQuery = query(
          collection(db, "demandas"),
          orderBy("createdAt", "desc"),
          limit(6),
        );
        const [machinesSnapshot, demandasSnapshot] = await Promise.all([
          getDocs(machinesQuery),
          getDocs(demandasQuery),
        ]);

        setMachines(
          machinesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Machine[],
        );
        setDemandas(
          demandasSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Demanda[],
        );
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f0ff] via-[#fdf7ee] to-[#e8eaff] font-inter">
      {/* HERO com banners + CTA principal */}

      <Hero />

      {/* Seção de benefícios (mantendo a sua) */}
      <div className="mt-20">
        <FeaturesSection />
      </div>
      {/* Como funciona (3 passos) */}
      <div className="mt-24">
        <HowItWorks />
      </div>

      {/* Vitrine de demandas (prova de movimento) */}
      <div className="mt-24">
        <DemandasShowcase />
      </div>

      {/* Seção de fornecedores e serviços (clareza) */}
      <div className="mt-24">
        <SuppliersServices />
      </div>

      {/* Vitrine de máquinas (manter no fim) */}
      <div className="mt-24">
        <MachinesShowcase />
      </div>

      {/* Depoimentos */}
      <div className="mt-24 mb-24">
        <TestimonialsSection />
      </div>

      {/* Transição estética + Newsletter */}
      <div className="mt-24">
        <SectionTransition />
      </div>
      <NewsletterSection />
    </main>
  );
}

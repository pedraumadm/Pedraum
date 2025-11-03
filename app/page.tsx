"use client";


import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

import Hero from "@/components/Hero";
import FeaturesSection from "@/components/FeaturesSection";
import MachinesShowcase from "@/components/MachinesShowcase";
import TestimonialsSection from "@/components/TestimonialsSection";
import DemandasShowcase from "@/components/DemandasShowcase";
import SectionTransition from "@/components/SectionTransition";
import NewsletterSection from "@/components/NewsletterSection";
import HowItWorks from "@/components/HowItWorks";
import SuppliersServices from "@/components/SuppliersServices";

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
          limit(8)
        );
        const demandasQuery = query(
          collection(db, "demandas"),
          orderBy("createdAt", "desc"),
          limit(6)
        );
        const [machinesSnapshot, demandasSnapshot] = await Promise.all([
          getDocs(machinesQuery),
          getDocs(demandasQuery),
        ]);

        setMachines(
          machinesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          })) as Machine[]
        );
        setDemandas(
          demandasSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          })) as Demanda[]
        );
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f0ff] via-[#fdf7ee] to-[#e8eaff] font-inter">
      {/* HERO com wrapper-alvo do tour */}
      <div className="home-hero-section">
        <Hero />
        {/* IMPORTANTE: dentro do componente Hero, o botão principal precisa ter className="home-hero-cta" */}
      </div>

      {/* Benefícios */}
      <div className="mt-20">
        <FeaturesSection />
      </div>

      {/* Como funciona (3 passos) */}
      <div className="mt-24">
        <HowItWorks />
      </div>

      {/* Demandas recentes (wrapper-alvo do tour) */}
      <div className="mt-24 demandas-section">
        <DemandasShowcase />
      </div>

      {/* Fornecedores e serviços */}
      <div className="mt-24">
        <SuppliersServices />
      </div>

      {/* Vitrine de máquinas (wrapper-alvo do tour) */}
      <div className="mt-24 machines-section">
        <MachinesShowcase />
      </div>

      {/* Depoimentos (wrapper-alvo do tour) */}
      <div className="mt-24 mb-24 testimonials-section">
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

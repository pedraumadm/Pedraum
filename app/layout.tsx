// =======================================
// app/layout.tsx — Versão Premium Pedraum
// =======================================

import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsappFloatButton from "@/components/WhatsappFloatButton";
import OnboardingTour from "@/components/OnboardingTour";

// =========================
// Fonte global
// =========================
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// =========================
// SEO + Metadados
// =========================
export const metadata: Metadata = {
  title: "Pedraum Brasil — Plataforma de Demandas de Mineração",
  description:
    "A maior plataforma de demandas de mineração e britagem do Brasil. Publique, encontre e negocie soluções reais.",
  metadataBase: new URL("https://pedraum.com.br"),
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Pedraum Brasil",
    description:
      "A plataforma nº 1 para demandas reais de mineração e britagem.",
    url: "https://pedraum.com.br",
    siteName: "Pedraum Brasil",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pedraum Brasil",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pedraum Brasil",
    description:
      "Publique e encontre demandas reais de mineração e britagem.",
    images: ["/og-image.png"],
  },
};

// =========================
// Viewport — trava zoom mobile
// =========================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // <-- CORRETO (boolean)
};

// =========================
// Layout Global
// =========================
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-[#F6F9FA] text-[#023047] antialiased`}
      >
        {/* ===============================
            HEADER — fixo, limpo e moderno
        ================================= */}
        <Header />

        {/* ===============================
            CONTEÚDO PRINCIPAL
        ================================= */}
        <main className="min-h-screen w-full mx-auto">
          {children}
        </main>

        {/* WhatsApp flutuante */}
        <WhatsappFloatButton />

        {/* ===============================
            FOOTER — institucional
        ================================= */}
        <Footer />

        {/* Onboarding — carregado sempre no final */}
        <OnboardingTour />
      </body>
    </html>
  );
}

// =============================
// app/layout.tsx
// =============================

import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import OnboardingTour from "@/components/OnboardingTour";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsappFloatButton from "@/components/WhatsappFloatButton";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pedraum Brasil - Marketplace de Mineração e Britagem",
  description:
    "Marketplace de máquinas, peças, serviços e soluções para o setor de mineração e britagem no Brasil.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL("https://pedraum.com.br"),
  openGraph: {
    title: "Pedraum Brasil",
    description:
      "Conecte compradores e vendedores de máquinas, serviços e soluções para mineração e britagem.",
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
      "Marketplace para mineração e britagem. Compre, venda e conecte com segurança.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head />
      <body className={`${inter.className} bg-[#F6F9FA] text-[#023047] antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <WhatsappFloatButton />
        <Footer />

        {/* Tour guiado – fica no final para garantir que os alvos já estejam no DOM */}
        <OnboardingTour />
      </body>
    </html>
  );
}

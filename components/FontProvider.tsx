"use client";
import { Inter } from "next/font/google";
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function FontProvider({ children }: { children: React.ReactNode }) {
  return <div className={inter.className}>{children}</div>;
}

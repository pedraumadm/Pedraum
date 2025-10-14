import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Modo escuro por classe (padrão enterprise)
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    extend: {
      // Design tokens via CSS custom properties
      colors: {
        // Branding e tons
        brand: "var(--color-brand)",
        accent: "var(--color-accent)",
        highlight: "var(--color-highlight)",
        dark: "var(--color-dark)",
        muted: "var(--color-muted)",
        "gray-900": "#101828",
        "gray-100": "#F3F4F6",
        "white-soft": "#f9f9f9",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        pill: "999px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.12)",
        xl: "0 20px 25px -5px rgba(0,0,0,0.16)",
        "2xl": "0 30px 40px -10px rgba(0,0,0,0.13)",
        "3xl": "0 40px 60px -12px rgba(0,0,0,0.20)",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(120deg, rgba(2,48,71,0.8) 0%, rgba(251,133,0,0.50) 100%)",
      },
      animation: {
        "hero-fade": "fadeinhero 1.2s cubic-bezier(.28,.79,.66,1.14)",
      },
      keyframes: {
        fadeinhero: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/line-clamp"),
    require("@tailwindcss/aspect-ratio"),
    require("tailwind-scrollbar")({ nocompatible: true }),
    // Instale plugins via npm install antes!
  ],
};

export default config;

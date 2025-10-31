// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  next,
  {
    ignores: ["node_modules/", ".next/", "dist/"],
  },
  {
    rules: {
      // 🔧 Regras equilibradas: tipagem forte, mas sem travar a build por detalhes irrelevantes

      // Mantém código limpo
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Tipagem rigorosa
      "@typescript-eslint/no-explicit-any": "error",

      // Segurança — impedir acesso inseguro
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // Mais permissivo em unions (Next + Firestore precisam disso)
      "@typescript-eslint/no-redundant-type-constituents": "off",
    },
  },
  {
    files: ["app/api/**/*.ts"],
    rules: {
      // Na camada API, relaxa as regras de "unsafe" pois lidamos com JSON bruto
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);

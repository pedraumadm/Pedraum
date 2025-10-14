import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  nextPlugin.configs["core-web-vitals"],

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn",
      "prefer-const": "warn",
    },
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      "**/*.config.*",
      "next-env.d.ts",
    ],
  },
];

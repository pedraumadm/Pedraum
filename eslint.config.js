// eslint.config.js — Flat Config para Next.js + TypeScript

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import next from "eslint-config-next";
import prettier from "eslint-config-prettier";

// Plugins extras (Flat Config: importar o objeto do plugin)
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

/** -------------------------------------------------------
 *  Consts de glob
 *  ----------------------------------------------------- */
const TS_GLOBS = ["**/*.ts", "**/*.tsx"];
const API_GLOBS = ["app/api/**/*.{ts,tsx}", "pages/api/**/*.{ts,tsx}", "src/pages/api/**/*.{ts,tsx}"];
const SCRIPT_GLOBS = ["scripts/**/*.{ts,tsx,js,cjs,mjs}"];
const TEST_GLOBS = ["**/*.{spec,test}.{ts,tsx,js}"];

/** -------------------------------------------------------
 *  Config base JS + Next
 *  ----------------------------------------------------- */
const base = [
  // Regras JS recomendadas
  js.configs.recommended,

  // Next (inclui react, react-hooks, jsx-a11y e regras específicas do framework)
  // Observação: "next" aqui já é Flat Config compatível.
  next,

  // Ignore paths comuns
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      ".vercel/",
      "coverage/",
      "**/*.min.js",
      "**/generated/**",
      "**/.turbo/**",
      "**/.cache/**",
    ],
  },

  // Ambiente padrão
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // para app/ directory (browser)
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
      },
    },
  },
];

/** -------------------------------------------------------
 *  TypeScript — regras gerais (sem Type-Checking)
 *  ----------------------------------------------------- */
const tsNoTypeCheck = {
  files: TS_GLOBS,
  ...tseslint.configs.recommended, // NÃO type-checked (rápido)
  plugins: {
    import: importPlugin,
    "simple-import-sort": simpleImportSort,
    "unused-imports": unusedImports,
  },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      // sem project aqui (rápido para edições), as "type-checked" virão abaixo
      ecmaFeatures: { jsx: true },
    },
  },
  rules: {
    /* --- Higiene de imports --- */
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
    ],

    // Alternativa: se preferir import/order ao invés de simple-import-sort, substitua:
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",

    /* --- Qualidade/legibilidade --- */
    "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports", fixStyle: "separate-type-imports" }],
    "@typescript-eslint/explicit-function-return-type": ["off"], // pragmático para React
    "@typescript-eslint/no-empty-function": ["warn", { allow: ["arrowFunctions"] }],

    /* --- Regras de 'any' e inseguras (ver type-checked para o enforcement) --- */
    "@typescript-eslint/no-explicit-any": "warn",

    /* --- Preferências sem brigar com Prettier --- */
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "warn",
  },
};

/** -------------------------------------------------------
 *  TypeScript — regras com Type-Checking
 *  (aplica onde precisamos de segurança extra)
 *  ----------------------------------------------------- */
const tsTypeChecked = {
  files: TS_GLOBS,
  ...tseslint.configs.recommendedTypeChecked, // precisa do project service
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      projectService: true, // ESLint 9: usa tsconfig.* automaticamente
      tsconfigRootDir: import.meta.dirname,
      ecmaFeatures: { jsx: true },
    },
  },
  rules: {
    // Forte, mas pragmático (úteis com Firestore/JSON)
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",

    // Evitar 'any' generalizado (mas sem travar utilidades específicas)
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],

    // Demais ajustes úteis em apps Next:
    "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
    "@typescript-eslint/require-await": "off", // não conflitar com handlers que às vezes não await
    "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
    "@typescript-eslint/no-unsafe-enum-comparison": "warn",
    "@typescript-eslint/no-redundant-type-constituents": "off",
  },
};

/** -------------------------------------------------------
 *  Overrides — Camada API (relaxar regras inseguras)
 *  ----------------------------------------------------- */
const apiRelax = {
  files: API_GLOBS,
  rules: {
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};

/** -------------------------------------------------------
 *  Overrides — Scripts (build/migrations/etc.)
 *  ----------------------------------------------------- */
const scriptsNode = {
  files: SCRIPT_GLOBS,
  languageOptions: {
    // scripts rodam em Node, não browser
    globals: {
      process: "readonly",
      __dirname: "readonly",
      module: "readonly",
      require: "readonly",
    },
  },
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-var-requires": "off",
  },
};

/** -------------------------------------------------------
 *  Overrides — Testes
 *  ----------------------------------------------------- */
const tests = {
  files: TEST_GLOBS,
  rules: {
    "no-console": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
};

/** -------------------------------------------------------
 *  Prettier por último (desliga conflitos de formatação)
 *  ----------------------------------------------------- */
const prettierOffConflicts = [prettier];

/** -------------------------------------------------------
 *  Export final
 *  ----------------------------------------------------- */
export default [
  ...base,
  tsNoTypeCheck,
  tsTypeChecked,
  apiRelax,
  scriptsNode,
  tests,
  ...prettierOffConflicts,
];

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Enforce no explicit `any` — aligns with CLAUDE.md TypeScript constraint
      "@typescript-eslint/no-explicit-any": "error",
      // Warn on unused vars but allow leading underscore to suppress intentionally
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // shadcn/ui generated components intentionally co-export constants (e.g. buttonVariants).
  // Context files intentionally co-export the context object alongside the Provider component.
  // The react-refresh rule doesn't apply to either of these patterns.
  {
    files: ["src/components/ui/**/*.{ts,tsx}", "src/context/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // Must be last — disables ESLint formatting rules that conflict with Prettier
  eslintConfigPrettier,
]);

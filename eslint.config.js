import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 基础 JavaScript 规则
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // React 规则
  {
    plugins: {
      react: pluginReact,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
    },
  },

  // React Hooks 规则
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // 自定义规则
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off", // 添加这行禁用 any 类型检查
      "no-undef": "off", // 关闭未定义变量检查（避免报错 import.meta）
    },
  },

  // 配置文件特殊规则（使用新的 globals 格式）
  {
    files: ["**/*.config.{js,cjs,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node, // 包含 module, require 等 Node.js 全局变量
        "import.meta": "readonly",
      },
    },
  },
]);

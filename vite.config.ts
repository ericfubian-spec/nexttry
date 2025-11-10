import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveBase(mode: string): string {
  // Allow explicit override via environment variable (GitHub Actions will set this)
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return explicitBase.endsWith("/") ? explicitBase : `${explicitBase}/`;
  }

  // For GitHub Pages, use repository name as base
  // This will be overridden by VITE_BASE_PATH in GitHub Actions
  if (mode === "production") {
    return "/nexttry/";
  }

  return "/";
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: resolveBase(mode),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split by category for better caching
          "vendor-react": ["react", "react-dom", "react/jsx-runtime"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-slider",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          "vendor-charts": ["recharts"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-utils": ["date-fns", "zustand", "wouter", "@tanstack/react-query"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));

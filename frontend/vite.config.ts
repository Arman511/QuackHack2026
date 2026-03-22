import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteCompression from "vite-plugin-compression";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/external": {
        target: "https://revolite-hackathon.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/external/, ""),
      },
    },
  },
  plugins: [react(), viteCompression({ algorithm: "brotliCompress" })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

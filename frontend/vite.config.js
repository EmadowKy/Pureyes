// frontend/vite.config.js
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { player: ["hls.js"], markdown: ["marked", "dompurify"] },
      },
    },
  },
  server: {
    port: 3000,
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/demo-assets/": {
        target:
          loadEnv(mode, process.cwd(), "").PUREYES_PROXY_TARGET ||
          "http://116.62.178.139",
        changeOrigin: true,
      },
      "/api": {
        target:
          loadEnv(mode, process.cwd(), "").PUREYES_PROXY_TARGET ||
          "http://116.62.178.139",
        changeOrigin: true,
      },
    },
  },
}));

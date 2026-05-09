import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Geliştirmede API_BASE boşken istekler buradan uvicorn’a iletilir (CORS gerekmez). */
const apiTarget = "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/auth": { target: apiTarget, changeOrigin: true },
      "/admin": { target: apiTarget, changeOrigin: true },
      "/predict": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
    proxy: {
      "/v1": {
        target: process.env.ATLAS_API_PROXY ?? "http://127.0.0.1:4030",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.ATLAS_API_PROXY ?? "http://127.0.0.1:4030",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
});

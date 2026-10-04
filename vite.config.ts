
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/EE_24/",
  server: {
    proxy: {
      // proxy API calls and health check to backend dev server
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
  // For GitHub Pages SPA routing, 404.html is handled in postbuild script
});

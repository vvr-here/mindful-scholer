import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },

  build: {
    // Target modern browsers — smaller bundles, no IE11 polyfills
    target: "es2020",
    // Warn when a chunk exceeds 500 KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Split vendor code into a separate cached chunk
        manualChunks: {
          react:  ["react", "react-dom"],
          zustand: ["zustand"],
        },
      },
    },
    // Remove console.* and debugger in production builds
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // Pre-bundle these for faster cold starts in dev
  optimizeDeps: {
    include: ["react", "react-dom", "zustand"],
  },
});

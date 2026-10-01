import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The "proxy" forwards every request that starts with /api to the Express server.
// So in React we can simply write fetch("/api/devices") — no CORS problems, no hard-coded port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});

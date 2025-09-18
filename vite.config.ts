import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    allowedHosts: ["bbc185c5039e.ngrok-free.app"],
    host: "0.0.0.0", // 强制监听所有网卡
    port: 5173,
  },
});

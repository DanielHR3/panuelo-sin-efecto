import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // IndexedDB simulado para la cola offline (src/lib/offline-queue.ts).
    setupFiles: ["fake-indexeddb/auto"],
    clearMocks: true,
  },
});

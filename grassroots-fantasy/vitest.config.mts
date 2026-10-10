import path from "node:path";
import { defineConfig } from "vitest/config";

delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup-env.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

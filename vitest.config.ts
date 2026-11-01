import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ""),
    fileParallelism: false,
    testTimeout: 60000,
    include: ["tests/**/*.test.ts"],
  },
}));

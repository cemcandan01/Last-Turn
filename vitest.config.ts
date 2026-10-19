import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/birim/**/*.test.ts"],
    environment: "node",
  },
});

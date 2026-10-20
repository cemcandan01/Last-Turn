// Ölçüm koşuları (test değil): fizik değerlerini yazdırır. npm run olcum
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/olcum/**/*.test.ts"], environment: "node", silent: false, testTimeout: 600000 },
});

import { defineConfig } from "@playwright/test";
import remote from "./playwright.remote.config.js";

if (!process.env.PUREYES_TEST_BASE_URL)
  throw new Error("线上验收需要 PUREYES_TEST_BASE_URL，包含 /web/ 路径");

export default defineConfig({
  ...remote,
  testDir: "./tests",
  testMatch: ["deployment/site.spec.js", "remote/server.spec.js"],
  outputDir: "./test-results/deployment",
  webServer: undefined,
});

import { defineConfig } from "@playwright/test";
if (!process.env.PUREYES_TEST_EMP_ID || !process.env.PUREYES_TEST_PASSWORD)
  throw new Error(
    "真实服务验收需要 PUREYES_TEST_EMP_ID 和 PUREYES_TEST_PASSWORD；不使用模拟账号或跳过登录",
  );
export default defineConfig({
  testDir: "./tests/remote",
  outputDir: "./test-results/remote",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.PUREYES_TEST_BASE_URL || "http://127.0.0.1:3000/",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    trace: "off",
  },
  reporter: [["list"]],
  webServer: process.env.PUREYES_TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
      },
});

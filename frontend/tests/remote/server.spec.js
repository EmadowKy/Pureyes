import { test, expect } from "@playwright/test";
test("real server: login, shared clips, actual media decoding, faces, conversations and live monitor", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("工号", { exact: true })
    .fill(process.env.PUREYES_TEST_EMP_ID);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.PUREYES_TEST_PASSWORD);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "调查工作区", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "当前小组" })
    .selectOption({ label: "test1" });
  await page.getByRole("button", { name: /^test\s/ }).click();
  await expect(page.locator(".clip-card")).not.toHaveCount(0);
  await expect
    .poll(
      () =>
        page
          .locator(".clip-card img")
          .evaluateAll(
            (images) =>
              images.filter((i) => i.complete && i.naturalWidth > 0).length,
          ),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "查看片段", exact: true })
    .first()
    .click();
  const video = page.locator("video");
  await expect
    .poll(() => video.evaluate((v) => v.readyState), { timeout: 60000 })
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() => video.evaluate((v) => v.videoWidth))
    .toBeGreaterThan(0);
  await video.evaluate((v) => v.play());
  await expect
    .poll(() => video.evaluate((v) => v.currentTime), { timeout: 15000 })
    .toBeGreaterThan(0.5);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("button", { name: "人脸", exact: true }).click();
  await expect(page.locator(".face-cover")).not.toHaveCount(0);
  await expect
    .poll(
      () =>
        page
          .locator(".face-cover")
          .evaluateAll(
            (images) =>
              images.filter((i) => i.complete && i.naturalWidth > 0).length,
          ),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "调查问答", exact: true }).click();
  await expect(page.locator(".conversation-link")).not.toHaveCount(0);
  await page.locator(".conversation-link>button").first().click();
  await expect(page.locator(".turn")).not.toHaveCount(0);
  await page.getByRole("button", { name: "监控与回放", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "查看画面", exact: true }),
  ).not.toHaveCount(0);
  await page
    .getByRole("button", { name: "查看画面", exact: true })
    .first()
    .click();
  await expect
    .poll(() => page.locator("video").evaluate((v) => v.readyState), {
      timeout: 60000,
    })
    .toBeGreaterThanOrEqual(2);
  await expect(page.getByLabel("录像时间轴")).toBeVisible();
  expect(errors).toEqual([]);
});

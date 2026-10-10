import { test, expect } from "@playwright/test";
test("real server: login, shared clips, actual media decoding, faces, conversations and live monitor", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const avatarResponse = await page.request.get(
    "/demo-assets/avatars/admin.svg",
  );
  expect(avatarResponse.ok()).toBe(true);
  expect(avatarResponse.headers()["content-type"]).toContain("image/svg+xml");
  await page.goto("./");
  await expect
    .poll(() =>
      page
        .locator(".brand img")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image.naturalWidth > 0);
          image.onerror = () => resolve(false);
          image.src = "/demo-assets/avatars/admin.svg";
        }),
    ),
  ).toBe(true);
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
  await page
    .locator(".workspace-card")
    .filter({ has: page.getByRole("heading", { name: "test", exact: true }) })
    .click();
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
  const historyResponse = page.waitForResponse((response) =>
    response.url().includes("/history?"),
  );
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
  const history = (await (await historyResponse).json()).data;
  expect(history.available_ranges.length).toBeGreaterThan(0);
  const range = history.available_ranges[0];
  const time = new Date(
    (+new Date(range.start_time) + +new Date(range.end_time)) / 2,
  );
  const local = new Date(time.getTime() - time.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
  await page.getByLabel("定位时间").fill(local);
  await page.getByLabel("定位时间").blur();
  await expect(page.getByText("回放", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator("video").evaluate((v) => v.readyState), {
      timeout: 60000,
    })
    .toBeGreaterThanOrEqual(2);
  await page.locator("video").evaluate((v) => v.play());
  await expect
    .poll(() => page.locator("video").evaluate((v) => v.currentTime), {
      timeout: 15000,
    })
    .toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

import { test, expect } from "@playwright/test";

test("documentation remains the homepage and its Beta entry opens the deployed app", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".VPHero")).toContainText("Pureyes (清眸)");
  const entry = page
    .locator(".VPHero")
    .getByRole("link", { name: "网页版 Beta", exact: true });
  await expect(entry).toHaveAttribute("href", "/web/");
  await entry.click();
  await expect(page).toHaveURL(/\/web\/$/);
  await expect(page.getByLabel("工号", { exact: true })).toBeVisible();
  const logo = page.locator(".brand img");
  await expect(logo).toHaveAttribute("src", "/web/logo.png");
  await expect
    .poll(() =>
      logo.evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test("subpath assets, caching, compression and API are served without replacing docs", async ({
  request,
  baseURL,
}) => {
  const origin = new URL(baseURL).origin;
  for (const port of [80, 8000]) {
    const address = new URL(origin);
    address.port = String(port);
    const root = await request.get(address.href);
    expect(root.ok()).toBe(true);
    expect(await root.text()).toContain("VPHero");
    const app = await request.get(new URL("/web/", address).href);
    expect(app.ok()).toBe(true);
    const html = await app.text();
    expect(html).toContain('id="app"');
    expect(app.headers()["cache-control"]).toContain("no-cache");
    const scripts = [
      ...html.matchAll(/(?:src|href)="(\/web\/assets\/[^\"]+)"/g),
    ].map((match) => match[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const path of scripts) {
      const asset = await request.get(new URL(path, address).href, {
        headers: { "Accept-Encoding": "gzip" },
      });
      expect(asset.ok()).toBe(true);
      expect(asset.headers()["cache-control"]).toContain("immutable");
      expect(asset.headers()["content-encoding"]).toBe("gzip");
      expect(asset.headers()["content-type"]).not.toContain("text/html");
    }
    const missing = await request.get(
      new URL("/web/assets/not-found.js", address).href,
    );
    expect(missing.status()).toBe(404);
    const redirect = await request.get(new URL("/web", address).href, {
      maxRedirects: 0,
    });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toMatch(/\/web\/$/);
    const avatar = await request.get(
      new URL("/demo-assets/avatars/admin.svg", address).href,
    );
    expect(avatar.ok()).toBe(true);
    expect(avatar.headers()["content-type"]).toContain("image/svg+xml");
    const api = await request.get(new URL("/api/users/me", address).href);
    expect(api.status()).toBe(401);
    expect(api.headers()["content-type"]).toContain("application/json");
  }
});

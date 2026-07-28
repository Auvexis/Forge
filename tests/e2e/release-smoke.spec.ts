import { expect, test } from "@playwright/test";

test("serves the release gateway and core app shell", async ({ page, request }) => {
  const homeResponse = await request.get("/home");
  expect(homeResponse.status()).toBe(200);

  await expect
    .poll(async () => (await request.get("/profiles")).status(), {
      message: "profiles API becomes available through the gateway",
    })
    .toBe(200);

  const profilesResponse = await request.get("/profiles");
  expect(profilesResponse.headers()["content-type"]).toContain("application/json");

  await page.goto("/home");
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("body")).not.toBeEmpty();
});

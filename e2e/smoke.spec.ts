import { expect, test } from "@playwright/test";

const hasCredentials =
  Boolean(process.env.E2E_BASE_URL) &&
  Boolean(process.env.E2E_USERNAME) &&
  Boolean(process.env.E2E_PASSWORD) &&
  Boolean(process.env.E2E_HOMESERVER_URL);

test.describe("matrix admin smoke", () => {
  test.skip(!hasCredentials, "Set E2E_BASE_URL, E2E_USERNAME, E2E_PASSWORD and E2E_HOMESERVER_URL to run smoke tests.");

  test("logs in and reaches the dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Username").fill(process.env.E2E_USERNAME!);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByLabel("Homeserver URL").fill(process.env.E2E_HOMESERVER_URL!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Matrix Homeserver Overview")).toBeVisible();
  });
});

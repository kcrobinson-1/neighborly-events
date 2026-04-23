import { expect, test } from "@playwright/test";
import { ensureRedemptionsE2eFixture } from "./redemptions-auth-fixture";

test("loads the monitoring list, narrows via chip + search, and opens the detail sheet", async ({
  page,
}) => {
  const fixture = await ensureRedemptionsE2eFixture();

  await page.goto(`/event/${fixture.eventSlug}/redemptions`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: "Sign in to review redemptions" }),
  ).toBeVisible();

  await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(
    new RegExp(`/event/${fixture.eventSlug}/redemptions$`),
  );

  // Authorized list renders all three seeded rows (redeemed×2, reversed×1).
  await expect(page.getByText(fixture.redeemedByMe.verificationCode))
    .toBeVisible();
  await expect(page.getByText(fixture.redeemedByOther.verificationCode))
    .toBeVisible();
  await expect(page.getByText(fixture.reversedByMe.verificationCode))
    .toBeVisible();

  // Toggle the Redeemed chip; the reversed row falls away client-side.
  await page.getByRole("button", { name: "Redeemed", pressed: false }).click();
  await expect(page.getByText(fixture.redeemedByMe.verificationCode))
    .toBeVisible();
  await expect(page.getByText(fixture.reversedByMe.verificationCode))
    .toBeHidden();
  await page.getByRole("button", { name: "Redeemed", pressed: true }).click();

  // Suffix-first search narrows to one row.
  await page
    .getByRole("searchbox", { name: "Search redemptions by code" })
    .fill(fixture.redeemedByMe.suffix);
  await expect(page.getByText(fixture.redeemedByMe.verificationCode))
    .toBeVisible();
  await expect(page.getByText(fixture.redeemedByOther.verificationCode))
    .toBeHidden();

  // Open the detail sheet for the surviving row.
  await page.getByRole("button", { name: "View details" }).first().click();
  await expect(page.getByRole("dialog", { name: /./ })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: fixture.redeemedByMe.verificationCode }),
  ).toBeVisible();
  // View-only contract in B.2a: no Reverse button inside the sheet.
  await expect(
    page.getByRole("button", { name: /reverse/i }),
  ).toHaveCount(0);

  // Close via scrim tap.
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

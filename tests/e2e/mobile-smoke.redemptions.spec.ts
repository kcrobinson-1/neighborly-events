import { expect, test } from "@playwright/test";
import {
  ensureRedemptionsE2eFixture,
  installRedemptionsFunctionProxy,
} from "./redemptions-auth-fixture";

test("loads the monitoring list, narrows via chip + search, and opens the detail sheet", async ({
  page,
}) => {
  const fixture = await ensureRedemptionsE2eFixture();

  await page.goto(`/event/${fixture.eventSlug}/game/redemptions`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: "Sign in to review redemptions" }),
  ).toBeVisible();

  await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(
    new RegExp(`/event/${fixture.eventSlug}/game/redemptions$`),
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

  // Open the detail sheet for the surviving row and close via the Close
  // button. The reversal flow is covered by a separate test below so this
  // spec stays focused on the read/filter/search surface.
  await page.getByRole("button", { name: "View details" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("heading", {
      level: 2,
      name: fixture.redeemedByMe.verificationCode,
    }),
  ).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Reverse redemption" }),
  ).toBeVisible();

  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
});

test("organizer reverses a redeemed row from the detail sheet end to end", async ({
  page,
}) => {
  const fixture = await ensureRedemptionsE2eFixture();
  await installRedemptionsFunctionProxy(page);

  await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(
    new RegExp(`/event/${fixture.eventSlug}/game/redemptions$`),
  );

  // Narrow to the row we will reverse so the first matching View details
  // button belongs to the redeemedByMe row deterministically.
  await page
    .getByRole("searchbox", { name: "Search redemptions by code" })
    .fill(fixture.redeemedByMe.suffix);
  await expect(page.getByText(fixture.redeemedByMe.verificationCode))
    .toBeVisible();

  await page.getByRole("button", { name: "View details" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("heading", {
      level: 2,
      name: fixture.redeemedByMe.verificationCode,
    }),
  ).toBeVisible();

  await sheet.getByRole("button", { name: "Reverse redemption" }).click();
  await expect(
    sheet.getByRole("heading", { name: "Reverse redemption?" }),
  ).toBeVisible();

  const reason = "smoke-test reversal";
  await sheet.getByRole("textbox").fill(reason);
  await sheet.getByRole("button", { name: "Confirm reversal" }).click();

  // The post-success reconciliation runs the single-row re-read in parallel
  // with the list refetch; the sheet should reflect the reversed state
  // without waiting for the user to close and reopen it.
  await expect(
    sheet
      .locator(".redemptions-status-badge-reversed")
      .filter({ hasText: "Reversed" }),
  ).toBeVisible();
  await expect(sheet.getByText(reason)).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Reverse redemption" }),
  ).toHaveCount(0);

  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);

  // Clear the suffix search so the expanded By me filter can surface the
  // just-reversed row without the search also narrowing.
  await page
    .getByRole("searchbox", { name: "Search redemptions by code" })
    .fill("");
  await page.getByRole("button", { name: "By me", pressed: false }).click();
  await expect(page.getByText(fixture.redeemedByMe.verificationCode))
    .toBeVisible();

  await page.getByRole("button", { name: "View details" }).first().click();
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Reverse redemption" }),
  ).toHaveCount(0);
  await expect(sheet.getByText(reason)).toBeVisible();
});

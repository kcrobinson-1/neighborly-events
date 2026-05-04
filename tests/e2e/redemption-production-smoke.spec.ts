import { expect, test } from "@playwright/test";
import {
  assertRedeemOutcomePersisted,
  assertReversalPersisted,
  ensureRedeemProductionSmokeFixture,
  ensureRedemptionsProductionSmokeFixture,
} from "./redemption-production-smoke-fixture";

async function enterSuffix(
  page: Parameters<typeof test>[0]["page"],
  suffix: string,
) {
  for (const digit of suffix) {
    await page.getByRole("button", { exact: true, name: digit }).click();
  }
}

test.describe("production redemption smoke", () => {
  test("agent redeems an event-scoped code through the deployed mobile operator route", async ({
    page,
  }) => {
    const fixture = await ensureRedeemProductionSmokeFixture();

    await page.goto(`/event/${fixture.eventSlug}/game/redeem`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: "Sign in to redeem codes" }),
    ).toBeVisible();

    await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(
      new RegExp(`/event/${fixture.eventSlug}/game/redeem$`),
    );
    await expect(page.getByLabel("Code preview")).toHaveText(
      `${fixture.eventCode}••••`,
    );

    await enterSuffix(page, fixture.redeemSuffix);
    await expect(page.getByLabel("Code preview")).toHaveText(
      `${fixture.eventCode}${fixture.redeemSuffix}`,
    );

    await page.getByRole("button", { name: "Redeem code" }).click();
    await expect(page.getByRole("heading", { name: "Redeemed" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Redeem Next Code" }),
    ).toBeVisible();
    await assertRedeemOutcomePersisted(
      fixture.verificationCode,
      "redeemed_now",
      fixture.eventId,
    );

    await page.getByRole("button", { name: "Redeem Next Code" }).click();
    await expect(
      page.getByRole("heading", { name: "Enter a 4-digit code" }),
    ).toBeVisible();
    await expect(page.getByLabel("Code preview")).toHaveText(
      `${fixture.eventCode}••••`,
    );

    await enterSuffix(page, fixture.redeemSuffix);
    await page.getByRole("button", { name: "Redeem code" }).click();
    await expect(
      page.getByRole("heading", { name: "Already redeemed" }),
    ).toBeVisible();
    await assertRedeemOutcomePersisted(
      fixture.verificationCode,
      "already_redeemed",
      fixture.eventId,
    );
  });

  test("organizer loads the monitoring list and narrows via chip plus search on the deployed surface", async ({
    page,
  }) => {
    const fixture = await ensureRedemptionsProductionSmokeFixture();

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

    await expect(
      page.getByText(fixture.redeemedByMe.verificationCode),
    ).toBeVisible();
    await expect(
      page.getByText(fixture.redeemedByOther.verificationCode),
    ).toBeVisible();
    await expect(
      page.getByText(fixture.reversedByMe.verificationCode),
    ).toBeVisible();

    await page.getByRole("button", { name: "Redeemed", pressed: false }).click();
    await expect(
      page.getByText(fixture.redeemedByMe.verificationCode),
    ).toBeVisible();
    await expect(
      page.getByText(fixture.reversedByMe.verificationCode),
    ).toBeHidden();
    await page.getByRole("button", { name: "Redeemed", pressed: true }).click();

    await page
      .getByRole("searchbox", { name: "Search redemptions by code" })
      .fill(fixture.redeemedByMe.suffix);
    await expect(
      page.getByText(fixture.redeemedByMe.verificationCode),
    ).toBeVisible();
    await expect(
      page.getByText(fixture.redeemedByOther.verificationCode),
    ).toBeHidden();

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

  test("organizer reverses a redeemed row from the detail sheet end-to-end on the deployed surface", async ({
    page,
  }) => {
    const fixture = await ensureRedemptionsProductionSmokeFixture();

    await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(
      new RegExp(`/event/${fixture.eventSlug}/game/redemptions$`),
    );

    await page
      .getByRole("searchbox", { name: "Search redemptions by code" })
      .fill(fixture.redeemedByMe.suffix);
    await expect(
      page.getByText(fixture.redeemedByMe.verificationCode),
    ).toBeVisible();

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

    const reason = "production-smoke reversal";
    await sheet.getByRole("textbox").fill(reason);
    await sheet.getByRole("button", { name: "Confirm reversal" }).click();

    await expect(
      sheet
        .locator(".redemptions-status-badge-reversed")
        .filter({ hasText: "Reversed" }),
    ).toBeVisible();
    await expect(sheet.getByText(reason)).toBeVisible();
    await expect(
      sheet.getByRole("button", { name: "Reverse redemption" }),
    ).toHaveCount(0);

    await assertReversalPersisted(
      fixture.redeemedByMe.verificationCode,
      fixture.eventId,
      reason,
    );

    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toHaveCount(0);
  });
});

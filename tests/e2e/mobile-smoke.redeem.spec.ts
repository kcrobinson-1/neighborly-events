import { expect, test } from "@playwright/test";
import {
  assertRedeemOutcomePersisted,
  ensureRedeemE2eFixture,
  installRedeemFunctionProxy,
} from "./redeem-auth-fixture";

async function enterSuffix(page: Parameters<typeof test>[0]["page"], suffix: string) {
  for (const digit of suffix) {
    await page.getByRole("button", { exact: true, name: digit }).click();
  }
}

test("redeems an event-scoped code through the mobile operator route", async ({ page }) => {
  const fixture = await ensureRedeemE2eFixture();
  await installRedeemFunctionProxy(page);

  await page.goto(`/event/${fixture.eventSlug}/redeem`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Sign in to redeem codes" }),
  ).toBeVisible();

  await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(`/event/${fixture.eventSlug}/redeem$`));
  await expect(page.getByLabel("Code preview")).toHaveText(`${fixture.eventCode}••••`);

  await enterSuffix(page, fixture.redeemSuffix);
  await expect(page.getByLabel("Code preview")).toHaveText(
    `${fixture.eventCode}${fixture.redeemSuffix}`,
  );

  await page.getByRole("button", { name: "Redeem code" }).click();
  await expect(page.getByRole("heading", { name: "Redeemed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Redeem Next Code" })).toBeVisible();
  await assertRedeemOutcomePersisted(fixture.verificationCode, "redeemed_now", fixture.eventId);

  await page.getByRole("button", { name: "Redeem Next Code" }).click();
  await expect(page.getByRole("heading", { name: "Enter a 4-digit code" })).toBeVisible();
  await expect(page.getByLabel("Code preview")).toHaveText(`${fixture.eventCode}••••`);

  await enterSuffix(page, fixture.redeemSuffix);
  await page.getByRole("button", { name: "Redeem code" }).click();
  await expect(page.getByRole("heading", { name: "Already redeemed" })).toBeVisible();
  await assertRedeemOutcomePersisted(
    fixture.verificationCode,
    "already_redeemed",
    fixture.eventId,
  );
});

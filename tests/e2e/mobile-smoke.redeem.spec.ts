/**
 * The post-magic-link assertion below crosses an app boundary:
 * `/auth/callback` is hosted by apps/site (Next.js) and the redeem
 * SPA route by apps/web (Vite). Both run behind the proxy spawned by
 * scripts/testing/run-auth-e2e-dev-server.cjs at
 * http://127.0.0.1:4173, the same origin the fixture's redirect URL
 * hardcodes. If the redeem suite hangs at "Signing you in…", the
 * usual cause is a port collision (orphan `next dev` from a sibling
 * worktree on :3000) — the proxy script's preflight names the
 * conflicting PID.
 */
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

  await page.goto(`/event/${fixture.eventSlug}/game/redeem`, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Sign in to redeem codes" }),
  ).toBeVisible();

  await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(new RegExp(`/event/${fixture.eventSlug}/game/redeem$`));
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

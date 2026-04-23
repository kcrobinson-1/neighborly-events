import { expect, test, type Page } from "@playwright/test";
import { ensureAdminE2eFixture, readPublishedEventState } from "./admin-auth-fixture";

async function readLiveCount(page: Page) {
  const liveSummary = page
    .getByLabel("Event workspace summary")
    .getByText(/^\d+ live$/);
  const liveSummaryText = await liveSummary.textContent();

  if (!liveSummaryText) {
    throw new Error("Expected the admin workspace summary to expose a live count.");
  }

  const liveCountMatch = liveSummaryText.match(/^(\d+) live$/);

  if (!liveCountMatch) {
    throw new Error(`Unexpected live-count copy: ${liveSummaryText}`);
  }

  return Number(liveCountMatch[1]);
}

test.describe("production admin smoke", () => {
  test("denies a non-allowlisted signed-in user", async ({ page }) => {
    const fixture = await ensureAdminE2eFixture({ includeDeniedUserLink: true });

    if (!fixture.deniedMagicLinkUrl) {
      throw new Error("Expected denied admin magic link to be present for smoke coverage.");
    }

    await page.goto(fixture.deniedMagicLinkUrl, { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", {
        name: "This account is not allowlisted for game authoring.",
      }),
    ).toBeVisible();
  });

  test("covers save, publish, and unpublish against deployed authoring functions", async ({ page }) => {
    const fixture = await ensureAdminE2eFixture();
    const editedEventName = `${fixture.eventName} Updated`;
    const editedQuestionPrompt = "Production admin smoke prompt update";

    await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Game draft access" })).toBeVisible();
    const baselineLiveCount = await readLiveCount(page);

    const eventCard = page.getByLabel(`${fixture.eventName} event`);
    await expect(eventCard).toBeVisible();

    await eventCard.getByRole("button", { name: "Open workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/events/${fixture.eventId}$`));
    await expect(page.getByText(`Slug: ${fixture.eventSlug}`)).toBeVisible();

    await page.getByLabel("Event name").fill(editedEventName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(`Saved ${editedEventName}.`)).toBeVisible();

    await page.getByLabel("Question prompt").fill(editedQuestionPrompt);
    await page.getByRole("button", { name: "Save question changes" }).click();
    await expect(page.getByText("Saved question changes.")).toBeVisible();

    await page.getByRole("button", { name: "Publish draft" }).click();
    await expect(page.getByText(/Published as version/)).toBeVisible();

    const publishedState = await readPublishedEventState(fixture.eventId);
    expect(publishedState).not.toBeNull();
    expect(publishedState?.publishedAt).not.toBeNull();
    expect(publishedState?.slug).toBe(fixture.eventSlug);

    await page.goto(`/event/${fixture.eventSlug}/game`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: editedEventName })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start game" })).toBeVisible();

    await page.goto(`/admin/events/${fixture.eventId}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("button", { name: "Confirm unpublish" }).click();

    await expect(page.getByText("Status: Draft only")).toBeVisible();

    const unpublishedState = await readPublishedEventState(fixture.eventId);
    expect(unpublishedState).not.toBeNull();
    expect(unpublishedState?.publishedAt).toBeNull();
    expect(unpublishedState?.slug).toBe(fixture.eventSlug);

    await page.goto("/admin", { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });

    const reloadedEventCard = page.getByLabel(`${editedEventName} event`);
    await expect(page.getByRole("heading", { name: "Game draft access" })).toBeVisible();
    await expect(page.getByText(`${baselineLiveCount} live`)).toBeVisible();
    await expect(reloadedEventCard).toBeVisible();
    await expect(reloadedEventCard.getByText("Draft only")).toBeVisible();
    await expect(reloadedEventCard.getByText(/^Live v/)).toHaveCount(0);
    await expect(
      reloadedEventCard.getByRole("button", { name: "Open live game" }),
    ).toBeDisabled();

    await reloadedEventCard.getByRole("button", { name: "Open workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/events/${fixture.eventId}$`));
    await expect(page.getByText("Status: Draft only")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open live game" })).toBeDisabled();

    await page.goto(`/event/${fixture.eventSlug}/game`, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "This game isn't available right now." }),
    ).toBeVisible();
  });
});

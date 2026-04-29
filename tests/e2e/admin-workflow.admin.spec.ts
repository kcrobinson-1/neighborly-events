import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  ensureAdminE2eFixture,
  installAuthoringFunctionProxy,
  readPublishedEventState,
} from "./admin-auth-fixture";

const openLiveGameNotLiveReason = "Publish this event to open the live game.";

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

async function expectOpenLiveGameDisabledState(
  page: Page,
  button: Locator,
  reason: string,
) {
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-disabled", "true");
  const reasonId = await button.getAttribute("aria-describedby");

  if (!reasonId) {
    throw new Error("Expected Open live game to set aria-describedby when disabled.");
  }

  await expect(page.locator(`#${reasonId}`)).toHaveText(reason);
}

async function expectOpenLiveGameEnabledState(button: Locator) {
  await expect(button).not.toHaveAttribute("aria-disabled", "true");
  expect(await button.getAttribute("aria-describedby")).toBeNull();
}

test.describe("admin authoring workflow", () => {
  test("covers save, publish, and unpublish on the shipped admin MVP path", async ({ page }) => {
    const fixture = await ensureAdminE2eFixture();
    const editedEventName = `${fixture.eventName} Updated`;
    const editedQuestionPrompt = "Admin e2e prompt update";
    await installAuthoringFunctionProxy(page);

    await page.goto(fixture.magicLinkUrl, { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Game draft access" })).toBeVisible();
    const baselineLiveCount = await readLiveCount(page);
    const eventCard = page.getByLabel(`${fixture.eventName} event`);
    await expect(eventCard).toBeVisible();

    await eventCard.getByRole("button", { name: "Open workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/event/${fixture.eventSlug}/admin$`));
    await expect(page.getByText(`Slug: ${fixture.eventSlug}`)).toBeVisible();

    await page.getByLabel("Event name").fill(editedEventName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(`Saved ${editedEventName}.`)).toBeVisible();

    await page.getByLabel("Question prompt").fill(editedQuestionPrompt);
    await page.getByRole("button", { name: "Save question changes" }).click();
    await expect(page.getByText("Saved question changes.")).toBeVisible();

    await page.getByRole("button", { name: "Publish draft" }).click();
    await expect(page.getByText(/Published as version/)).toBeVisible();
    await expectOpenLiveGameEnabledState(
      page.getByRole("button", { name: "Open live game" }),
    );

    const publishedState = await readPublishedEventState(fixture.eventId);
    expect(publishedState).not.toBeNull();
    expect(publishedState?.publishedAt).not.toBeNull();
    expect(publishedState?.slug).toBe(fixture.eventSlug);

    await page.goto(`/event/${fixture.eventSlug}/game`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: editedEventName })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start game" })).toBeVisible();

    await page.goto(`/event/${fixture.eventSlug}/admin`, { waitUntil: "networkidle" });
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
    const reloadedOpenLiveGameButton = reloadedEventCard.getByRole("button", {
      name: "Open live game",
    });
    await expectOpenLiveGameDisabledState(
      page,
      reloadedOpenLiveGameButton,
      openLiveGameNotLiveReason,
    );
    await reloadedEventCard.getByRole("button", { name: "Open workspace" }).focus();
    await page.keyboard.press("Tab");
    await expect(reloadedOpenLiveGameButton).toBeFocused();

    await reloadedEventCard.getByRole("button", { name: "Open workspace" }).click();
    await expect(page).toHaveURL(new RegExp(`/event/${fixture.eventSlug}/admin$`));
    await expect(page.getByText("Status: Draft only")).toBeVisible();
    const workspaceOpenLiveGameButton = page.getByRole("button", { name: "Open live game" });
    await expectOpenLiveGameDisabledState(
      page,
      workspaceOpenLiveGameButton,
      openLiveGameNotLiveReason,
    );

    await page.goto(`/event/${fixture.eventSlug}/game`, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "This game isn't available right now." }),
    ).toBeVisible();
  });
});

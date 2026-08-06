import { expect, test, type Locator, type Page } from "@playwright/test";
import { computeContentFingerprint } from "../../apps/web/src/game/contentFingerprint.ts";
import { games } from "../../shared/game-config/sample-fixtures.ts";

/** Scrolls the target into view so Playwright can use its normal actionability checks. */
async function activate(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

/** Selects an answer and submits the question with normal browser-like interactions. */
async function clickOptionAndSubmit(
  page: Page,
  optionLabel: string,
  submitLabel = "Submit answer",
) {
  await activate(page.getByText(optionLabel, { exact: true }));
  await activate(page.getByRole("button", { exact: true, name: submitLabel }));
}

test("loads the featured attendee route directly", async ({ page }) => {
  await page.goto("/event/first-sample/game", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Madrona Music in the Playfield" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start game" })).toBeVisible();
});

test("completes the featured attendee flow on mobile", async ({ page }) => {
  await page.goto("/event/first-sample/game", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Madrona Music in the Playfield" }),
  ).toBeVisible();

  await activate(page.getByRole("button", { exact: true, name: "Start game" }));
  await expect(
    page.getByRole("heading", {
      name: "Which local spot is sponsoring this neighborhood music series question?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "Hi Spot Cafe");
  await expect(
    page.getByRole("heading", {
      name: "What kind of experience should this game feel like?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "A quick neighborhood game");
  await expect(
    page.getByRole("heading", {
      name: "How many questions should the MVP generally ask attendees?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "5 to 7");
  await expect(
    page.getByRole("heading", {
      name: "What matters most for reward eligibility in the MVP?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "Finishing the game");
  await expect(
    page.getByRole("heading", {
      name: "How should questions appear in the experience?",
    }),
  ).toBeVisible();

  await activate(page.getByRole("button", { exact: true, name: "Back to the previous question" }));
  await expect(
    page.getByRole("heading", {
      name: "What matters most for reward eligibility in the MVP?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "Finishing the game");
  await expect(
    page.getByRole("heading", {
      name: "How should questions appear in the experience?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "One card at a time");
  await expect(
    page.getByRole("heading", {
      name: "What should the final screen make obvious?",
    }),
  ).toBeVisible();

  await clickOptionAndSubmit(page, "That the attendee is officially done");

  await expect(
    page.getByRole("heading", { name: "Show this screen at the volunteer table" }),
  ).toBeVisible();
  await expect(page.getByText("You're checked in for the reward.")).toBeVisible();
  await expect(page.locator(".token-block strong")).not.toHaveText("Loading...");

  // The completed state persists on the device: a reload restores the results
  // screen — same verification code — without replaying, and offers the
  // retake affordance with its reassurance line.
  const verificationCode = await page.locator(".token-block strong").innerText();

  await page.reload({ waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Show this screen at the volunteer table" }),
  ).toBeVisible();
  await expect(page.locator(".token-block strong")).toHaveText(verificationCode);
  await expect(
    page.getByRole("button", { name: "Retake the quiz" }),
  ).toBeVisible();
  await expect(
    page.getByText("Retaking never changes your code or your reward entry."),
  ).toBeVisible();
});

test("completes a restored in-flight submission under the dev build's StrictMode", async ({ page }) => {
  // The dev server runs the development React build, where StrictMode
  // double-invokes effects (mount → cleanup → mount). A restored
  // `submitting` snapshot submits from the mount effect, so this is the
  // one flow where the double-mount can strand the pending screen if the
  // submission guard is not released during cleanup. jsdom unit tests
  // cannot cover this: Vitest resolves the production React build, which
  // never double-invokes.
  // The snapshot must carry the current content fingerprint or restore
  // discards it; compute it Node-side from the same sample config the
  // prototype flow serves.
  const sampleGame = games.find((game) => game.id === "madrona-music-2026");
  const contentFingerprint = computeContentFingerprint(sampleGame!);

  await page.goto("/event/first-sample/game", { waitUntil: "networkidle" });
  await page.evaluate((fingerprint) => {
    window.localStorage.setItem(
      "neighborly.local-session.v1",
      "prototype-session-e2e",
    );
    window.localStorage.setItem(
      "neighborly.game-session.v1.madrona-music-2026",
      JSON.stringify({
        clientSessionId: "prototype-session-e2e",
        savedAt: new Date().toISOString(),
        snapshot: {
          answers: {},
          completionRequestId: "req-e2e-restored",
          contentFingerprint: fingerprint,
          durationMs: 1234,
          kind: "submitting",
        },
      }),
    );
  }, contentFingerprint);

  await page.reload({ waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Show this screen at the volunteer table" }),
  ).toBeVisible();
  await expect(page.locator(".token-block strong")).not.toHaveText("Loading...");
});

test("resumes an in-progress run after a reload", async ({ page }) => {
  await page.goto("/event/first-sample/game", { waitUntil: "networkidle" });
  await activate(page.getByRole("button", { exact: true, name: "Start game" }));
  await clickOptionAndSubmit(page, "Hi Spot Cafe");
  await expect(
    page.getByRole("heading", {
      name: "What kind of experience should this game feel like?",
    }),
  ).toBeVisible();

  await page.reload({ waitUntil: "networkidle" });

  // The run resumes at the question the attendee left, not the intro screen.
  await expect(
    page.getByRole("heading", {
      name: "What kind of experience should this game feel like?",
    }),
  ).toBeVisible();

  // Back navigation still has the earlier answer selected and submittable.
  await activate(
    page.getByRole("button", { exact: true, name: "Back to the previous question" }),
  );
  await expect(
    page.getByRole("heading", {
      name: "Which local spot is sponsoring this neighborhood music series question?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Submit answer" }),
  ).toBeEnabled();
});

test("shows the not-found fallback for invalid routes and missing game slugs", async ({ page }) => {
  await page.goto("/not-a-route", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "That page isn't available in this demo." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to Neighborly Events" })).toBeVisible();

  await page.goto("/event/not-a-real-sample/game", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "This game isn't available right now." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Go to Neighborly Events" })).toBeVisible();
});

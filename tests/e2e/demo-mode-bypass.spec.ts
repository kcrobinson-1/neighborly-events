import { expect, test, type Page } from "@playwright/test";

const READ_DEMO_EVENT_PATH = "/functions/v1/read-demo-event";

const SAMPLE_ADMIN_PAYLOAD = {
  eventCode: "HAR",
  hasBeenPublished: true,
  id: "harvest-event-id",
  isLive: true,
  lastPublishedVersionNumber: 3,
  name: "Harvest Block Party",
  slug: "harvest-block-party",
  status: "live" as const,
  updatedAt: "2026-04-21T13:00:00.000Z",
};

const SAMPLE_REDEMPTION_ROWS = [
  {
    id: "row-2",
    redeemed_at: "2026-04-21T13:00:00.000Z",
    redemption_reversed_at: null,
    redemption_status: "redeemed" as const,
    verification_code: "HAR-0002",
  },
  {
    id: "row-1",
    redeemed_at: "2026-04-21T12:00:00.000Z",
    redemption_reversed_at: null,
    redemption_status: "redeemed" as const,
    verification_code: "HAR-0001",
  },
];

async function mockReadDemoEvent(page: Page) {
  await page.route(`**${READ_DEMO_EVENT_PATH}`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        body: "ok",
        headers: { "access-control-allow-origin": "*" },
        status: 200,
      });
      return;
    }

    const body = JSON.parse(route.request().postData() ?? "{}") as {
      slug?: string;
      surface?: "admin" | "redemptions";
    };

    if (!body.slug || !body.surface) {
      await route.fulfill({
        body: JSON.stringify({
          error: "invalid_request_body",
          message: "Demo-mode read requires slug + surface.",
        }),
        contentType: "application/json",
        status: 400,
      });
      return;
    }

    if (
      body.slug !== "harvest-block-party" && body.slug !== "riverside-jam"
    ) {
      await route.fulfill({
        body: JSON.stringify({
          error: "not_in_demo_allowlist",
          message: "Demo-mode reads are only available for test events.",
        }),
        contentType: "application/json",
        status: 403,
      });
      return;
    }

    if (body.surface === "admin") {
      await route.fulfill({
        body: JSON.stringify(SAMPLE_ADMIN_PAYLOAD),
        contentType: "application/json",
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({ rows: SAMPLE_REDEMPTION_ROWS }),
      contentType: "application/json",
      status: 200,
    });
  });
}

test.describe("demo-mode bypass — read side", () => {
  test("renders SignInForm on a non-test slug (bypass branch does not fire)", async ({
    page,
  }) => {
    await mockReadDemoEvent(page);
    await page.goto("/event/madrona-launch-day/admin", {
      waitUntil: "networkidle",
    });

    await expect(
      page.getByRole("heading", { name: "Sign in to manage this event" }),
    ).toBeVisible();
    await expect(page.getByRole("note")).toHaveCount(0);
    await expect(
      page.getByText(/Demo mode\./, { exact: false }),
    ).toHaveCount(0);
  });

  test("renders the demo-mode banner + admin variant on harvest-block-party/admin", async ({
    page,
  }) => {
    await mockReadDemoEvent(page);
    await page.goto("/event/harvest-block-party/admin", {
      waitUntil: "networkidle",
    });

    const banner = page.getByRole("note", { name: "Demo mode disclaimer" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Demo mode.");
    await expect(banner).toContainText("the event-authoring workspace");
    await expect(banner).toContainText("Harvest Block Party");
    await expect(banner).toContainText("read-only");

    await expect(
      page.getByRole("heading", { name: "Harvest Block Party" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sign in to manage this event" }),
    ).toHaveCount(0);

    // Mutation controls absent on the bypass-rendered admin surface.
    await expect(page.getByRole("button", { name: /Save changes/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Publish draft/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Unpublish/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Save question changes/ }),
    ).toHaveCount(0);
  });

  test("renders the demo-mode banner + static redeem variant on riverside-jam/game/redeem", async ({
    page,
  }) => {
    await mockReadDemoEvent(page);
    await page.goto("/event/riverside-jam/game/redeem", {
      waitUntil: "networkidle",
    });

    const banner = page.getByRole("note", { name: "Demo mode disclaimer" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("the redemption booth");
    await expect(banner).toContainText("Riverside Jam");

    await expect(
      page.getByRole("heading", {
        name: "Redemption codes are read-only in demo mode.",
      }),
    ).toBeVisible();

    // Mutation controls absent on the bypass-rendered redeem surface.
    // The keypad submit, the keypad digit affordances, and the verify button
    // are all absent because DemoModeRedeemView renders no input UI.
    await expect(page.getByRole("button", { name: /Submit code/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Verify/ })).toHaveCount(0);
  });

  test("renders the demo-mode banner + redemptions variant on harvest-block-party/game/redemptions", async ({
    page,
  }) => {
    await mockReadDemoEvent(page);
    await page.goto("/event/harvest-block-party/game/redemptions", {
      waitUntil: "networkidle",
    });

    const banner = page.getByRole("note", { name: "Demo mode disclaimer" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("redemption monitoring");
    await expect(banner).toContainText("Harvest Block Party");

    await expect(page.getByText("HAR-0001")).toBeVisible();
    await expect(page.getByText("HAR-0002")).toBeVisible();

    // Mutation controls absent on the bypass-rendered redemptions surface.
    // The detail-sheet "View" buttons, "Reverse this redemption" affordance,
    // and the filter bar are all absent because DemoModeRedemptionsView
    // renders a presentation-only list.
    await expect(
      page.getByRole("button", { name: /Reverse this redemption/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Confirm reversal/ }),
    ).toHaveCount(0);
  });
});

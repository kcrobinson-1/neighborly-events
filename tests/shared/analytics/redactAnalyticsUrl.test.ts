import { describe, expect, it } from "vitest";

import {
  redactAnalyticsEvent,
  redactAnalyticsUrl,
} from "../../../shared/analytics/index.ts";

describe("redactAnalyticsUrl", () => {
  it("drops the fragment that carries Supabase auth credentials", () => {
    // The concrete leak this exists to close: Supabase delivers the
    // organizer sign-in tokens to /auth/callback in the fragment, and
    // the vendor beacon reports location.href verbatim.
    expect(
      redactAnalyticsUrl(
        "https://music.madrona.us/auth/callback?next=%2Fadmin" +
          "#access_token=eyJhbGciOi&refresh_token=v1-abc&token_type=bearer",
      ),
    ).toBe("https://music.madrona.us/auth/callback?next=%2Fadmin");
  });

  it("keeps the query string so inbound utm dimensions survive", () => {
    // Stripping the query would delete the campaign data the whole
    // instrumentation exists to collect.
    const url =
      "https://music.madrona.us/event/madrona?utm_source=qr&utm_medium=poster";

    expect(redactAnalyticsUrl(url)).toBe(url);
  });

  it("returns a fragmentless url unchanged", () => {
    expect(redactAnalyticsUrl("https://music.madrona.us/event/madrona/game"))
      .toBe("https://music.madrona.us/event/madrona/game");
  });

  it("drops an empty fragment along with its delimiter", () => {
    expect(redactAnalyticsUrl("https://music.madrona.us/event/madrona#")).toBe(
      "https://music.madrona.us/event/madrona",
    );
  });

  it("keeps only the first fragment delimiter's prefix", () => {
    expect(redactAnalyticsUrl("https://example.test/a#b#c")).toBe(
      "https://example.test/a",
    );
  });

  it("does not throw on input that is not a parseable url", () => {
    // It runs inside a vendor callback on the attendee's device, so a
    // surprising value has to degrade to "no redaction", never to a
    // throw out of the beacon path.
    expect(redactAnalyticsUrl("")).toBe("");
    expect(redactAnalyticsUrl("not a url at all")).toBe("not a url at all");
  });
});

describe("redactAnalyticsEvent", () => {
  it("redacts the url and passes every other field through", () => {
    // Returning the event (not null) is what keeps the pageview; a
    // beforeSend that dropped events would silently zero the dataset.
    expect(
      redactAnalyticsEvent({
        type: "pageview",
        url: "https://music.madrona.us/auth/callback#access_token=secret",
        payload: { referrer: "https://example.test" },
      }),
    ).toEqual({
      type: "pageview",
      url: "https://music.madrona.us/auth/callback",
      payload: { referrer: "https://example.test" },
    });
  });

  it("does not mutate the event it is handed", () => {
    const event = { type: "pageview", url: "https://example.test/a#b" };

    redactAnalyticsEvent(event);

    expect(event.url).toBe("https://example.test/a#b");
  });
});

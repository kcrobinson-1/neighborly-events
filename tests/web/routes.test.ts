import { describe, expect, it } from "vitest";
import {
  matchAdminEventPath,
  matchEventRedeemPath,
  matchEventRedemptionsPath,
  matchGamePath,
  routes,
} from "../../apps/web/src/routes";

describe("admin event routes", () => {
  it("builds and parses one selected admin event path", () => {
    const path = routes.adminEvent("madrona-music-2026");

    expect(path).toBe("/admin/events/madrona-music-2026");
    expect(matchAdminEventPath(path)).toEqual({
      eventId: "madrona-music-2026",
    });
  });

  it("rejects malformed admin event paths", () => {
    expect(matchAdminEventPath("/admin/events")).toBeNull();
    expect(matchAdminEventPath("/admin/events/")).toBeNull();
    expect(matchAdminEventPath("/admin/events/event-id/extra")).toBeNull();
    expect(matchAdminEventPath("/admin/events/event%2Fid")).toBeNull();
  });
});

describe("game routes", () => {
  it("builds and parses one attendee game path", () => {
    const path = routes.game("madrona-music-2026");

    expect(path).toBe("/event/madrona-music-2026/game");
    expect(matchGamePath(path)).toEqual({
      slug: "madrona-music-2026",
    });
  });

  it("rejects malformed and legacy game paths", () => {
    expect(matchGamePath("/game/madrona-music-2026")).toBeNull();
    expect(matchGamePath("/event/madrona-music-2026")).toBeNull();
    expect(matchGamePath("/event/madrona-music-2026/game/extra")).toBeNull();
    expect(matchGamePath("/event/event%2Fid/game")).toBeNull();
  });
});

describe("redeem routes", () => {
  it("builds and parses one event redeem path", () => {
    const path = routes.eventRedeem("madrona music 2026");

    expect(path).toBe("/event/madrona%20music%202026/redeem");
    expect(matchEventRedeemPath(path)).toEqual({
      slug: "madrona music 2026",
    });
  });

  it("rejects malformed and non-redeem paths", () => {
    expect(matchEventRedeemPath("/event/madrona-music-2026")).toBeNull();
    expect(matchEventRedeemPath("/event/madrona-music-2026/game")).toBeNull();
    expect(matchEventRedeemPath("/event/madrona-music-2026/redeem/extra")).toBeNull();
    expect(matchEventRedeemPath("/event/event%2Fid/redeem")).toBeNull();
  });

  it("does not match the monitoring path", () => {
    expect(
      matchEventRedeemPath("/event/madrona-music-2026/redemptions"),
    ).toBeNull();
  });
});

describe("redemptions monitoring routes", () => {
  it("builds and parses one event redemptions path", () => {
    const path = routes.eventRedemptions("madrona music 2026");

    expect(path).toBe("/event/madrona%20music%202026/redemptions");
    expect(matchEventRedemptionsPath(path)).toEqual({
      slug: "madrona music 2026",
    });
  });

  it("rejects malformed and non-monitoring paths", () => {
    expect(
      matchEventRedemptionsPath("/event/madrona-music-2026"),
    ).toBeNull();
    expect(
      matchEventRedemptionsPath("/event/madrona-music-2026/game"),
    ).toBeNull();
    expect(
      matchEventRedemptionsPath("/event/madrona-music-2026/redeem"),
    ).toBeNull();
    expect(
      matchEventRedemptionsPath(
        "/event/madrona-music-2026/redemptions/extra",
      ),
    ).toBeNull();
    expect(
      matchEventRedemptionsPath("/event/event%2Fid/redemptions"),
    ).toBeNull();
  });
});

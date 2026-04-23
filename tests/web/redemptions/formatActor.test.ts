import { describe, expect, it } from "vitest";
import { formatActor } from "../../../apps/web/src/redemptions/formatActor";

describe("formatActor", () => {
  it("renders 'You (agent)' when a self-match carries the agent role", () => {
    expect(
      formatActor({ by: "user-a", currentUserId: "user-a", role: "agent" }),
    ).toBe("You (agent)");
  });

  it("renders 'You (organizer)' when a self-match carries the organizer role", () => {
    expect(
      formatActor({ by: "user-a", currentUserId: "user-a", role: "organizer" }),
    ).toBe("You (organizer)");
  });

  it("renders 'You (root admin)' when a self-match carries the root_admin role", () => {
    expect(
      formatActor({
        by: "user-a",
        currentUserId: "user-a",
        role: "root_admin",
      }),
    ).toBe("You (root admin)");
  });

  it("renders 'Agent' when another user performed the action", () => {
    expect(
      formatActor({ by: "user-b", currentUserId: "user-a", role: "agent" }),
    ).toBe("Agent");
  });

  it("renders 'Organizer' for a non-self organizer", () => {
    expect(
      formatActor({ by: "user-b", currentUserId: "user-a", role: "organizer" }),
    ).toBe("Organizer");
  });

  it("renders 'Root admin' for a non-self root admin", () => {
    expect(
      formatActor({
        by: "user-b",
        currentUserId: "user-a",
        role: "root_admin",
      }),
    ).toBe("Root admin");
  });

  it("renders 'Unknown' when both actor id and role are null", () => {
    expect(
      formatActor({ by: null, currentUserId: "user-a", role: null }),
    ).toBe("Unknown");
  });

  it("falls back to the role label when the actor id is null", () => {
    expect(
      formatActor({ by: null, currentUserId: "user-a", role: "agent" }),
    ).toBe("Agent");
  });

  it("does not render self when currentUserId is null, even if by matches some id", () => {
    expect(
      formatActor({ by: "user-a", currentUserId: null, role: "agent" }),
    ).toBe("Agent");
  });
});

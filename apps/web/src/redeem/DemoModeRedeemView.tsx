/**
 * Read-only redeem variant rendered on the bypass-rendered surface.
 *
 * The redeem surface needs zero read paths
 * (`m3-phase-3-1-plan.md` Contracts item 4: redeem authorize reads
 * `game_events`, which is anon-allowed for published events; the
 * keypad submit is the only stateful path and is a write that 3.3
 * rejects). The variant therefore renders a static keypad-shell hint
 * with no input affordance.
 */
export function DemoModeRedeemView() {
  return (
    <div className="signin-stack demo-mode-stack">
      <div className="section-heading">
        <h2>Redemption codes are read-only in demo mode.</h2>
      </div>
      <p>
        Redemption submission is disabled while you&apos;re browsing
        without signing in. A signed-in volunteer or organizer using
        this booth would enter a verification code on a numeric keypad
        and submit it to mark the entitlement redeemed.
      </p>
    </div>
  );
}

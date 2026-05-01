/**
 * Banner shown above the hero when `EventContent.testEvent` is true.
 * The banner lives inside `<ThemeScope>` but its CSS rule
 * (`.test-event-disclaimer` in globals.css) opts out of themable
 * surface tokens explicitly so it reads as a platform-status banner
 * across every per-event Theme.
 */
export function TestEventDisclaimer() {
  return (
    <aside
      className="test-event-disclaimer"
      role="note"
      aria-label="Demo event disclaimer"
    >
      <strong>Demo event for platform testing.</strong>{" "}
      <span>Not a real public event.</span>
    </aside>
  );
}

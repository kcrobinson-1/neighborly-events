/**
 * Home-page hero. Internal-partner-honest framing: explanation-first
 * lead followed by a what-is-real / what-is-stubbed caveat that
 * walks the demo-expansion epic's `Internal-partner audience`
 * invariant. No marketing-style aspirational copy.
 *
 * Server-rendered, no props (copy is hardcoded at this iteration —
 * a future copy CMS or content module is out of scope for M2).
 */
export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <p className="home-hero-eyebrow">Internal demo</p>
      <h1 id="home-hero-title" className="home-hero-title">
        Neighborly Events
      </h1>
      <p className="home-hero-lead">
        A platform for sponsor-friendly neighborhood event games.
        The two test events below preview the rendering surfaces,
        attendee gameplay, and admin authoring on real backends.
      </p>
      <p className="home-hero-honesty">
        <strong>What&rsquo;s real at this iteration:</strong>{" "}
        rendered event landings, two registered Themes, the
        authenticated admin workspace, and the attendee + volunteer
        gameplay shells.{" "}
        <strong>What&rsquo;s still stubbed:</strong> live attendees,
        production sponsors, and demo-mode access on the auth-gated
        surfaces (sign-in required until that bypass ships).
      </p>
    </section>
  );
}

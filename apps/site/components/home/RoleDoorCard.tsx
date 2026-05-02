/**
 * One persona card inside the home-page role-doors section. Outer
 * element is a single plain `<a href>` (not `<Link>`) because the
 * three call-site `href` values resolve to apps/web routes behind
 * the Vercel rewrite layer — soft client-side navigation would keep
 * the user inside apps/site and never re-enter the proxy. Same
 * cross-app hard-navigation precedent as
 * `apps/site/components/event/EventCTA.tsx`.
 *
 * Optional `authCaveat` is rendered as a `<p>` inside the card when
 * present and omitted entirely when absent. Attendee invocations
 * pass none; Organizer + Volunteer invocations pass one naming the
 * magic-link sign-in requirement and the M3-bypass-pending state.
 *
 * Brand-bearing surfaces (top border accent, link affordance, eyebrow,
 * focus outline) read brand bases (`--primary`, `--secondary`,
 * `--accent`); derived shades are not used per the apps/site brand-
 * token discipline.
 */
export function RoleDoorCard({
  eyebrow,
  title,
  description,
  href,
  authCaveat,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  authCaveat?: string;
}) {
  return (
    <a className="home-roles-card" href={href}>
      <p className="home-roles-card-eyebrow">{eyebrow}</p>
      <h3 className="home-roles-card-title">{title}</h3>
      <p className="home-roles-card-description">{description}</p>
      {authCaveat ? (
        <p className="home-roles-card-caveat">{authCaveat}</p>
      ) : null}
      <span className="home-roles-card-link" aria-hidden="true">
        Open &rarr;
      </span>
    </a>
  );
}

import type { EventContent } from "../../lib/eventContent.ts";

type Sponsor = EventContent["sponsors"][number];

/**
 * Groups sponsors by `tier`. Returns the sponsors flat (single
 * group with `tier: undefined`) when no sponsor sets a `tier`;
 * otherwise returns one group per tier preserving the order tiers
 * first appear in the source list.
 */
function groupSponsorsByTier(
  sponsors: ReadonlyArray<Sponsor>,
): Array<{ tier: string | null; sponsors: ReadonlyArray<Sponsor> }> {
  const anyTiered = sponsors.some((sponsor) => Boolean(sponsor.tier));

  if (!anyTiered) {
    return [{ tier: null, sponsors }];
  }

  const groups = new Map<string, Sponsor[]>();
  const order: string[] = [];

  for (const sponsor of sponsors) {
    const tier = sponsor.tier ?? "Other";
    if (!groups.has(tier)) {
      groups.set(tier, []);
      order.push(tier);
    }
    groups.get(tier)!.push(sponsor);
  }

  return order.map((tier) => ({ tier, sponsors: groups.get(tier)! }));
}

/**
 * Sponsor logo grid. Each sponsor is a link wrapping a plain `<img>`
 * — `next/image` is intentionally not used in 3.1.1 to keep static
 * asset handling simple; if M4 phase 4.2 needs `next/image` for
 * Madrona, the upgrade is local. If any sponsor sets a `tier`, the
 * grid groups by tier with `<h3>` headings; otherwise renders flat.
 * `logoAlt` is required by the `EventContent` contract so
 * accessibility cannot silently regress.
 */
export function EventSponsors({
  sponsors,
}: {
  sponsors: EventContent["sponsors"];
}) {
  const groups = groupSponsorsByTier(sponsors);

  return (
    <section
      className="event-sponsors"
      aria-labelledby="event-sponsors-heading"
    >
      <h2 id="event-sponsors-heading" className="event-section-heading">
        Sponsors
      </h2>
      {groups.map((group) => (
        <div key={group.tier ?? "__flat"} className="event-sponsors-group">
          {group.tier ? (
            <h3 className="event-sponsors-tier-heading">{group.tier}</h3>
          ) : null}
          <ul className="event-sponsors-grid">
            {group.sponsors.map((sponsor) => (
              <li key={sponsor.name} className="event-sponsors-item">
                <a
                  className="event-sponsors-link"
                  href={sponsor.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element --
                      Plain `<img>` is the deliberate choice for 3.1.1
                      per the M3 phase 3.1.1 plan; if M4 phase 4.2
                      needs `next/image` for Madrona, the upgrade is
                      local to this component. */}
                  <img
                    className="event-sponsors-logo"
                    src={sponsor.logoSrc}
                    alt={sponsor.logoAlt}
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

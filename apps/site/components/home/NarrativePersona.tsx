import type { ReactNode } from "react";

/**
 * One persona subsection inside the home-page Harvest narrative.
 * Iterated three times by `HarvestNarrative` (attendee, organizer,
 * volunteer) — same shape as `EventShowcaseCard` plays inside
 * `TwoEventShowcase`. Auth caveats live inline in the persona's
 * prose (`children`) per the plan's per-persona auth-honesty copy
 * contract; this component does not separate them out so caveat
 * phrasing reads as a clause of the action description, not a
 * hoisted note.
 */
export function NarrativePersona({
  eyebrow,
  heading,
  children,
}: {
  eyebrow: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <article className="narrative-persona">
      <p className="narrative-persona-eyebrow">{eyebrow}</p>
      <h3 className="narrative-persona-heading">{heading}</h3>
      <div className="narrative-persona-prose">{children}</div>
    </article>
  );
}

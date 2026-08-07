import type { ComponentType, ReactNode } from "react";

import type { EventMastheadContent } from "./mastheadContent.ts";

/**
 * Items that can carry the active-page underline. `donate` is
 * excluded (the pill is never an "active page") and the brand lockup
 * is the Home link, which has no underline state.
 */
export type EventMastheadActiveItem = "quiz" | "newsletter" | "feedback";

/** Props the injected link components must accept. */
export type EventMastheadLinkProps = {
  href: string;
  className: string;
  children: ReactNode;
  "aria-current"?: "page";
};

export type EventMastheadLinkComponent = ComponentType<EventMastheadLinkProps>;

/** Default renderer: a plain anchor (hard navigation). */
function PlainAnchor({
  href,
  className,
  children,
  "aria-current": ariaCurrent,
}: EventMastheadLinkProps) {
  return (
    <a className={className} href={href} aria-current={ariaCurrent}>
      {children}
    </a>
  );
}

/**
 * Shared sticky event header bar, rendered on every page of an event
 * that registers masthead content (`mastheadContent.ts`). App-agnostic
 * like `shared/auth/SignInForm.tsx` and `shared/styles/ThemeScope.tsx`:
 * no `'use client'`, no effects, no framework imports, so apps/site
 * can render it as a Server Component and apps/web can render it in
 * the Vite SPA. Styling is CSS-class-only (`event-masthead*`), colors
 * and faces flow from the per-event Theme's tokens (`--header-bg`,
 * `--header-fg`, `--accent`, `--font-heading`) via `<ThemeScope>`, so
 * the bar must render inside a themed scope.
 *
 * Layout (spec §3): the brand lockup IS the Home link — no separate
 * "Home" item — then Quiz, Newsletter, Feedback, and Donate as the
 * one visually distinct pill. `active` draws the gold underline on
 * the current page's item. At phone width the nav scrolls
 * horizontally rather than collapsing to a hamburger.
 *
 * Navigation mechanism is injected per link through `linkComponents`
 * because same-app vs cross-app differs by consumer: apps/site passes
 * `next/link` for its own routes (home, newsletter, feedback) and
 * leaves quiz on the default plain anchor so the hard load re-enters
 * the apps/web Vercel rewrite (the `EventHeader` hero-CTA rationale);
 * apps/web passes nothing and every link hard-navigates through the
 * proxy (the `completionCta` precedent). `donate` is not injectable:
 * always an external anchor with `target="_blank" rel="noopener"`,
 * matching `EventDonateCTA`.
 */
export function EventMasthead({
  masthead,
  active,
  linkComponents,
}: {
  masthead: EventMastheadContent;
  active?: EventMastheadActiveItem;
  linkComponents?: Partial<
    Record<"home" | EventMastheadActiveItem, EventMastheadLinkComponent>
  >;
}) {
  const HomeLink = linkComponents?.home ?? PlainAnchor;

  const navLinkClass = (item: EventMastheadActiveItem) =>
    item === active
      ? "event-masthead-link event-masthead-link-active"
      : "event-masthead-link";

  const navItems: EventMastheadActiveItem[] = [
    "quiz",
    "newsletter",
    "feedback",
  ];

  return (
    <header className="event-masthead">
      <HomeLink className="event-masthead-brand" href={masthead.brand.homeHref}>
        <span className="event-masthead-brand-name">{masthead.brand.name}</span>
        <span className="event-masthead-brand-tagline">
          {masthead.brand.tagline}
        </span>
      </HomeLink>
      <nav className="event-masthead-nav" aria-label="Event pages">
        {navItems.map((item) => {
          const NavLink = linkComponents?.[item] ?? PlainAnchor;
          return (
            <NavLink
              key={item}
              className={navLinkClass(item)}
              href={masthead[item].href}
              aria-current={item === active ? "page" : undefined}
            >
              {masthead[item].label}
            </NavLink>
          );
        })}
        <a
          className="event-masthead-link event-masthead-donate"
          href={masthead.donate.href}
          target="_blank"
          rel="noopener"
        >
          {masthead.donate.label}
        </a>
      </nav>
    </header>
  );
}

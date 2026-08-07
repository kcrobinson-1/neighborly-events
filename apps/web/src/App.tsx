import { lazy, type ReactNode, Suspense, useEffect } from "react";
import { EventAdminPage } from "./pages/EventAdminPage";
import { GameRoutePage } from "./pages/GameRoutePage";
import { LazyRouteErrorBoundary } from "./pages/LazyRouteErrorBoundary";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RouteStateShell } from "./pages/RouteStateShell";
import {
  matchEventAdminPath,
  matchGamePath,
  matchGameRedeemPath,
  matchGameRedemptionsPath,
  routes,
} from "../../../shared/urls";
import {
  EventMasthead,
  type EventMastheadActiveItem,
  type EventMastheadContent,
  getEventMasthead,
} from "../../../shared/masthead";
import { ThemeScope, getThemeForSlug } from "../../../shared/styles";
import { usePathnameNavigation } from "./usePathnameNavigation";

const EventRedeemPage = lazy(() =>
  import("./pages/EventRedeemPage").then((module) => ({
    default: module.EventRedeemPage,
  }))
);

const EventRedemptionsPage = lazy(() =>
  import("./pages/EventRedemptionsPage").then((module) => ({
    default: module.EventRedemptionsPage,
  }))
);

function LazyRouteFallback(
  { title, chip, body, onNavigate }: {
    body: string;
    chip: string;
    onNavigate: (path: string) => void;
    title: string;
  },
) {
  return (
    <RouteStateShell
      actions={
        <button className="secondary-button" disabled type="button">
          Loading...
        </button>
      }
      body={body}
      chip={chip}
      onNavigateHome={() => onNavigate(routes.home)}
      title={title}
    />
  );
}

/**
 * The shared sticky header bar to render above the shell, resolved
 * for the matched route: the event's registered content plus which
 * nav item this route is. Routes that carry no bar resolve `null`.
 */
type MastheadPlacement = {
  active: EventMastheadActiveItem;
  content: EventMastheadContent;
};

/**
 * Resolves the header bar for a route: present only when the event
 * registers masthead content (`shared/masthead/mastheadContent.ts`),
 * so unregistered events — every test event and demo fixture today —
 * render byte-identically to the pre-masthead output.
 */
function resolveMasthead(
  slug: string,
  active: EventMastheadActiveItem,
): MastheadPlacement | null {
  const content = getEventMasthead(slug);

  return content === null ? null : { active, content };
}

/**
 * A matched page, the event slug whose Theme should scope it, and the
 * header bar (if any) that belongs above it.
 */
type PageContent = {
  masthead: MastheadPlacement | null;
  node: ReactNode;
  themeSlug: string | null;
};

/** Resolves the pathname to the page component that should be rendered. */
function getPageContent(
  pathname: string,
  navigate: (path: string, options?: { replace?: boolean }) => void,
): PageContent {
  const matchedEventAdmin = matchEventAdminPath(pathname);

  if (matchedEventAdmin) {
    return {
      // Operator surface: the header bar is attendee chrome (Quiz,
      // Newsletter, Feedback, Donate) and does not belong on the
      // volunteer-facing routes, so admin / redeem / redemptions
      // resolve no masthead.
      masthead: null,
      node: (
        <EventAdminPage
          key={matchedEventAdmin.slug}
          onNavigate={navigate}
          slug={matchedEventAdmin.slug}
        />
      ),
      themeSlug: matchedEventAdmin.slug,
    };
  }

  const matchedGame = matchGamePath(pathname);

  if (matchedGame) {
    return {
      // The quiz is apps/web's one attendee route, so it is the bar's
      // "Quiz" destination. Resolved from the path (not the loaded
      // game config) so the bar is already in place across the
      // route's loading / unavailable / error states.
      masthead: resolveMasthead(matchedGame.slug, "quiz"),
      node: (
        <GameRoutePage key={matchedGame.slug} onNavigate={navigate} slug={matchedGame.slug} />
      ),
      themeSlug: matchedGame.slug,
    };
  }

  const matchedRedeem = matchGameRedeemPath(pathname);

  if (matchedRedeem) {
    return {
      masthead: null,
      node: (
        <LazyRouteErrorBoundary
          body="We couldn't load the redeem surface. Reload to try again."
          chip="Redeem unavailable"
          onNavigateHome={() => navigate(routes.home)}
          title="Couldn't load this section"
        >
          <Suspense
            fallback={
              <LazyRouteFallback
                body="Loading the redeem surface for this event."
                chip="Loading redeem"
                onNavigate={navigate}
                title="Preparing redeem"
              />
            }
          >
            <EventRedeemPage
              key={matchedRedeem.slug}
              onNavigate={navigate}
              slug={matchedRedeem.slug}
            />
          </Suspense>
        </LazyRouteErrorBoundary>
      ),
      themeSlug: matchedRedeem.slug,
    };
  }

  const matchedRedemptions = matchGameRedemptionsPath(pathname);

  if (matchedRedemptions) {
    return {
      masthead: null,
      node: (
        <LazyRouteErrorBoundary
          body="We couldn't load the redemption monitoring surface. Reload to try again."
          chip="Redemptions unavailable"
          onNavigateHome={() => navigate(routes.home)}
          title="Couldn't load this section"
        >
          <Suspense
            fallback={
              <LazyRouteFallback
                body="Loading the redemption monitoring surface for this event."
                chip="Loading redemptions"
                onNavigate={navigate}
                title="Preparing redemptions"
              />
            }
          >
            <EventRedemptionsPage
              key={matchedRedemptions.slug}
              onNavigate={navigate}
              slug={matchedRedemptions.slug}
            />
          </Suspense>
        </LazyRouteErrorBoundary>
      ),
      themeSlug: matchedRedemptions.slug,
    };
  }

  return {
    masthead: null,
    node: <NotFoundPage onNavigate={navigate} />,
    themeSlug: null,
  };
}

/** Root application shell for the web prototype. */
function App() {
  const { pathname, navigate } = usePathnameNavigation();
  const { masthead, node, themeSlug } = getPageContent(pathname, navigate);
  const theme = themeSlug !== null ? getThemeForSlug(themeSlug) : null;
  const canvasBackground = theme?.bg ?? null;

  // The document canvas (elastic-overscroll area) is painted by
  // `body`, an ancestor of `<ThemeScope>`, so a Theme's tokens cannot
  // reach it through the cascade. Sync it imperatively with the
  // event's flat `bg` so overscroll matches the themed page tone;
  // clearing on unmatched routes falls back to the `:root` default.
  useEffect(() => {
    if (canvasBackground === null) {
      return;
    }

    document.body.style.background = canvasBackground;

    return () => {
      document.body.style.background = "";
    };
  }, [canvasBackground]);

  // `<ThemeScope>` wraps the `.site-shell` element (not just the page
  // content) so the shell's page-surface paint (`--page-surface` in
  // `_layout.scss`) resolves against the event's Theme. The wrapper
  // stays `display: contents` (`_layout.scss`), so shell layout is
  // unchanged. Unmatched routes render unscoped against the `:root`
  // defaults.
  //
  // The header bar is a sibling *above* the shell, inside the same
  // scope: it reads `--header-bg` / `--header-fg` / `--accent` /
  // `--font-heading` from the event's Theme, and sitting outside the
  // shell keeps it full-bleed and clear of the shell's padding and
  // `overflow-x: clip`. No `linkComponents` are injected — every
  // destination is site-owned and must hard-navigate through the
  // proxy origin rather than resolve inside this SPA (the
  // `completionCta` precedent), which the component's default plain
  // anchors already do.
  const page = (
    <>
      {masthead !== null ? (
        <EventMasthead active={masthead.active} masthead={masthead.content} />
      ) : null}
      <main className="site-shell">
        <section className="backdrop" aria-hidden="true" />
        {node}
      </main>
    </>
  );

  return theme !== null ? <ThemeScope theme={theme}>{page}</ThemeScope> : page;
}

export default App;

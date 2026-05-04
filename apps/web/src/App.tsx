import { lazy, type ReactNode, Suspense } from "react";
import { EventAdminPage } from "./pages/EventAdminPage";
import { GameRoutePage } from "./pages/GameRoutePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RouteStateShell } from "./pages/RouteStateShell";
import {
  matchEventAdminPath,
  matchGamePath,
  matchGameRedeemPath,
  matchGameRedemptionsPath,
  routes,
} from "../../../shared/urls";
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

/** Resolves the pathname to the page component that should be rendered. */
function getPageContent(
  pathname: string,
  navigate: (path: string, options?: { replace?: boolean }) => void,
): ReactNode {
  const matchedEventAdmin = matchEventAdminPath(pathname);

  if (matchedEventAdmin) {
    return (
      <ThemeScope theme={getThemeForSlug(matchedEventAdmin.slug)}>
        <EventAdminPage
          key={matchedEventAdmin.slug}
          onNavigate={navigate}
          slug={matchedEventAdmin.slug}
        />
      </ThemeScope>
    );
  }

  const matchedGame = matchGamePath(pathname);

  if (matchedGame) {
    return (
      <ThemeScope theme={getThemeForSlug(matchedGame.slug)}>
        <GameRoutePage key={matchedGame.slug} onNavigate={navigate} slug={matchedGame.slug} />
      </ThemeScope>
    );
  }

  const matchedRedeem = matchGameRedeemPath(pathname);

  if (matchedRedeem) {
    return (
      <ThemeScope theme={getThemeForSlug(matchedRedeem.slug)}>
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
      </ThemeScope>
    );
  }

  const matchedRedemptions = matchGameRedemptionsPath(pathname);

  if (matchedRedemptions) {
    return (
      <ThemeScope theme={getThemeForSlug(matchedRedemptions.slug)}>
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
      </ThemeScope>
    );
  }

  return <NotFoundPage onNavigate={navigate} />;
}

/** Root application shell for the web prototype. */
function App() {
  const { pathname, navigate } = usePathnameNavigation();
  const content = getPageContent(pathname, navigate);

  return (
    <main className="site-shell">
      <section className="backdrop" aria-hidden="true" />
      {content}
    </main>
  );
}

export default App;

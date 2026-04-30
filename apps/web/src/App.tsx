import type { ReactNode } from "react";
import { EventAdminPage } from "./pages/EventAdminPage";
import { EventRedeemPage } from "./pages/EventRedeemPage";
import { EventRedemptionsPage } from "./pages/EventRedemptionsPage";
import { GameRoutePage } from "./pages/GameRoutePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import {
  matchEventAdminPath,
  matchEventRedeemPath,
  matchEventRedemptionsPath,
  matchGamePath,
} from "../../../shared/urls";
import { ThemeScope, getThemeForSlug } from "../../../shared/styles";
import { usePathnameNavigation } from "./usePathnameNavigation";

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
    return <GameRoutePage key={matchedGame.slug} onNavigate={navigate} slug={matchedGame.slug} />;
  }

  const matchedRedeem = matchEventRedeemPath(pathname);

  if (matchedRedeem) {
    return (
      <EventRedeemPage
        key={matchedRedeem.slug}
        onNavigate={navigate}
        slug={matchedRedeem.slug}
      />
    );
  }

  const matchedRedemptions = matchEventRedemptionsPath(pathname);

  if (matchedRedemptions) {
    return (
      <EventRedemptionsPage
        key={matchedRedemptions.slug}
        onNavigate={navigate}
        slug={matchedRedemptions.slug}
      />
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

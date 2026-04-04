import type { ReactNode } from "react";
import { LandingPage } from "./pages/LandingPage";
import { getGameBySlug } from "./data/games";
import { GamePage } from "./pages/GamePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { matchGamePath, routes } from "./routes";
import { usePathnameNavigation } from "./usePathnameNavigation";

/** Resolves the pathname to the page component that should be rendered. */
function getPageContent(pathname: string, navigate: (path: string) => void): ReactNode {
  if (pathname === routes.home) {
    return <LandingPage onNavigate={navigate} />;
  }

  const matchedGame = matchGamePath(pathname);

  if (!matchedGame) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  const game = getGameBySlug(matchedGame.slug);

  return game ? (
    <GamePage game={game} key={game.id} onNavigate={navigate} />
  ) : (
    <NotFoundPage onNavigate={navigate} />
  );
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

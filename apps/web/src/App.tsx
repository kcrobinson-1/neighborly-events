import { LandingPage } from "./pages/LandingPage";
import { getGameBySlug } from "./data/games";
import { GamePage } from "./pages/GamePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { matchGamePath, routes } from "./routes";
import { usePathnameNavigation } from "./usePathnameNavigation";

function App() {
  const { pathname, navigate } = usePathnameNavigation();
  const matchedGame = matchGamePath(pathname);

  let content;

  if (pathname === routes.home) {
    content = <LandingPage onNavigate={navigate} />;
  } else if (matchedGame) {
    const game = getGameBySlug(matchedGame.slug);

    content = game ? (
      <GamePage game={game} onNavigate={navigate} />
    ) : (
      <NotFoundPage onNavigate={navigate} />
    );
  } else {
    content = <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <main className="site-shell">
      <section className="backdrop" aria-hidden="true" />
      {content}
    </main>
  );
}

export default App;

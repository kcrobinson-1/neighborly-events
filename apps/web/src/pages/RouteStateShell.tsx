import type { ReactNode } from "react";

type RouteStateShellProps = {
  actions: ReactNode;
  body: string;
  chip: string;
  onNavigateHome: () => void;
  title: string;
};

export function RouteStateShell(
  { title, body, actions, chip, onNavigateHome }: RouteStateShellProps,
) {
  return (
    <section className="game-layout">
      <nav className="sample-nav">
        <button
          className="text-link"
          onClick={onNavigateHome}
          type="button"
        >
          Back to Neighborly Events
        </button>
      </nav>

      <section className="app-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">Published event route</p>
            <h1>{title}</h1>
          </div>
        </header>
        <section className="panel">
          <span className="chip">{chip}</span>
          <p>{body}</p>
          <div className="not-found-actions">{actions}</div>
        </section>
      </section>
    </section>
  );
}

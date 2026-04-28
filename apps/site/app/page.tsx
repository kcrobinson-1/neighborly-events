export default function Home() {
  return (
    <main className="landing-shell">
      <section className="landing-intro" aria-labelledby="platform-title">
        <p className="eyebrow">Event platform</p>
        <h1 id="platform-title">Neighborly Events</h1>
        <p className="landing-copy">
          Build and run sponsor-friendly neighborhood event games from one
          shared platform.
        </p>
        <a className="primary-cta" href="/admin">
          Open admin workspace
        </a>
      </section>
    </main>
  );
}

/**
 * URL redaction applied to every Vercel Web Analytics beacon, in both
 * apps, via the `<Analytics beforeSend>` hook.
 *
 * The vendor's client script reports `location.href` verbatim — search
 * string *and* fragment — as the pageview's URL. The search string has
 * to survive: inbound `utm_*` parameters are how the QR-code and
 * outbound-link campaigns become breakdown dimensions, and stripping
 * the query would delete the campaign data this instrumentation exists
 * to collect.
 *
 * The fragment must not. Supabase delivers organizer sign-in
 * credentials to `/auth/callback` in the URL fragment
 * (`#access_token=…&refresh_token=…`); the browser never sends a
 * fragment to a server, but a client-side beacon reading
 * `location.href` would, which turns the analytics dataset into a
 * second home for a live refresh token. No surface on either app needs
 * fragment data in a pageview, so the whole fragment is dropped rather
 * than any particular parameter allow-listed — an allow-list would have
 * to be revisited every time an auth or routing library changes what it
 * puts there, and would fail silently when it wasn't.
 *
 * Deliberately a string operation and not a `URL` parse: this runs on
 * the attendee's device inside a vendor callback, and the failure
 * priority here is that a malformed or unexpected URL must not throw
 * out of the beacon path. `indexOf` cannot.
 */
export function redactAnalyticsUrl(url: string): string {
  const fragmentStart = url.indexOf("#");

  return fragmentStart === -1 ? url : url.slice(0, fragmentStart);
}

/**
 * The `beforeSend` hook both apps pass to `<Analytics />`, applying
 * `redactAnalyticsUrl` to the event's URL and passing everything else
 * through.
 *
 * Structurally typed rather than importing the vendor's
 * `BeforeSendEvent`, which keeps `shared/` free of a dependency only
 * the two app-level mount points have.
 *
 * A module-scope function, not an inline arrow at each call site: the
 * vendor re-registers the handler whenever the prop's identity changes,
 * and one shared stable reference makes that a non-question in both
 * apps. It also means the two apps cannot drift into redacting
 * differently, which would matter — they report into one dataset, so a
 * row has to mean the same thing whichever app produced it.
 */
export function redactAnalyticsEvent<Event extends { url: string }>(
  event: Event,
): Event {
  return { ...event, url: redactAnalyticsUrl(event.url) };
}

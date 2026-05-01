import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Fraunces, Inter } from "next/font/google";

import { platformTheme, themeToStyle } from "../../../shared/styles";

import "./globals.css";

/**
 * Inter (body) and Fraunces (heading) loaded as variable fonts via
 * `next/font` with build-time download. The `variable` option
 * exposes the CSS custom property names the platform Sage Civic
 * Theme references (`var(--font-inter)`, `var(--font-fraunces)` —
 * see [`shared/styles/themes/platform.ts`](../../../shared/styles/themes/platform.ts)).
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

/**
 * Resolves the canonical user-facing origin used as `metadataBase`.
 *
 * On Vercel `production` and `preview` builds the env var **must** be
 * set explicitly — both deploy types serve URLs that get unfurled and
 * indexed, and silently shipping the dev fallback would emit broken
 * `og:url` / `og:image` / `twitter:image` meta tags. We fail the
 * build instead, surfacing the misconfiguration immediately rather
 * than at the next post-deploy unfurl. Local `next dev`, local
 * `next build`, and non-Vercel CI builds (where `VERCEL_ENV` is
 * unset) fall through to a localhost dev origin so the build stays
 * green for contributors.
 *
 * Auto-derivation from `VERCEL_URL` was rejected at scoping time
 * (see `docs/plans/scoping/m3-phase-3-1-2.md` "metadataBase source"):
 * apps/site sits behind apps/web's Vercel rewrite, so `VERCEL_URL`
 * resolves to apps/site's hostname rather than apps/web's canonical
 * user-facing origin. The env var must be operator-set to apps/web's
 * primary alias.
 *
 * The env var reads through `next.config.ts`'s `env` block (the
 * Turbopack substitution-trap workaround the Supabase pair also
 * follows). The `||` fallback (not `??`) is deliberate: the `env`
 * block substitutes `""` when the parent env is unset, and `??` does
 * not short-circuit on empty string, so `?? "fallback"` would let
 * `new URL("")` throw with an unhelpful generic error instead of the
 * named one below.
 */
function resolveMetadataBaseOrigin(): string {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (origin) return origin;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production" || vercelEnv === "preview") {
    throw new Error(
      `NEXT_PUBLIC_SITE_ORIGIN must be set on Vercel ${vercelEnv} ` +
        `builds. Set it to apps/web's canonical custom-domain origin ` +
        `per docs/dev.md "apps/site environment variables." Falling ` +
        `back to a dev origin would silently ship broken Open Graph ` +
        `URLs to every consumer client.`,
    );
  }
  return "http://localhost:3000";
}

/**
 * `metadataBase` is the canonical user-facing origin all URL-based
 * metadata fields (`og:image`, `og:url`, `twitter:image`) resolve
 * relative paths against. It is set **once** at the root layout per
 * Next.js' segment-cascade — adding it to a child route's
 * `generateMetadata` would shadow this value and break the
 * single-source-of-truth assumption the OG image pipeline depends on.
 */
export const metadata: Metadata = {
  title: "Neighborly Events",
  metadataBase: new URL(resolveMetadataBaseOrigin()),
};

/**
 * Root layout — emits the Sage Civic platform Theme as inline-style
 * CSS custom properties on `<html>`, alongside `next/font`'s CSS
 * variable wiring via `className`. Routes outside `/event/:slug/*`
 * render against these defaults; M3 phase 3.1 wraps event landing
 * in `<ThemeScope>` to layer per-event Themes on top.
 *
 * apps/site is **not** a `<ThemeScope>` site at the root level per
 * the parent epic's "Theme route scoping" invariant — `<ThemeScope>`
 * is only used inside `/event/:slug/*` namespaces, and the root
 * layout sets the platform palette directly so routes that have
 * not yet wrapped (in 1.5.2, all of them) still render with Sage
 * Civic identity.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      style={themeToStyle(platformTheme) as CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}

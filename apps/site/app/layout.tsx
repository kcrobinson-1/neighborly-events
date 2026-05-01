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
 * - **Local dev / non-Vercel CI** (`VERCEL_ENV` unset): falls back
 *   to `http://localhost:3000` so contributor builds stay green.
 * - **Vercel production**: the env var **must** be operator-set to
 *   apps/web's canonical custom-domain origin. We throw at build
 *   time when it's missing so a misconfigured deploy can't silently
 *   ship localhost-shaped meta tags. Auto-derivation from `VERCEL_URL`
 *   was rejected at scoping time (`docs/plans/scoping/m3-phase-3-1-2.md`
 *   "metadataBase source") because apps/site sits behind apps/web's
 *   Vercel rewrite — `VERCEL_URL` resolves to apps/site's own hostname,
 *   not apps/web's canonical user-facing origin.
 * - **Vercel preview**: prefers the env var when set, otherwise
 *   derives from apps/site's own `VERCEL_BRANCH_URL` (or
 *   `VERCEL_URL`). The `VERCEL_URL`-rejection rationale above only
 *   applies to *production*, where the canonical origin is
 *   apps/web's. For preview, apps/web's per-branch alias isn't
 *   knowable from inside apps/site's build, so apps/site's own
 *   per-branch URL is the right pragmatic shape — the PR's preview
 *   unfurls render the PR's content (bypassing the apps/web rewrite
 *   layer that only matters for production user traffic). Operator
 *   can still pin a preview origin explicitly via the env var if
 *   they need to.
 *
 * The env var reads through `next.config.ts`'s `env` block (the
 * Turbopack substitution-trap workaround the Supabase pair also
 * follows). The `||` fallbacks (not `??`) are deliberate: the `env`
 * block substitutes `""` when the parent env is unset, and `??`
 * does not short-circuit on empty string.
 */
function resolveMetadataBaseOrigin(): string {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (origin) return origin;

  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === "production") {
    throw new Error(
      `NEXT_PUBLIC_SITE_ORIGIN must be set on Vercel production ` +
        `builds. Set it to apps/web's canonical custom-domain origin ` +
        `per docs/dev.md "apps/site environment variables." Falling ` +
        `back to a dev origin would silently ship broken Open Graph ` +
        `URLs to every consumer client.`,
    );
  }

  if (vercelEnv === "preview") {
    const branchUrl =
      process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
    if (branchUrl) return `https://${branchUrl}`;
    throw new Error(
      `NEXT_PUBLIC_SITE_ORIGIN is unset on a Vercel preview build ` +
        `and neither VERCEL_BRANCH_URL nor VERCEL_URL is available ` +
        `to derive a metadataBase origin from. Set ` +
        `NEXT_PUBLIC_SITE_ORIGIN explicitly on the apps/site Vercel ` +
        `project's Preview environment, or restore Vercel's ` +
        `system-injected URL vars.`,
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

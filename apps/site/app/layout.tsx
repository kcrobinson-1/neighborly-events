import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Fraunces, Inter } from "next/font/google";

import { platformTheme, themeToStyle } from "../../../shared/styles";
import { AnalyticsMount } from "../components/AnalyticsMount.tsx";

import "./globals.scss";

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
 * `NEXT_PUBLIC_SITE_ORIGIN` names the canonical user-facing site
 * origin. apps/site is the canonical project per the canonical-origin
 * topology (see [`docs/plans/canonical-origin-resolution.md`](../../../docs/plans/canonical-origin-resolution.md)),
 * so the env var resolves to apps/site's primary alias on production
 * and to apps/site's own per-branch alias on preview.
 *
 * - **Local dev / non-Vercel CI** (`VERCEL_ENV` unset): falls back
 *   to `http://localhost:3000` so contributor builds stay green.
 * - **Vercel production**: the env var **must** be operator-set to
 *   apps/site's primary Vercel alias (or, when a platform-owned
 *   custom domain ever materializes, that domain). We throw at build
 *   time when it's missing so a misconfigured deploy can't silently
 *   ship localhost-shaped meta tags.
 * - **Vercel preview**: prefers the env var when set, otherwise
 *   derives from apps/site's own `VERCEL_BRANCH_URL` (or
 *   `VERCEL_URL`). Operator can still pin a preview origin
 *   explicitly via the env var if they need to.
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
        `builds. Set it to apps/site's primary Vercel alias ` +
        `(the canonical user-facing site origin) per docs/dev.md ` +
        `"apps/site environment variables." Falling back to a dev ` +
        `origin would silently ship broken Open Graph URLs to every ` +
        `consumer client.`,
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
 *
 * `<AnalyticsMount />` sits last in `<body>` and renders no DOM: it is
 * the Vercel Web Analytics beacon for every apps/site route. Placed
 * here rather than per-route because pageview coverage is a property
 * of the origin, not of any one page.
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
      <body>
        {children}
        <AnalyticsMount />
      </body>
    </html>
  );
}

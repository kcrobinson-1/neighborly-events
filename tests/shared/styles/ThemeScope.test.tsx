import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ThemeScope } from "../../../shared/styles/ThemeScope.tsx";
import type { Theme } from "../../../shared/styles/types.ts";

afterEach(cleanup);

const baseSyntheticTheme: Theme = {
  bg: "#aaa",
  surface: "#bbb",
  surfaceStrong: "#ccc",
  surfaceCard: "#ddd",
  surfaceCardMuted: "#eee",
  text: "#111",
  muted: "#222",
  border: "#333",
  borderSoft: "#444",
  borderMuted: "#555",
  primary: "#666",
  secondary: "#777",
  accent: "#888",
  whiteWarm: "#999",
  whitePanel: "#aab",
  whiteTint: "#bbc",
  pageGradientStart: "#abc",
  pageGradientEnd: "#bcd",
  heroStart: "#cde",
  heroEnd: "#def",
  adminInputSurface: "#012",
  draftRowSurface: "#123",
  bodyFontFamily: "TestBody, sans-serif",
  headingFontFamily: "TestHeading, serif",
  panelRadius: "10px",
  panelRadiusMobile: "9px",
  cardRadius: "8px",
  controlRadius: "6px",
};

describe("ThemeScope", () => {
  it("emits every Theme field as a CSS custom property on the wrapper", () => {
    render(
      <ThemeScope theme={baseSyntheticTheme}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    expect(wrapper).not.toBeNull();
    if (!wrapper) throw new Error("wrapper missing");

    const style = wrapper.getAttribute("style") ?? "";
    // Spot-check one custom property per Theme field group; the
    // mapping is data-driven in `themeToStyle`, so a single emission
    // failure would surface across the group rather than at a single
    // field. The first name in each pair is the Theme field, the
    // second is the CSS custom property name.
    expect(style).toContain("--bg: #aaa");
    expect(style).toContain("--surface-card-muted: #eee");
    expect(style).toContain("--text: #111");
    expect(style).toContain("--border-muted: #555");
    expect(style).toContain("--primary: #666");
    expect(style).toContain("--accent: #888");
    expect(style).toContain("--white-tint: #bbc");
    expect(style).toContain("--page-gradient-end: #bcd");
    expect(style).toContain("--hero-start: #cde");
    expect(style).toContain("--admin-input-surface: #012");
    expect(style).toContain("--draft-row-surface: #123");
    expect(style).toContain("--font-body: TestBody, sans-serif");
    expect(style).toContain("--font-heading: TestHeading, serif");
    expect(style).toContain("--radius-panel: 10px");
    expect(style).toContain("--radius-panel-mobile: 9px");
    expect(style).toContain("--radius-card: 8px");
    expect(style).toContain("--radius-control: 6px");
  });

  it("emits derived shades as resolved-hex color-mix literals on the wrapper", () => {
    render(
      <ThemeScope theme={baseSyntheticTheme}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    const style = wrapper.getAttribute("style") ?? "";

    // Each derived shade must bake the resolved brand-base hex into
    // the color-mix() expression so descendants inherit a literal
    // string with no var() reference (the `:root`-pinning trap that
    // motivated this emission). One spot-check per brand-base group
    // plus the two text-derived shades; the derivation table is
    // data-driven, so a single emission failure surfaces across
    // the group.
    expect(style).toContain(
      "--primary-surface: color-mix(in srgb, #666 12%, transparent)",
    );
    expect(style).toContain(
      "--secondary-focus: color-mix(in srgb, #777 42%, transparent)",
    );
    expect(style).toContain(
      "--accent-glow: color-mix(in srgb, #888 28%, transparent)",
    );
    expect(style).toContain(
      "--text-disabled-surface: color-mix(in srgb, #111 18%, transparent)",
    );
    expect(style).toContain(
      "--grid-line: color-mix(in srgb, #111 4%, transparent)",
    );
  });

  it("derives optional brand fields from required fields when omitted", () => {
    // `baseSyntheticTheme` omits every optional field, so the
    // emission must carry the documented defaults (`docs/styling.md`
    // "Optional brand fields"): headerBg→primary, headerFg→whiteWarm,
    // surfaceBand→surfaceCardMuted, accentFontFamily→bodyFontFamily,
    // accentGarnish→secondary.
    render(
      <ThemeScope theme={baseSyntheticTheme}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    const style = wrapper.getAttribute("style") ?? "";

    expect(style).toContain("--header-bg: #666");
    expect(style).toContain("--header-fg: #999");
    expect(style).toContain("--surface-band: #eee");
    expect(style).toContain("--font-accent: TestBody, sans-serif");
    expect(style).toContain("--accent-garnish: #777");
  });

  it("emits optional brand fields verbatim when the theme provides them", () => {
    const themed: Theme = {
      ...baseSyntheticTheme,
      headerBg: "#141",
      headerFg: "#f0f0e0",
      surfaceBand: "#e5d5a5",
      accentFontFamily: "TestAccent, cursive",
      accentGarnish: "#a52f24",
    };
    render(
      <ThemeScope theme={themed}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    const style = wrapper.getAttribute("style") ?? "";

    expect(style).toContain("--header-bg: #141");
    expect(style).toContain("--header-fg: #f0f0e0");
    expect(style).toContain("--surface-band: #e5d5a5");
    expect(style).toContain("--font-accent: TestAccent, cursive");
    expect(style).toContain("--accent-garnish: #a52f24");
  });

  it("derives quiz-surface vocabulary defaults from required fields when omitted", () => {
    // `baseSyntheticTheme` omits every quiz-surface field (Madrona
    // redesign R4), so the emission must reproduce the pre-extension
    // rendering: the layered page recipe, panel chrome from
    // surface/border plus the structural shadow, no page-head band,
    // option chrome from border and the secondary derived shades,
    // the success/secondary code-block recipe, secondary CTA pair
    // (warm pair matching the base pair), and text-colored sponsor
    // label.
    render(
      <ThemeScope theme={baseSyntheticTheme}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    const style = wrapper.getAttribute("style") ?? "";

    expect(style).toContain(
      "--page-surface: radial-gradient(circle at top left, color-mix(in srgb, #888 28%, transparent), transparent 30%), " +
        "radial-gradient(circle at top right, color-mix(in srgb, #777 22%, transparent), transparent 32%), " +
        "linear-gradient(180deg, #abc 0%, #aaa 48%, #bcd 100%)",
    );
    expect(style).toContain("--panel-surface: #bbb");
    expect(style).toContain("--panel-border: 1px solid #333");
    expect(style).toContain("--panel-shadow: 0 24px 60px rgba(42, 42, 42, 0.12)");
    expect(style).toContain("--page-head-surface: transparent");
    expect(style).toContain("--page-head-rule: none");
    expect(style).toContain("--page-head-margin: 0");
    expect(style).toContain("--page-head-padding: 0");
    expect(style).toContain("--option-border: 1px solid #333");
    expect(style).toContain(
      "--option-selected-border-color: color-mix(in srgb, #777 56%, transparent)",
    );
    expect(style).toContain(
      "--option-selected-surface: color-mix(in srgb, #777 18%, transparent)",
    );
    expect(style).toContain(
      "--code-surface: linear-gradient(135deg, rgba(63, 143, 90, 0.16), color-mix(in srgb, #777 10%, transparent)), #bbc",
    );
    expect(style).toContain("--code-border: 1px solid rgba(63, 143, 90, 0.18)");
    expect(style).toContain(
      "--cta-surface: color-mix(in srgb, #777 14%, transparent)",
    );
    expect(style).toContain("--cta-fg: #777");
    expect(style).toContain(
      "--cta-warm-surface: color-mix(in srgb, #777 14%, transparent)",
    );
    expect(style).toContain("--cta-warm-fg: #777");
    expect(style).toContain("--sponsor-label: #111");

    // Emitted only when set — an unconditional default would defeat
    // the per-call-site `var(--…, fallback)` fallbacks.
    expect(style).not.toContain("--page-head-title-size");
    expect(style).not.toContain("--heading-letter-spacing");
  });

  it("emits quiz-surface vocabulary verbatim when the theme provides it", () => {
    const themed: Theme = {
      ...baseSyntheticTheme,
      pageSurface: "#f8e9c8",
      gridLine: "transparent",
      panelSurface: "transparent",
      panelBorder: "none",
      panelShadow: "none",
      pageHeadSurface: "#f1dfb8",
      pageHeadRule: "3px solid #d9a62b",
      pageHeadPosture: "band",
      pageHeadTitleSize: "2rem",
      headingLetterSpacing: "0.06em",
      optionBorder: "2.5px solid #8b8b2e",
      optionSelectedBorderColor: "#2e4a34",
      optionSelectedSurface: "#ede3c2",
      codeSurface: "#f1dfb8",
      codeBorder: "2.5px solid #d9a62b",
      ctaSurface: "#d9a62b",
      ctaFg: "#2e4a34",
      ctaWarmSurface: "#d9822b",
      ctaWarmFg: "#fffdf2",
      sponsorLabel: "#6b4e8e",
    };
    render(
      <ThemeScope theme={themed}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    const style = wrapper.getAttribute("style") ?? "";

    expect(style).toContain("--page-surface: #f8e9c8");
    expect(style).toContain("--grid-line: transparent");
    expect(style).toContain("--panel-surface: transparent");
    expect(style).toContain("--panel-border: none");
    expect(style).toContain("--panel-shadow: none");
    expect(style).toContain("--page-head-surface: #f1dfb8");
    expect(style).toContain("--page-head-rule: 3px solid #d9a62b");
    // The bounded band posture expands to the structural full-bleed
    // margin and band padding owned by `themeToStyle.ts`.
    expect(style).toContain("--page-head-margin: 0 calc(50% - 50vw)");
    expect(style).toContain("--page-head-padding: 18px");
    expect(style).toContain("--page-head-title-size: 2rem");
    expect(style).toContain("--heading-letter-spacing: 0.06em");
    expect(style).toContain("--option-border: 2.5px solid #8b8b2e");
    expect(style).toContain("--option-selected-border-color: #2e4a34");
    expect(style).toContain("--option-selected-surface: #ede3c2");
    expect(style).toContain("--code-surface: #f1dfb8");
    expect(style).toContain("--code-border: 2.5px solid #d9a62b");
    expect(style).toContain("--cta-surface: #d9a62b");
    expect(style).toContain("--cta-fg: #2e4a34");
    expect(style).toContain("--cta-warm-surface: #d9822b");
    expect(style).toContain("--cta-warm-fg: #fffdf2");
    expect(style).toContain("--sponsor-label: #6b4e8e");
  });

  it("nested ThemeScope wrappers override outer values for descendants", () => {
    const outerTheme: Theme = { ...baseSyntheticTheme, primary: "#aaa111" };
    const innerTheme: Theme = { ...baseSyntheticTheme, primary: "#bbb222" };

    render(
      <ThemeScope theme={outerTheme}>
        <span data-testid="outer-child">outer</span>
        <ThemeScope theme={innerTheme}>
          <span data-testid="inner-child">inner</span>
        </ThemeScope>
      </ThemeScope>,
    );

    const outerWrapper = screen.getByTestId("outer-child").parentElement;
    const innerWrapper = screen.getByTestId("inner-child").parentElement;
    if (!outerWrapper || !innerWrapper) throw new Error("wrapper missing");

    expect(outerWrapper.getAttribute("style")).toContain("--primary: #aaa111");
    expect(innerWrapper.getAttribute("style")).toContain("--primary: #bbb222");
    // The inner wrapper is a descendant of the outer, so the cascade
    // resolves --primary to #bbb222 inside it (CSS does this at
    // render time; we assert the inline-style boundary above).
    expect(outerWrapper.contains(innerWrapper)).toBe(true);
  });

  it("renders a div with class 'theme-scope' for SCSS layout targeting", () => {
    render(
      <ThemeScope theme={baseSyntheticTheme}>
        <span data-testid="child">x</span>
      </ThemeScope>,
    );
    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.className).toBe("theme-scope");
  });
});

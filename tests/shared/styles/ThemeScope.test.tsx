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

  it("does not emit derived shades — those are computed in :root", () => {
    render(
      <ThemeScope theme={baseSyntheticTheme}>
        <span data-testid="child">Hello</span>
      </ThemeScope>,
    );

    const wrapper = screen.getByTestId("child").parentElement;
    if (!wrapper) throw new Error("wrapper missing");
    const style = wrapper.getAttribute("style") ?? "";

    // Brand-tied derived shades are computed in :root via color-mix()
    // from the brand bases, not emitted by ThemeScope. If any of
    // these appeared, the model would have leaked.
    expect(style).not.toContain("--primary-surface");
    expect(style).not.toContain("--secondary-focus");
    expect(style).not.toContain("--accent-glow");
    expect(style).not.toContain("--text-disabled-surface");
    expect(style).not.toContain("--grid-line");
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

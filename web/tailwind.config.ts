/**
 * Tailwind configuration.
 *
 * The colour scale is expressed as CSS custom properties rather than literal
 * values, because `FRONTEND_SPEC.md` §1.2 composes the palette in OKLCH and
 * forbids hardcoded hex or raw oklch in component files. Components reference
 * `bg-[var(--bg-primary)]`; Tailwind only needs to know not to purge them, which
 * the `safelist` below handles.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Every colour in the system arrives through a CSS variable, so nothing needs
  // to be registered as a Tailwind colour. This keeps the two systems from
  // drifting apart.
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      transitionTimingFunction: {
        sluice: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      maxWidth: {
        "7xl": "80rem",
      },
      zIndex: {
        video: "0",
        scrim: "2",
        grain: "3",
        content: "10",
        raised: "20",
        drawer: "40",
        "drawer-scrim": "45",
        nav: "50",
        dropdown: "100",
        modal: "400",
        toast: "500",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "fade-down": "fade-down 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

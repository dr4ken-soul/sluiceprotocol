'use client';

/**
 * The scroll-morph navigation shell.
 *
 * Gate 2: an A2 scroll-morph pill combined with a B1 scroll-progress line. The nav
 * is transparent at the top and gains a surface and blur past 80px, with a 1px
 * border providing separation rather than a box shadow.
 *
 * Backdrop blur is applied only because this element is `position: fixed`. It must
 * never be applied to an element inside a scrolling container, where it repaints
 * every frame.
 */

import { motion, useScroll, useSpring } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "./useSession";
import { ConnectButton } from "./ConnectModal";
import { WalletPill } from "./WalletPill";


/** Centre links. Hidden below `md`, where the hamburger takes over. */
const LINKS = [
  { href: "/#mechanism", label: "Mechanism", section: "Mechanism" },
  { href: "/#marketplace", label: "Marketplace", section: "Marketplace" },
  { href: "/#adjudication", label: "Adjudication", section: "Adjudication" },
  { href: "/#compliance", label: "Compliance", section: "Compliance" },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const pathname = usePathname();
  const session = useSession();

  const { scrollY, scrollYProgress } = useScroll();
  // A spring on the progress line so it does not judder on a trackpad.
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  useEffect(() => {
    // `scrollY` is a MotionValue, so its current value is read from a subscription
    // rather than compared directly. Reading `.get()` inside the handler keeps this
    // to one listener rather than one per rendered frame.
    const unsubscribe = scrollY.on("change", (value) => setScrolled(value > 80));
    setScrolled(scrollY.get() > 80);
    return unsubscribe;
  }, [scrollY]);

  // The section name beside the progress line, from the nearest
  // `section[data-section-name]` above the fold.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("section[data-section-name]"),
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible !== undefined) {
          setSection(visible.target.getAttribute("data-section-name"));
        }
      },
      // A band across the middle of the viewport, so the reported section is the one
      // being read rather than the one merely touching an edge.
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const element of sections) observer.observe(element);
    return () => observer.disconnect();
  }, [pathname]);

  // Escape closes the mobile overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isApp = pathname.startsWith("/app");

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-nav transition-all duration-200 ${
          scrolled
            ? "border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 py-3 backdrop-blur-xl"
            : "border-b border-transparent py-5"
        }`}
        style={{ transitionTimingFunction: "var(--ease-sluice)" }}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-10"
        >
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]"
          >
            Sluice
            {/* Logo slot: replace with public/logo.svg once provided */}
          </Link>

          {!isApp ? (
            <div className="hidden items-center gap-1 md:flex">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={section === link.section ? "true" : undefined}
                  className={`relative rounded-full px-3.5 py-2 font-body text-sm transition-colors duration-200 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] ${
                    section === link.section
                      ? "font-medium text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {link.label}
                  {/* The active state carries a dot as well as a weight shift, because
                      a colour change alone is not a sufficient active state. */}
                  {section === link.section ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                    />
                  ) : null}
                </a>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            {scrolled && section !== null && !isApp ? (
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] lg:inline">
                {section}
              </span>
            ) : null}

            {session.authenticated ? (
              <WalletPill />
            ) : (
              <ConnectButton />
            )}

            {!isApp ? (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close menu" : "Open menu"}
                className="flex h-11 w-11 items-center justify-center md:hidden"
              >
                <span className="relative block h-3.5 w-5">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className="absolute left-0 block h-px w-full bg-[var(--text-primary)] transition-transform duration-300"
                      style={{
                        top: index * 6,
                        transform: open
                          ? index === 0
                            ? "translateY(6px) rotate(45deg)"
                            : index === 2
                              ? "translateY(-6px) rotate(-45deg)"
                              : "none"
                          : "none",
                        opacity: open && index === 1 ? 0 : 1,
                        transitionTimingFunction: "var(--ease-sluice)",
                      }}
                    />
                  ))}
                </span>
              </button>
            ) : null}
          </div>
        </nav>

        {/* B1 progress line. Absolute, hairline, accent, origin left. */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-px w-full origin-left bg-[var(--accent)]"
          style={{ scaleX: progress }}
        />
      </header>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-[45] bg-[var(--bg-primary)]/98 backdrop-blur-sm md:hidden"
          style={{ animation: "fade-down 300ms var(--ease-sluice)" }}
        >
          <div className="flex flex-col gap-6 px-8 pt-28">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-display text-3xl text-[var(--text-primary)]"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="font-display text-3xl text-[var(--text-muted)]"
            >
              Terminal
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

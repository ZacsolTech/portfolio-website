"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { isNavActive, mainNav } from "@/lib/nav";

export function SiteHeader() {
  const pathname = usePathname();
  const sheetId = useId();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navPath, setNavPath] = useState(pathname);

  if (navPath !== pathname) {
    setNavPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.classList.remove("nav-open");
      return;
    }

    document.body.classList.add("nav-open");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("nav-open");
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <div className="nav-wrap">
        <nav className={scrolled ? "nav is-scrolled" : "nav"} aria-label="Primary">
          <Logo priority />
          <div className="nav__links">
            {mainNav.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-nav={item.id}
                  className={active ? "nav__link nav__link--active" : "nav__link"}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="nav__end">
            <ThemeToggle />
            <Link href="/book" className="btn btn--gold nav__cta">
              Book a consultation
            </Link>
            <button
              type="button"
              className="burger"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls={sheetId}
              onClick={() => setOpen((value) => !value)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </nav>
      </div>

      <div
        className={open ? "nav-sheet is-open" : "nav-sheet"}
        id={sheetId}
        aria-hidden={!open}
      >
        <div className="nav-sheet__backdrop" onClick={close} />
        <div className="nav-sheet__panel" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="nav-sheet__head">
            <Logo onDark />
            <button
              type="button"
              className="nav-sheet__close"
              aria-label="Close menu"
              onClick={close}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav className="nav-sheet__links" aria-label="Mobile">
            {mainNav.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-nav={item.id}
                  className={
                    active ? "nav-sheet__link nav-sheet__link--active" : "nav-sheet__link"
                  }
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="nav-sheet__foot">
            <Link href="/consultant" className="btn btn--gold" onClick={close}>
              Ask ZAC
            </Link>
            <Link href="/book" className="btn btn--outline-dark" onClick={close}>
              Book a consultation
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

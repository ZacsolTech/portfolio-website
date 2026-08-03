import type { ReactNode } from "react";
import Link from "next/link";

export type PageHeroCta = {
  href: string;
  label: string;
  variant?: "gold" | "outline-dark" | "ink" | "ghost";
};

export type PageHeroCrumb = {
  href?: string;
  label: string;
};

type PageHeroProps = {
  overline: string;
  title: ReactNode;
  lead?: ReactNode;
  ctas?: PageHeroCta[];
  breadcrumbs?: PageHeroCrumb[];
  children?: ReactNode;
};

function ctaClassName(variant: PageHeroCta["variant"] = "gold"): string {
  switch (variant) {
    case "outline-dark":
      return "btn btn--outline-dark";
    case "ink":
      return "btn btn--ink";
    case "ghost":
      return "btn btn--ghost";
    default:
      return "btn btn--gold";
  }
}

export function PageHero({
  overline,
  title,
  lead,
  ctas,
  breadcrumbs,
  children,
}: PageHeroProps) {
  return (
    <header className="page-hero on-dark section--persist">
      <div
        className="blob blob--gold"
        style={{ width: "22rem", height: "22rem", top: "-6rem", right: "-6rem" }}
      />
      <div className="container">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="page-hero__crumbs" aria-label="Breadcrumb">
            <ol>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`}>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href}>{crumb.label}</Link>
                    ) : (
                      <span aria-current={isLast ? "page" : undefined}>{crumb.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <span className="overline overline--gold">{overline}</span>
        <h1 className="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
          {title}
        </h1>
        {lead ? (
          <p className="lead" style={{ marginTop: "1.25rem", color: "var(--text-on-dark-body)" }}>
            {lead}
          </p>
        ) : null}

        {ctas && ctas.length > 0 ? (
          <div className="btn-row">
            {ctas.map((cta) => (
              <Link
                key={`${cta.href}-${cta.label}`}
                href={cta.href}
                className={ctaClassName(cta.variant)}
              >
                {cta.label}
              </Link>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </header>
  );
}

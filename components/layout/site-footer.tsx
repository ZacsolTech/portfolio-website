import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { services, site } from "@/lib/content";
import { zac } from "@/lib/content/zac";

const serviceLinks = services.map((s) => ({
  href: `/services/${s.slug}`,
  label: s.shortTitle,
}));

const aiToolLinks = [
  { href: "/consultant", label: zac.consultant.name },
  { href: "/tools/estimator", label: zac.estimator.name },
] as const;

const companyLinks = [
  { href: "/about", label: "About us" },
  { href: "/industries", label: "Industries" },
  { href: "/portfolio", label: "Projects" },
  { href: "/insights", label: "Insights" },
  { href: "/book", label: "Book a consultation" },
  { href: "/contact", label: "Contact" },
] as const;

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;

export function SiteFooter() {
  return (
    <footer className="footer on-dark">
      <div className="container">
        {/* Posts to /api/subscribe → `subscribers` collection. */}
        <div className="newsletter">
          <div className="grid-a grid-a--even" style={{ gap: "1.5rem" }}>
            <div>
              <h3 className="d4" style={{ color: "#fff" }}>
                Automation teardowns, written by the people who build them.
              </h3>
              <p
                className="body-sm"
                style={{ margin: "0.5rem 0 0", color: "var(--text-on-dark-body)" }}
              >
                Short, practical writing on AI, automation and shipping software. No sales
                sequences.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </div>

        <div className="footer__grid">
          <div>
            <Logo onDark />
            <p
              className="body-sm"
              style={{
                marginTop: "1rem",
                maxWidth: "20rem",
                color: "var(--text-on-dark-body)",
              }}
            >
              {site.description}
            </p>
            <p
              className="body-sm"
              style={{ marginTop: "0.75rem", color: "var(--text-on-dark-body)" }}
            >
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
            <div className="socials">
              <a
                href={site.social?.linkedin ?? "https://www.linkedin.com/"}
                aria-label="ZACSOL on LinkedIn"
                target="_blank"
                rel="noopener noreferrer me"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                  <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.2 8.4h4.6V24H.2Zm7.7 0h4.4v2.1h.06c.6-1.1 2.1-2.3 4.3-2.3 4.6 0 5.4 3 5.4 6.9V24h-4.6v-7.9c0-1.9 0-4.3-2.6-4.3s-3 2-3 4.1V24H7.9Z" />
                </svg>
              </a>
              <a
                href={site.social?.github ?? "https://github.com/"}
                aria-label="ZACSOL on GitHub"
                target="_blank"
                rel="noopener noreferrer me"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                  <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.9 10.9c.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.6 4.8 18.6 5.1 18.6 5.1c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <div className="footer__title">Services</div>
            <ul>
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="footer__title">ZAC tools</div>
            <ul>
              {aiToolLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="footer__title">Company</div>
            <ul>
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="footer__title">Legal</div>
            <ul>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* "All systems operational" was hardcoded — a status light that can
            never report a problem. Replaced with a claim that is always true. */}
        <div className="footer__bottom">
          <span>{site.copyright}</span>
          <span className="footer__note">{site.timezoneNote}</span>
        </div>
      </div>
    </footer>
  );
}

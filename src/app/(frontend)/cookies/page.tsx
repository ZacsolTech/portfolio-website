import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie notice",
  description: `How ${site.name} uses cookies and similar technologies.`,
  path: "/cookies",
});

const UPDATED = "27 August 2026";

export default function CookiesPage() {
  return (
    <section className="section section--paper section--after-nav">
      <div className="container">
        <article className="legal">
          <span className="overline">Legal</span>
          <h1 className="d2" style={{ marginTop: "0.75rem" }}>
            Cookie notice
          </h1>
          <p className="legal__meta">Last updated · {UPDATED}</p>

          <p>
            This notice explains how {site.legalName} (&quot;{site.name}&quot;) uses cookies and
            similar technologies on {site.domain}.
          </p>

          <h2>What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device. We also use local storage and similar
            mechanisms (together, &quot;cookies&quot; in this notice) for theme preference and
            essential site functions.
          </p>

          <h2>Essential cookies</h2>
          <p>These are required for the site to work. They do not require consent in most jurisdictions.</p>
          <ul>
            <li>
              <strong>Theme preference</strong> — remembers light or dark mode (
              <code>zacsol-theme</code> in local storage).
            </li>
            <li>
              <strong>Security / rate limiting</strong> — may set short-lived identifiers to protect
              AI tools and forms from abuse.
            </li>
            <li>
              <strong>Session continuity</strong> — keeps multi-step tool flows coherent while you
              complete them.
            </li>
          </ul>

          <h2>Analytics</h2>
          <p>
            We may use privacy-conscious analytics to understand which pages and journeys work. Where
            analytics cookies are not strictly necessary, we will obtain consent before setting them,
            or use cookieless / aggregated modes where available.
          </p>

          <h2>Advertising</h2>
          <p>
            When Google AdSense is enabled on this site, Google may set advertising cookies on blog
            pages to serve, measure and (where permitted) personalise ads. These are not essential.
            You can block them in your browser, use Google&apos;s ad settings at{" "}
            <a href="https://adssettings.google.com/" rel="noopener noreferrer" target="_blank">
              adssettings.google.com
            </a>
            , or use a content blocker. Blocking ads does not affect the consultant, estimator or
            contact forms.
          </p>

          <h2>Marketing</h2>
          <p>
            We do not run separate marketing pixels for retargeting beyond AdSense where that is
            enabled. If that changes, we will update this notice and request consent where required.
          </p>

          <h2>Managing cookies</h2>
          <p>
            You can clear local storage and cookies in your browser settings. Blocking essential
            storage may break theme persistence or tool flows. Browser controls vary — check your
            browser&apos;s help pages.
          </p>

          <h2>Updates</h2>
          <p>
            We may revise this notice when our practices change. Check the &quot;Last updated&quot;
            date above.
          </p>

          <h2>More information</h2>
          <p>
            See our <Link href="/privacy">privacy policy</Link> for how we handle personal data, or
            email <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
        </article>
      </div>
    </section>
  );
}

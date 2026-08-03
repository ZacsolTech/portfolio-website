import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects personal data.`,
  path: "/privacy",
});

const UPDATED = "2 August 2026";

export default function PrivacyPage() {
  return (
    <section className="section section--paper" style={{ paddingBlockStart: "8rem" }}>
      <div className="container">
        <article className="legal">
          <span className="overline">Legal</span>
          <h1 className="d2" style={{ marginTop: "0.75rem" }}>
            Privacy policy
          </h1>
          <p className="legal__meta">Last updated · {UPDATED}</p>

          <p>
            This policy explains how {site.legalName} (&quot;{site.name}&quot;, &quot;we&quot;,
            &quot;us&quot;) handles personal information when you use {site.domain}, our AI tools,
            contact forms and booking flows. Email is our sole outbound contact channel at launch.
          </p>

          <h2>Who we are</h2>
          <p>
            Controller: {site.legalName}. Contact:{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a>.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Contact details</strong> you submit — name, email, optional phone, company
              context and message content.
            </li>
            <li>
              <strong>Tool inputs</strong> — problem descriptions, answers and selections in the AI
              consultant and cost estimator.
            </li>
            <li>
              <strong>Technical data</strong> — IP address, browser type, pages viewed, referrer and
              approximate location derived from IP, used for security, rate limiting and analytics.
            </li>
            <li>
              <strong>Consent records</strong> — timestamps and scope of email marketing or enquiry
              follow-up consent where you opt in.
            </li>
          </ul>

          <h2>Why we use it</h2>
          <ul>
            <li>To respond to enquiries and deliver roadmaps or estimates by email.</li>
            <li>To schedule consultations and send calendar-related confirmations.</li>
            <li>To improve our products, prompts and site performance (aggregated where possible).</li>
            <li>To prevent abuse, enforce rate limits and keep systems secure.</li>
            <li>To send newsletter content only if you subscribe — you can unsubscribe any time.</li>
          </ul>

          <h2>Legal bases</h2>
          <p>
            Where GDPR or similar laws apply, we rely on: (a) performance of a request you initiate
            (enquiry, booking, tool delivery); (b) legitimate interests in operating a secure site and
            improving our services; and (c) consent where we ask for it (e.g. newsletter).
          </p>

          <h2>Sharing</h2>
          <p>
            We use processors for hosting, email delivery, analytics and CRM. They act on our
            instructions and may not use your data for their own marketing. We do not sell personal
            data. We may disclose information if required by law or to protect rights and safety.
          </p>

          <h2>Retention</h2>
          <p>
            Enquiry and lead records are kept while an active conversation or project exists, then
            for a reasonable period for audit and dispute resolution (typically up to 24 months
            unless a longer period is required). You may request earlier deletion subject to legal
            holds.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on your location, you may request access, correction, deletion, restriction,
            portability or objection. Email {site.email} with &quot;Privacy request&quot; in the
            subject. You may also lodge a complaint with your local supervisory authority.
          </p>

          <h2>International transfers</h2>
          <p>
            Our team and providers may process data in countries other than yours. Where required, we
            use appropriate safeguards (e.g. standard contractual clauses).
          </p>

          <h2>Children</h2>
          <p>
            Our services are directed at businesses and professionals. We do not knowingly collect
            data from children under 16.
          </p>

          <h2>Changes</h2>
          <p>
            We may update this policy. The &quot;Last updated&quot; date above will change when we
            do. Material changes will be highlighted on this page.
          </p>

          <h2>Related</h2>
          <p>
            See also our <Link href="/terms">terms of use</Link> and{" "}
            <Link href="/cookies">cookie notice</Link>.
          </p>
        </article>
      </div>
    </section>
  );
}

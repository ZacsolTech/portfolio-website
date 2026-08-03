import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of use",
  description: `Terms governing use of the ${site.name} website and free AI tools.`,
  path: "/terms",
});

const UPDATED = "2 August 2026";

export default function TermsPage() {
  return (
    <section className="section section--paper" style={{ paddingBlockStart: "8rem" }}>
      <div className="container">
        <article className="legal">
          <span className="overline">Legal</span>
          <h1 className="d2" style={{ marginTop: "0.75rem" }}>
            Terms of use
          </h1>
          <p className="legal__meta">Last updated · {UPDATED}</p>

          <p>
            These terms govern your use of {site.domain} and related free tools operated by{" "}
            {site.legalName} (&quot;{site.name}&quot;). By using the site you agree to them. Paid
            project work is governed by a separate statement of work or master services agreement.
          </p>

          <h2>The site and tools</h2>
          <p>
            Content, demos and AI tools (consultant and cost estimator) are provided for
            informational and evaluation purposes. Outputs are indicative — not proposals,
            warranties or professional advice. Confirmed scope, timeline and pricing follow a
            discovery engagement.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Do not attempt to disrupt, scrape at abusive rates, or reverse-engineer the tools.</li>
            <li>Do not submit unlawful, harmful or confidential third-party data without authority.</li>
            <li>Do not use the tools to generate spam, malware instructions or deceptive content.</li>
            <li>We may rate-limit, suspend or block access to protect the service and other users.</li>
          </ul>

          <h2>Accounts and leads</h2>
          <p>
            When you submit contact details, you confirm they are accurate and that you are
            authorised to provide them. You agree we may email you about your enquiry and related
            follow-ups as described in our <Link href="/privacy">privacy policy</Link>.
          </p>

          <h2>Intellectual property</h2>
          <p>
            Site design, copy, logos and software (excluding third-party marks and open-source
            components) belong to {site.name} or its licensors. You may not copy the site for
            commercial reuse without written permission. Client project IP is handled in project
            contracts — typically you own deliverables upon payment.
          </p>

          <h2>Third-party links</h2>
          <p>
            Links to external sites are for convenience. We are not responsible for their content or
            practices.
          </p>

          <h2>Disclaimer</h2>
          <p>
            The site and free tools are provided &quot;as is&quot; without warranties of any kind,
            express or implied, including merchantability, fitness for a particular purpose and
            non-infringement. We do not warrant uninterrupted or error-free operation.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, {site.name} is not liable for indirect,
            incidental, special, consequential or punitive damages, or loss of profits, data or
            goodwill, arising from use of the site or free tools. Our aggregate liability for site
            use claims is limited to USD 100 or the amount you paid us for site-related services in
            the prior 12 months, whichever is greater. This does not limit liability that cannot be
            excluded by law.
          </p>

          <h2>Indemnity</h2>
          <p>
            You agree to indemnify {site.name} against claims arising from your misuse of the site,
            your submitted content, or your breach of these terms.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms. Continued use after the updated date constitutes acceptance.
            Material changes will be noted via the &quot;Last updated&quot; line.
          </p>

          <h2>Governing law</h2>
          <p>
            These terms are governed by the laws applicable to {site.legalName}&apos;s principal
            place of business, without regard to conflict-of-law rules. Courts there have exclusive
            jurisdiction, except where consumer protections require otherwise.
          </p>

          <h2>Contact</h2>
          <p>
            Questions: <a href={`mailto:${site.email}`}>{site.email}</a>. See also{" "}
            <Link href="/privacy">privacy</Link> and <Link href="/cookies">cookies</Link>.
          </p>
        </article>
      </div>
    </section>
  );
}

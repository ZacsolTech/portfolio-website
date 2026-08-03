import { FinalCta } from "@/components/layout/final-cta";
import {
  Hero,
  LogoMarquee,
  Services,
  ConsultantFeature,
  Toolkit,
  Leaks,
  Fixes,
  Portfolio,
  Industries,
  Results,
  Faq,
} from "@/components/home";
import { site } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
  path: "/",
  absolute: true,
  keywords: site.keywords,
});

/**
 * 2026 agency homepage — tease + convert, don't duplicate depth.
 * Full process / stack / contact live on /about, /services, /contact, /book.
 *
 * Two decisions this file owns:
 *
 * 1. Narrative. Problem (Leaks) → fix (Fixes) → capability (Services) →
 *    differentiator (ZAC) → proof (Portfolio, Results). The page used to open
 *    with the solution and reach the problem in position six, and buried both
 *    proof sections below the fold everyone stops at.
 *
 * 2. Rhythm. Every third band is `ink`, and `ink` persists in both themes.
 *    Previously every mid-page section resolved to paper in light theme —
 *    seven consecutive bands within 2% luminance of each other.
 */
export default function HomePage() {
  return (
    <>
      {/* dark */}
      <Hero />
      <LogoMarquee surface="paper" />

      {/* dark */}
      <Leaks surface="ink" />
      <Fixes surface="paper" />
      <Services surface="paper-alt" />

      {/* dark */}
      <ConsultantFeature surface="ink" />
      <Toolkit surface="paper" />
      <Portfolio surface="paper-alt" />

      {/* dark */}
      <Results surface="ink" />
      <Industries surface="paper" />
      <Faq surface="paper-alt" />

      {/* dark */}
      <FinalCta surface="ink" />
    </>
  );
}

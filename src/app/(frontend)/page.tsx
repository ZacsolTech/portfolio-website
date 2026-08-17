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
  Faq,
} from "@/components/home";
import { ReviewsSlider } from "@/components/shared/reviews-slider";
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
 * Homepage — tease + convert, don't duplicate depth.
 *
 * Narrative: Problem (Leaks) → fix (Fixes) → capability (Services) →
 * differentiator (ZAC) → proof (Portfolio, Reviews).
 *
 * Rhythm: every third band is `ink`, and `ink` persists in both themes.
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
      <ReviewsSlider surface="ink" />
      <Industries surface="paper" />
      <Faq surface="paper-alt" />

      {/* dark */}
      <FinalCta surface="ink" />
    </>
  );
}

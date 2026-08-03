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
 * Full process / stack / FAQ / contact live on /about, /services, /contact, /book.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoMarquee />
      <Services />
      <ConsultantFeature />
      <Toolkit />
      <Leaks />
      <Fixes />
      <Portfolio />
      <Industries />
      <Results />
      <FinalCta />
    </>
  );
}

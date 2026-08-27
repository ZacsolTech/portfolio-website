import { industries, services, site, zac } from "@/lib/content";
import { BLOG_PATH, blogPath } from "@/lib/blog";
import { getPublishedPosts } from "@/lib/blog/store";
import { absoluteUrl } from "@/lib/seo";

/**
 * `/llms.txt` — a map of the site written for an assistant rather than a
 * crawler.
 *
 * Answer engines that cite sources do better with a curated index than with a
 * sitemap: a sitemap says which URLs exist, this says what each one is for and
 * which claims the site is willing to stand behind. It costs one small file and
 * it is the difference between being summarised and being cited.
 *
 * Kept generated rather than hand-written so it cannot drift from the content
 * modules the pages themselves render from.
 */

export const revalidate = 3600;

function line(label: string, url: string, note: string): string {
  return `- [${label}](${url}): ${note}`;
}

async function build(): Promise<string> {
  const articles = await getPublishedPosts();
  return `# ${site.name}

> ${site.description}

${site.legalName} is a remote-first software agency. We scope, build and hand over
production systems — web, mobile, AI automation, data and custom software — with
fixed-scope phases, weekly deployables and documentation written as we build.
Clients own the source and the infrastructure.

Two of our tools are free and need no account. Both run in the browser and are
the fastest way to get a concrete answer out of us:

${line(zac.consultant.name, absoluteUrl("/ai-consultant"), "describe a business problem in plain language and get a recommended solution, a visual prototype, a phased timeline and a cost band in about three minutes. The tool itself runs at " + absoluteUrl("/consultant") + ".")}
${line(zac.estimator.name, absoluteUrl("/software-cost-calculator"), "a software development cost calculator that returns a real price range with a line-by-line breakdown, published typical ranges by project type, and the cost drivers behind them. No email required. The tool itself runs at " + absoluteUrl("/tools/estimator") + ".")}

## Services

${services.map((s) => line(s.title, absoluteUrl(`/services/${s.slug}`), s.seo.description)).join("\n")}

## Industries

${industries.map((i) => line(i.name, absoluteUrl(`/industries/${i.slug}`), i.seo.description)).join("\n")}

## Company

${line("About", absoluteUrl("/about"), "who is accountable for delivery, the numbers behind the track record, and how engagements are structured.")}
${line("Projects", absoluteUrl("/portfolio"), "shipped work with the problem, the build and the measured production outcome for each.")}
${line("Book a consultation", absoluteUrl("/book"), "thirty minutes with a senior engineer. Not a sales call.")}
${line("Contact", absoluteUrl("/contact"), `send a brief; a senior engineer replies within one business day. Email ${site.email}.`)}

## Writing

${articles.map((a) => line(a.title, absoluteUrl(blogPath(a.slug)), `${a.category} · ${a.date} · ${a.excerpt}`)).join("\n")}

## How we price

Fixed price per phase after a one-to-two week discovery sprint, or a monthly rate
for an embedded team. No hourly billing. Estimates are modelled as effort in
person-weeks at a blended rate, plus third-party subscriptions and metered usage
at list price — build cost and running cost are always reported separately.
Published ranges are planning figures, not quotes.

## Optional

${line("Blog index", absoluteUrl(BLOG_PATH), "all articles.")}
${line("RSS feed", absoluteUrl("/feed.xml"), "machine-readable article feed.")}
${line("Privacy", absoluteUrl("/privacy"), "what we store from tool sessions and enquiries, and how to have it deleted.")}
${line("Terms", absoluteUrl("/terms"), "terms of use.")}
`;
}

export async function GET() {
  return new Response(await build(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

# SEO

How search works on this site, what is already wired up, and the parts that
cannot be solved in code.

---

## 1. The problem this pass was solving

`/consultant` and `/tools/estimator` are immersive chat apps. `body` gets
`overflow: hidden`, the header and footer are hidden, and the conversation owns
the viewport. The entire indexable content of each page was one `sr-only`
heading — roughly forty words against competitors publishing two thousand.

That is the correct product decision and an impossible search one. Rather than
compromise the apps, the ranking asset was moved to two ordinary pages:

| URL | What it is | Indexed |
| --- | --- | --- |
| `/ai-consultant` | Landing page for ZAC Consultant | **yes** |
| `/consultant` | The chat app | `noindex, follow` |
| `/software-cost-calculator` | Landing page for ZAC Estimator | **yes** |
| `/tools/estimator` | The chat app | `noindex, follow` |

`noindex, follow` rather than a canonical tag: Google routinely ignores a
canonical between two pages whose content differs this much, and would then
index the blank app anyway. `follow` keeps the apps passing authority onward.

Neither app URL is listed in `sitemap.xml` — asking to have a page indexed and
telling it not to be indexed in the same breath wastes crawl budget on every
fetch.

**Both apps are byte-for-byte unchanged.** Only their `robots` meta moved.

---

## 2. On-page

Every page builds its head through `pageMetadata()` in `src/lib/seo.ts`:
self-referencing canonical, unique title and description, Open Graph, Twitter
card, `max-image-preview: large` and unrestricted snippet length.

Title lengths are sized so `<title> — ZACSOL` still fits the ~60-character
result line. A truncated title loses the keyword at the end, which is usually
the one that earned the impression.

- `useRouteImage: true` opts a page out of the site-wide share card so its own
  `opengraph-image.tsx` wins. Both tool pages have bespoke cards.
- `noIndexFollow: true` is the chat-app case above.
- Private routes (`/roadmap/[id]`, `/book/manage/[token]`) already carried
  `noindex`; they now also get `X-Robots-Tag` and `no-store` at the edge, so a
  CDN or proxy cannot cache one person's quote for someone else.

Breadcrumb navigation and `BreadcrumbList` markup now exist on every listing and
detail page, not just service and insight pages.

---

## 3. Structured data

`src/components/seo/json-ld.tsx` emits one connected graph rather than islands.
Every node points at `#organization` and `#website` by `@id`, which is what lets
a crawler merge the pages into one entity.

| Component | Emits | Where |
| --- | --- | --- |
| `SiteJsonLd` | `Organization` + `ProfessionalService`, `WebSite` | layout (all pages) |
| `WebPageJsonLd` | `WebPage` / `AboutPage` / `ContactPage` | home, about, contact, book, tools |
| `ItemListJsonLd` | `CollectionPage` + `ItemList` | services, industries, portfolio, insights |
| `ServiceJsonLd` | `Service` + `OfferCatalog` | service and industry detail |
| `SoftwareApplicationJsonLd` | `WebApplication` with a zero-price `Offer` | both tool pages |
| `HowToJsonLd` | `HowTo` + `HowToStep` | both tool pages |
| `FaqJsonLd` | `FAQPage` | home, service detail, both tool pages |
| `ArticleJsonLd` | `BlogPosting` with author, `wordCount` | insight detail |
| `BreadcrumbJsonLd` | `BreadcrumbList` | everywhere |

Three deliberate choices:

**Self-serving reviews were removed from `Organization`.** Testimonials were
being emitted as `Review` nodes on our own organisation. Google has disqualified
first-party reviews from rich results since 2023 and treats them as a spam
signal. The testimonials still render as visible page content, where they do the
job they were written for.

**`areaServed` is a list of countries, not the string `"Worldwide"`.** A string
tells an answer engine nothing; named regions get us considered for
"software agency in X" without claiming an address we do not have.

**No `aggregateRating` anywhere.** We have no verifiable rating source. Inventing
one is the fastest route to a manual action.

---

## 4. Technical

- **`robots.ts`** — private paths blocked; assistant crawlers (GPTBot,
  ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended
  and others) explicitly allowed, because a growing share of buying research now
  happens inside an assistant and being absent from what they read is the 2026
  equivalent of being absent from Google. Pure-scrape bots that return nothing
  (CCBot, Bytespider, Diffbot) are blocked.
- **`/llms.txt`** — a curated, generated map of the site written for answer
  engines: what each URL is for and which claims we stand behind. Generated from
  the same content modules the pages render from, so it cannot drift.
- **`sitemap.ts`** — indexable URLs only, with the two tool landing pages at
  priority 0.95.
- **`next.config.ts`** — HSTS with preload; long-lived cache on brand assets;
  `stale-while-revalidate` on `sitemap.xml`, `feed.xml` and `llms.txt`;
  legacy/keyword redirects (`/pricing`, `/estimator`, `/cost-calculator`,
  `/blog/*`, `/work`, `/case-studies`, `/about-us`, `/contact-us`) so typed and
  historical URLs resolve with one permanent hop instead of a 404.
- **`manifest.ts`** — was serving the 1200×630 Open Graph image as the app icon,
  which no installer accepts. Now square 192/512 icons plus a maskable variant,
  and app shortcuts straight into both tools.

Core Web Vitals were already in good shape: `next/font` with `display: swap` and
preload, AVIF/WebP image formats, no raw `<img>` tags, `next/image` everywhere
with explicit dimensions, and both heavy chat widgets behind `next/dynamic` with
sized loading skeletons.

---

## 5. Content

`src/lib/content/tools.ts` holds the copy for both landing pages. Two things
about it are worth keeping true as it changes:

**The published cost bands are computed, not typed.** The table on
`/software-cost-calculator` calls `indicativeCostBand()` in
`src/lib/estimator/pricing.ts`, which reads the same effort baselines and
blended rate the estimator itself prices with. If the rate moves, the page moves
with it. A marketing page quoting a number the tool would contradict costs more
trust than publishing nothing.

**Every page states its limits.** Both landing pages have a section on what the
tool cannot do. This is not modesty — "is it accurate", "is it really free" and
"what happens to my data" are the queries standing between a visitor and the
tool, and answering them honestly is what makes the page quotable by an answer
engine rather than skipped as marketing.

The Consultant-vs-Estimator comparison table appears on both pages. Two tools
with adjacent names is a real source of confusion and "which one do I need" is a
query in its own right; answering it stops the two pages cannibalising each
other.

---

## 6. Local SEO

Deliberately minimal, on the decision that ZACSOL is remote-first with no
public address.

There is no `LocalBusiness`, no `PostalAddress`, and no Google Business Profile
guidance here, because all three require a real, verifiable location. Publishing
an address you cannot answer the door at is the single fastest way to get
filtered out of local results permanently.

What is in place instead: `Organization` + `ProfessionalService` with named
`areaServed` countries, two `ContactPoint` nodes, and country-level eligibility
on the free-tool offers.

**If a registered address is ever added**, the work is: add `address` and
`telephone` to the `Organization` node, switch the type to include
`LocalBusiness`, add `openingHoursSpecification`, claim and verify the Google
Business Profile, and add its URL to `sameAs`. Keep the name, address and phone
byte-identical across the site, the profile and every directory listing.

---

## 7. International SEO

Out of scope by decision. The site is single-market English with no `hreflang`
and no locale routing.

If that changes, `pageMetadata()` is where `alternates.languages` would go, and
the rule is: every locale links to every other locale including itself, plus one
`x-default`. Partial hreflang clusters are worse than none.

---

## 8. Off-page — the part that is not code

Nothing in this repository earns a link. Ranking a new domain for
"software development cost calculator" is a link-acquisition problem, and the
two tools are the only assets on this site with a realistic chance of earning
links passively. Everything below points at them.

**Set up first (week one)**

1. Google Search Console and Bing Webmaster Tools — verify via
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and `NEXT_PUBLIC_BING_SITE_VERIFICATION`,
   both already wired into the root layout. Submit `sitemap.xml`.
2. Request indexing for `/ai-consultant` and `/software-cost-calculator`
   directly. Do not wait for discovery.
3. LinkedIn company page and GitHub organisation must exist at the URLs in
   `site.social` — they are emitted in `sameAs`, and a `sameAs` pointing at a
   404 is a broken entity claim.
4. Crunchbase, Clutch, GoodFirms, DesignRush, G2. These are the directory
   listings buyers of agency services actually check, and they are the cheapest
   citations available. Identical company name and description on each.

**Earn links to the tools, not the homepage**

- The cost calculator is linkable because it publishes real numbers with the
  method behind them. Pitch it where people argue about what software costs:
  r/webdev, r/Entrepreneur, Indie Hackers, Hacker News (Show HN), and the
  "how much does an app cost" question threads on Quora and Reddit that already
  rank. Answer the question in the comment, link second.
- Startup and no-code newsletters take free-tool submissions. So do
  "free tools for founders" roundups, which are a standing link opportunity
  because their authors need new entries.
- Product Hunt for the consultant, once the prototype output is something you
  are happy to be judged on publicly.

**Digital PR that fits what we already have**

The pricing engine is a proprietary dataset. An annual "what software actually
costs" report built from anonymised estimator runs — median cost by project
type, how much a rushed timeline really adds, where estimates most often go
wrong — is a genuine journalist hook and the kind of asset that accrues links
for years. That is the highest-leverage off-page move available and it needs
nothing this site does not already collect.

**Do not**

Buy links, run guest-post networks, or use private blog networks. For a domain
this young a manual action is unrecoverable in any timeframe that matters.

---

## 9. Monitoring

Watch in Search Console, monthly:

- Impressions and average position for `/ai-consultant` and
  `/software-cost-calculator` specifically, not sitewide averages.
- Rich Results status for `FAQPage`, `HowTo` and `WebApplication`. Google
  changes eligibility without notice.
- Coverage: `/consultant` and `/tools/estimator` should move to
  "Excluded by 'noindex'". That is the expected state, not an error.
- Core Web Vitals on mobile, field data. The chat routes will look unusual
  because they are single-screen apps; judge them separately.

Re-run the estimator page after any change to `DEFAULT_WEEKLY_RATE_USD` or
`BASE_EFFORT_WEEKS` and confirm the published table still says something you are
willing to be held to.

---

## 10. Go-live checklist

Work through this in order. Step 1 is a hard blocker — everything else in this
document is worthless if it is wrong.

### Blocker: `NEXT_PUBLIC_APP_URL`

Locally this is `http://localhost:3000`. It is the single value that every
canonical tag, `og:url`, JSON-LD `@id`, sitemap entry, `robots.txt` host and
`llms.txt` link is built from (`siteUrl` in `src/lib/seo.ts`).

In the production environment it must be **either**:

- `https://zacsol.tech` — exactly, no trailing slash, no `www` unless `www` is
  the canonical host; **or**
- **unset**, which falls back to `https://zacsol.tech` from `site.domain`.

Anything else — a localhost value, a `*.vercel.app` preview URL, a trailing
slash — silently points the entire site's canonical graph at the wrong origin.
Google would then index the wrong host or nothing at all.

**Verify after deploy, before anything else:**

    curl -s https://zacsol.tech/sitemap.xml | head -20
    curl -s https://zacsol.tech/robots.txt | tail -5
    curl -s https://zacsol.tech/ai-consultant | grep -o '<link rel="canonical"[^>]*>'

Every URL in all three must start `https://zacsol.tech`. If any says
`localhost` or `vercel.app`, stop and fix the variable before submitting
anything to Search Console.

### Decide one thing

`/software-cost-calculator` publishes real price bands ($16k–$80k), computed
from the pricing engine. Read that table and confirm you are willing to have
those numbers public and quoted back at you. Removing it is one edit; removing
it after it has been indexed and screenshotted is not.

### Day one, after deploy

1. Confirm the canonical host with the three `curl` commands above.
2. Confirm one host serves the site. Pick `zacsol.tech` **or**
   `www.zacsol.tech` and 301 the other at the DNS/host layer. Both resolving
   with 200s splits every ranking signal in half.
3. Check the two new pages render and the CTAs reach the chat apps:
   `/ai-consultant` → `/consultant`, `/software-cost-calculator` →
   `/tools/estimator`.
4. Spot-check the redirects: `/pricing`, `/estimator`, `/blog`, `/work`,
   `/about-us` should each 301 once, not chain.

### Week one

5. **Google Search Console** — add the property, verify with
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (already wired into the root layout;
   set the env var, redeploy, then verify). Submit `sitemap.xml`.
6. **Bing Webmaster Tools** — same, via `NEXT_PUBLIC_BING_SITE_VERIFICATION`.
   Bing feeds ChatGPT search, so this is not optional in 2026.
7. **Request indexing** for `/ai-consultant` and `/software-cost-calculator`
   individually in the URL Inspection tool. Do not wait for discovery.
8. **Validate the structured data** — paste both tool URLs into the Rich
   Results Test and confirm `FAQPage`, `HowTo` and `WebApplication` parse with
   no errors.
9. **Fix the `sameAs` targets.** `site.social` claims
   `linkedin.com/company/zacsol` and `github.com/zacsol`. Both are emitted as
   entity claims in JSON-LD. If either 404s, create it or remove it from
   `src/lib/content/site.ts` — a broken `sameAs` is a broken identity claim.
10. **Directory citations** — Clutch, GoodFirms, DesignRush, Crunchbase, G2.
    Identical company name and description on every one.

### What "working" looks like in 4–8 weeks

- `/consultant` and `/tools/estimator` show as **"Excluded by 'noindex'"** in
  Coverage. That is the intended state, not a fault.
- `/ai-consultant` and `/software-cost-calculator` are indexed and picking up
  impressions for long-tail cost and consultant queries.
- Neither ranks page one for a head term yet. That is a link problem, and
  section 8 is how you solve it.

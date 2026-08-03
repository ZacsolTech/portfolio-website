import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { getInsight, getTeam } from "@/lib/cms";
import { insights } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return insights.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getInsight(slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/insights/${slug}`,
    type: "article",
    publishedTime: article.date,
    authors: [article.author],
    keywords: [
      article.category.toLowerCase(),
      "software agency insights",
      "AI automation",
      "product engineering",
    ],
  });
}

function renderBody(paragraphs: string[]) {
  return paragraphs.map((block, i) => {
    if (block.startsWith("### ")) {
      return (
        <h3 key={i}>{block.replace(/^###\s+/, "")}</h3>
      );
    }
    if (block.startsWith("> ")) {
      return <blockquote key={i}>{block.replace(/^>\s+/, "")}</blockquote>;
    }
    const html = block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export default async function InsightArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, teamMembers] = await Promise.all([getInsight(slug), getTeam()]);
  if (!article) notFound();

  const author = teamMembers.find((t) => t.name === article.author);
  const related = (
    await Promise.all(article.related.map((s) => getInsight(s)))
  ).filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" },
          { name: article.title, path: `/insights/${article.slug}` },
        ]}
      />
      <ArticleJsonLd
        title={article.title}
        description={article.excerpt}
        path={`/insights/${article.slug}`}
        datePublished={article.date}
        author={article.author}
        category={article.category}
      />
      <article>
        <header className="page-hero on-dark section--persist">
          <div
            className="blob blob--gold"
            style={{ width: "22rem", height: "22rem", top: "-6rem", right: "-6rem" }}
          />
          <div className="container" style={{ maxWidth: "48rem" }}>
            <nav className="page-hero__crumbs" aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/insights">Insights</Link>
                </li>
                <li>
                  <span aria-current="page">{article.category}</span>
                </li>
              </ol>
            </nav>
            <span className="overline overline--gold">{article.category}</span>
            <h1 className="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
              {article.title}
            </h1>
            <p
              className="overline"
              style={{
                marginTop: "1.25rem",
                color: "rgba(255,255,255,.55)",
                letterSpacing: "0.12em",
              }}
            >
              {article.date} · {article.readingTime} · {article.author}
            </p>
          </div>
        </header>

        <section className="section section--paper">
          <div className="container">
            <div className="article-body">{renderBody(article.body)}</div>

            {author ? (
              <aside
                style={{
                  marginTop: "3rem",
                  maxWidth: "68ch",
                  padding: "1.5rem",
                  borderRadius: "var(--r-xl)",
                  border: "1px solid var(--line-soft)",
                  background: "var(--paper-alt)",
                }}
              >
                <p className="overline">Author</p>
                <p className="d4" style={{ marginTop: "0.5rem" }}>
                  {author.name}
                </p>
                <p className="body-sm" style={{ marginTop: "0.35rem" }}>
                  {author.role}
                </p>
                <p className="body-sm" style={{ marginTop: "0.75rem" }}>
                  {author.bio}
                </p>
              </aside>
            ) : null}

            {related.length > 0 ? (
              <div style={{ marginTop: "3rem", maxWidth: "68ch" }}>
                <p className="overline">Related</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0", display: "grid", gap: "0.75rem" }}>
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/insights/${r.slug}`} className="link-u">
                        {r.title} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </article>

      <FinalCta showSteps={false} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { ArticleBody } from "@/components/blog/article-body";
import { ArticleImage } from "@/components/blog/article-image";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { BLOG_PATH, blogPath, formatBlogDate } from "@/lib/blog";
import { getPublishedPost, getPublishedPosts } from "@/lib/blog/store";
import { team } from "@/lib/content";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const posts = await getPublishedPosts();
    return posts.map((post) => ({ slug: post.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedPost(slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: article.excerpt,
    path: blogPath(slug),
    type: "article",
    publishedTime: article.date,
    modifiedTime: article.date,
    authors: [article.author],
    keywords: article.keywords.length
      ? article.keywords
      : [article.category.toLowerCase(), "blog"],
    ...(article.cover
      ? {
          images: [
            {
              url: absoluteUrl(article.cover.src),
              width: 1600,
              height: 900,
              alt: article.cover.alt,
            },
          ],
        }
      : {}),
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedPost(slug);
  if (!article) notFound();

  const author = team.find((member) => member.name === article.author);
  const wordCount = article.body.join(" ").split(/\s+/).filter(Boolean).length;
  const published = await getPublishedPosts();
  const related = published
    .filter((post) => post.slug !== article.slug && post.category === article.category)
    .slice(0, 3);
  const path = blogPath(article.slug);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: BLOG_PATH },
          { name: article.title, path },
        ]}
      />
      <ArticleJsonLd
        title={article.title}
        description={article.excerpt}
        path={path}
        datePublished={article.date}
        dateModified={article.date}
        author={article.author}
        category={article.category}
        wordCount={wordCount}
        keywords={article.keywords}
        image={article.cover?.src}
      />

      <article className="section section--paper blog-post">
        <div className="container">
          <header className="blog-post__header">
            <nav className="blog-post__crumbs" aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href={BLOG_PATH}>Blog</Link>
                </li>
                {article.category ? (
                  <li>
                    <span aria-current="page">{article.category}</span>
                  </li>
                ) : null}
              </ol>
            </nav>
            {article.category ? (
              <p className="overline">{article.category}</p>
            ) : null}
            <h1 className="blog-post__title">{article.title}</h1>
            <p className="blog-post__meta">
              <time dateTime={article.date}>{formatBlogDate(article.date)}</time>
              {" · "}
              {article.author}
              {" · "}
              {article.readingTime} read
            </p>
          </header>

          {article.cover ? (
            <ArticleImage
              src={article.cover.src}
              alt={article.cover.alt}
              caption={article.cover.caption}
              priority
              className="article-cover"
            />
          ) : null}

          <AdSlot slot="inArticle" className="ad-slot ad-slot--article" />

          <ArticleBody paragraphs={article.body} />

          {author ? (
            <aside className="article-author">
              <p className="overline">Written by</p>
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
            <div className="article-related">
              <p className="overline">More posts</p>
              <ul>
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link href={blogPath(item.slug)} className="link-u">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </article>
    </>
  );
}

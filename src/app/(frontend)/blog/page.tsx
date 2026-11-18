import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { BlogBrowser } from "@/components/blog/blog-browser";
import { BLOG_PATH, blogPath } from "@/lib/blog";
import { getPublishedPosts } from "@/lib/blog/store";
import { pageMetadata } from "@/lib/seo";
import { SeoJsonLd } from "@/components/seo/seo-overrides";
import { withSeo } from "@/lib/seo-overrides";

export const revalidate = 60;

const baseMetadata: Metadata = pageMetadata({
  title: "Blog",
  description: "Articles on AI, automation, and software from ZACSOL.",
  path: BLOG_PATH,
  keywords: ["software blog", "AI blog", "automation", "ZACSOL"],
});

export function generateMetadata(): Promise<Metadata> {
  return withSeo("/blog", baseMetadata);
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <SeoJsonLd page="/blog" />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: BLOG_PATH },
        ]}
      />
      <ItemListJsonLd
        name="ZACSOL Blog"
        description="Articles on AI, automation, and software."
        path={BLOG_PATH}
        items={posts.map((article) => ({
          name: article.title,
          path: blogPath(article.slug),
          description: article.excerpt,
        }))}
      />
      <PageHero
        overline="Blog"
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Blog" }]}
        title="Blog"
        lead="Articles on AI, automation, and software."
      />

      <section className="section section--paper">
        <div className="container">
          <BlogBrowser items={posts} />
        </div>
      </section>
    </>
  );
}

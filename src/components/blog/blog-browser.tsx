"use client";

import { CmsImage } from "@/components/blog/cms-image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdSlot } from "@/components/ads/ad-slot";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { Badge, Card, CardBody, CardMedia } from "@/components/ui";
import type { Insight } from "@/lib/content";
import { blogPath, formatBlogDate } from "@/lib/blog";
import { site } from "@/lib/content";
import { thumbClass } from "@/lib/seo";

type Props = {
  items: Insight[];
};

export function BlogBrowser({ items }: Props) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? items : items.filter((i) => i.category === filter);
  const list = filtered.length > 0 ? filtered : items;

  if (items.length === 0) {
    return (
      <p className="lead" style={{ marginTop: "2rem" }}>
        No published posts yet.
      </p>
    );
  }

  return (
    <div>
      <div className="filter-pills" role="tablist" aria-label="Filter posts">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={filter === cat}
            className={`filter-pill${filter === cat ? " filter-pill--on" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid-3" style={{ marginTop: "2.5rem", gap: "1.5rem" }}>
        {list.map((item, i) => (
          <Link key={item.slug} href={blogPath(item.slug)} className="card-link">
            <Card variant="media">
              <CardMedia>
                {item.cover ? (
                  <CmsImage
                    src={item.cover.src}
                    alt={item.cover.alt}
                    fill
                    className="blog-card-img"
                    priority={i === 0}
                  />
                ) : (
                  <div className={`thumb ${thumbClass(i)}`} data-label={item.category} />
                )}
              </CardMedia>
              <CardBody>
                <Badge>{item.category}</Badge>
                <h2 className="d4" style={{ marginTop: "0.75rem" }}>
                  {item.title}
                </h2>
                <p className="body-sm" style={{ marginTop: "0.5rem" }}>
                  {item.excerpt}
                </p>
                <p className="overline" style={{ marginTop: "auto", paddingTop: "1rem" }}>
                  {formatBlogDate(item.date)} · {item.readingTime}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <AdSlot slot="feed" className="ad-slot ad-slot--feed" />

      <div className="section section--ink on-dark blog-news">
        <span className="overline overline--gold">Newsletter</span>
        <h2 className="d3" style={{ marginTop: "0.75rem" }}>
          {site.newsletterBlurb}
        </h2>
        <div className="newsletter blog-news__form">
          <NewsletterForm />
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, CardBody, CardMedia, Field, Input } from "@/components/ui";
import type { Insight } from "@/lib/content";
import { site } from "@/lib/content";
import { thumbClass } from "@/lib/seo";

type Props = {
  items: Insight[];
};

export function InsightsBrowser({ items }: Props) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? items : items.filter((i) => i.category === filter);
  const [featured, ...rest] = filtered.length > 0 ? filtered : items;

  return (
    <div>
      <div className="filter-pills" role="tablist" aria-label="Filter insights">
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

      {featured ? (
        <Link
          href={`/insights/${featured.slug}`}
          className="card-link"
          style={{ marginTop: "2.5rem" }}
        >
          <Card variant="media" className="insights-featured">
            <CardMedia>
              <div className={`thumb ${thumbClass(0)}`} data-label={featured.category} />
            </CardMedia>
            <CardBody>
              <Badge variant="gold">{featured.category}</Badge>
              <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                {featured.title}
              </h2>
              <p className="lead" style={{ marginTop: "0.75rem", fontSize: "1.0625rem" }}>
                {featured.excerpt}
              </p>
              <p className="overline" style={{ marginTop: "1.25rem" }}>
                {featured.date} · {featured.readingTime} · {featured.author}
              </p>
            </CardBody>
          </Card>
        </Link>
      ) : null}

      <div className="grid-3" style={{ marginTop: "2rem", gap: "1.5rem" }}>
        {rest.map((item, i) => (
          <Link key={item.slug} href={`/insights/${item.slug}`} className="card-link">
            <Card variant="media">
              <CardMedia>
                <div className={`thumb ${thumbClass(i + 1)}`} data-label={item.category} />
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
                  {item.readingTime}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="section section--ink on-dark insights-news">
        <span className="overline overline--gold">Newsletter</span>
        <h2 className="d3" style={{ marginTop: "0.75rem" }}>
          {site.newsletterBlurb}
        </h2>
        {/*
          The email field used to be a `flex: 1 1 14rem` input inside a block
          <label>, so the flex value applied to nothing and the control
          shrink-wrapped to its placeholder. The label is the flex item now.
        */}
        <form noValidate className="insights-news__form" onSubmit={(e) => e.preventDefault()}>
          <Field htmlFor="insights-email" className="insights-news__field">
            <Input
              id="insights-email"
              type="email"
              name="email"
              placeholder="you@company.com"
              aria-label="Email address"
              autoComplete="email"
              className="insights-news__input"
            />
          </Field>
          <button type="button" className="btn btn--gold">
            Subscribe
          </button>
        </form>
      </div>
    </div>
  );
}

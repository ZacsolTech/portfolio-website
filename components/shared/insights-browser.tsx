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
          <Card
            variant="media"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              overflow: "hidden",
            }}
            className="insights-featured"
          >
            <CardMedia style={{ height: "16rem" }}>
              <div className={`thumb ${thumbClass(0)}`} data-label={featured.category} />
            </CardMedia>
            <CardBody style={{ padding: "2rem" }}>
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

      <div
        className="section section--ink section--persist on-dark"
        style={{
          marginTop: "4rem",
          borderRadius: "var(--r-2xl)",
          padding: "2.5rem",
        }}
      >
        <span className="overline overline--gold">Newsletter</span>
        <h2 className="d3" style={{ marginTop: "0.75rem", color: "#fff" }}>
          {site.newsletterBlurb}
        </h2>
        <form
          noValidate
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginTop: "1.5rem",
            maxWidth: "28rem",
          }}
          onSubmit={(e) => e.preventDefault()}
        >
          <Field htmlFor="insights-email" className="newsletter-field">
            <Input
              id="insights-email"
              type="email"
              name="email"
              placeholder="you@company.com"
              aria-label="Email address"
              autoComplete="email"
              style={{
                height: "2.75rem",
                borderRadius: "var(--r-pill)",
                background: "rgba(255,255,255,.06)",
                border: "1px solid var(--line-on-dark)",
                color: "#fff",
                paddingInline: "1.25rem",
                width: "100%",
                flex: "1 1 14rem",
              }}
            />
          </Field>
          <button type="button" className="btn btn--gold">
            Subscribe
          </button>
        </form>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .insights-featured {
            grid-template-columns: 1.1fr 1fr !important;
          }
          .insights-featured .card__img {
            height: 100% !important;
            min-height: 18rem;
          }
        }
      `}</style>
    </div>
  );
}

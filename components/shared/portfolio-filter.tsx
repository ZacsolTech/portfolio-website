"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, CardBody, CardMedia } from "@/components/ui";
import type { PortfolioCategory, PortfolioItem } from "@/lib/content";
import { thumbClass } from "@/lib/seo";

const FILTERS: { id: "all" | "demo" | PortfolioCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "demo", label: "Live demos" },
  { id: "web", label: "Web" },
  { id: "mobile", label: "Mobile" },
  { id: "ai", label: "AI" },
  { id: "data", label: "Data" },
  { id: "automation", label: "Automation" },
];

type Props = {
  items: PortfolioItem[];
};

export function PortfolioFilterGrid({ items }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "demo") return items.filter((i) => i.interactive || i.category === "demo");
    return items.filter((i) => i.category === filter);
  }, [filter, items]);

  return (
    <div>
      <div className="filter-pills" role="tablist" aria-label="Filter portfolio">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`filter-pill${filter === f.id ? " filter-pill--on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid-3" style={{ marginTop: "2.5rem", gap: "1.5rem" }}>
        {filtered.map((item, i) => (
          <Link
            key={item.slug}
            href={item.interactive ? `/demos/${item.slug}` : `/portfolio/${item.slug}`}
            className="card-link"
          >
            <Card variant="media">
              <CardMedia>
                <div
                  className={`thumb ${thumbClass(i)}`}
                  data-label={item.interactive ? "Live demo" : "Case study"}
                />
              </CardMedia>
              <CardBody>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <Badge variant={item.interactive ? "gold" : "default"}>
                    {item.interactive ? "Interactive" : item.sector}
                  </Badge>
                </div>
                <h2 className="d4" style={{ marginTop: "0.75rem" }}>
                  {item.title}
                </h2>
                <p className="body-sm" style={{ marginTop: "0.5rem", flex: 1 }}>
                  {item.summary}
                </p>
                <p
                  style={{
                    marginTop: "1rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    color: "var(--text-ink)",
                  }}
                >
                  {item.metric}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="body-sm" style={{ marginTop: "2rem" }}>
          No projects in this filter yet.
        </p>
      ) : null}
    </div>
  );
}

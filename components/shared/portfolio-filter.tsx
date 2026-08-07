"use client";

import { useMemo, useState } from "react";
import type { PortfolioCategory, PortfolioItem } from "@/lib/content";
import { ProjectCardGrid } from "./project-cards";

const FILTERS: { id: "all" | PortfolioCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "mobile", label: "Mobile" },
  { id: "ai", label: "AI" },
  { id: "data", label: "Data" },
  { id: "automation", label: "Automation" },
];

type Props = {
  items: PortfolioItem[];
  initialSlug?: string | null;
};

export function PortfolioFilterGrid({ items, initialSlug = null }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [filter, items]);

  return (
    <div>
      <div className="filter-pills" role="tablist" aria-label="Filter projects">
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

      <div style={{ marginTop: "2.5rem" }}>
        <ProjectCardGrid
          items={filtered}
          catalog={items}
          layout="media"
          columns="3"
          syncUrl
          initialSlug={initialSlug}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="body-sm" style={{ marginTop: "2rem" }}>
          No projects in this filter yet.
        </p>
      ) : null}
    </div>
  );
}

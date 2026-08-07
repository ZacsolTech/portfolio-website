"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card, CardBody, CardMedia, LinkArrow } from "@/components/ui";
import type { PortfolioItem } from "@/lib/content";
import { thumbClass } from "@/lib/seo";
import { ProjectDetailModal } from "./project-modal";

type Layout = "featured" | "media" | "compact";

type Props = {
  items: PortfolioItem[];
  /** Resolve modal content from the full catalog when `items` is filtered */
  catalog?: PortfolioItem[];
  /** visual density for different page sections */
  layout?: Layout;
  columns?: "2" | "3";
  /** Sync open project to ?project= on the portfolio index */
  syncUrl?: boolean;
  initialSlug?: string | null;
  /** Offset into thumb palette when nesting multiple grids */
  thumbOffset?: number;
};

function categoryLabel(category: string) {
  if (category === "ai") return "AI";
  if (category === "automation") return "Automation";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function readProjectParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("project");
}

function writeProjectParam(slug: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("project", slug);
  else url.searchParams.delete("project");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", next);
}

export function ProjectCardGrid({
  items,
  catalog,
  layout = "media",
  columns = "3",
  syncUrl = false,
  initialSlug = null,
  thumbOffset = 0,
}: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug);
  const source = catalog ?? items;

  const open = useCallback(
    (slug: string) => {
      setActiveSlug(slug);
      if (syncUrl) writeProjectParam(slug);
    },
    [syncUrl],
  );

  const close = useCallback(() => {
    setActiveSlug(null);
    if (syncUrl) writeProjectParam(null);
  }, [syncUrl]);

  useEffect(() => {
    if (!syncUrl) return;
    const fromUrl = readProjectParam();
    if (fromUrl && source.some((i) => i.slug === fromUrl)) {
      setActiveSlug(fromUrl);
    }
  }, [syncUrl, source]);

  const active = activeSlug ? source.find((i) => i.slug === activeSlug) : null;
  const activeIndex = active
    ? source.findIndex((i) => i.slug === active.slug) + thumbOffset
    : 0;

  const gridClass = columns === "2" ? "grid-2" : "grid-3";

  return (
    <>
      <div className={gridClass} style={layout === "media" ? { gap: "1.5rem" } : undefined}>
        {items.map((item, i) => (
          <button
            key={item.slug}
            type="button"
            className="card-link project-card-trigger"
            onClick={() => open(item.slug)}
            aria-haspopup="dialog"
          >
            {layout === "featured" ? (
              <Card variant="media" className="work-card">
                <div
                  className={`thumb ${thumbClass(i + thumbOffset)}`}
                  data-label={item.sector}
                />
                <CardBody>
                  <div className="work-card__meta">
                    <Badge>{item.sector}</Badge>
                    <span className="body-sm">
                      {item.timeline ?? categoryLabel(item.category)}
                    </span>
                  </div>
                  <h3 className="d4 work-card__title">{item.title}</h3>
                  <p className="body-sm work-card__summary">{item.summary}</p>
                  <p className="work-card__metric">{item.metric}</p>
                  <div className="work-card__cta">
                    <LinkArrow as="span">View project</LinkArrow>
                  </div>
                </CardBody>
              </Card>
            ) : layout === "compact" ? (
              <Card variant="media">
                <CardMedia>
                  <div
                    className={`thumb ${thumbClass(i + thumbOffset)}`}
                    data-label={item.sector}
                  />
                </CardMedia>
                <CardBody>
                  <Badge>{item.sector}</Badge>
                  <h3 className="d4" style={{ marginTop: "0.75rem" }}>
                    {item.title}
                  </h3>
                  <p
                    className="overline"
                    style={{
                      marginTop: "auto",
                      paddingTop: "1.25rem",
                      color: "var(--accent-fg)",
                    }}
                  >
                    {item.metric}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <Card variant="media">
                <CardMedia>
                  <div
                    className={`thumb ${thumbClass(i + thumbOffset)}`}
                    data-label={item.sector}
                  />
                </CardMedia>
                <CardBody>
                  <Badge>{item.sector}</Badge>
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
            )}
          </button>
        ))}
      </div>

      {active ? (
        <ProjectDetailModal item={active} index={activeIndex} onClose={close} />
      ) : null}
    </>
  );
}

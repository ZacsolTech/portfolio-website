import Link from "next/link";
import type { BlogTool } from "@/lib/content";
import { zac } from "@/lib/content/zac";

const COPY: Record<
  BlogTool,
  { href: string; overline: string; title: string; body: string; cta: string }
> = {
  estimator: {
    href: "/software-cost-calculator",
    overline: zac.estimator.name,
    title: "Get a cost range for this build",
    body: "Describe the project in plain language. ZAC Estimator returns a real price band with the line-by-line drivers — free, no email.",
    cta: zac.estimator.ctaShort,
  },
  consultant: {
    href: "/ai-consultant",
    overline: zac.consultant.name,
    title: "Not sure which of these you actually need?",
    body: "Tell ZAC Consultant the bottleneck. It recommends a solution, a phased timeline and a cost band in about three minutes.",
    cta: zac.consultant.ctaTry,
  },
};

export function BlogToolCtas({ tools }: { tools: BlogTool[] }) {
  if (!tools.length) return null;
  return (
    <aside className="blog-tools" aria-label="Free ZACSOL tools">
      {tools.map((tool) => {
        const item = COPY[tool];
        return (
          <div key={tool} className="blog-tools__card">
            <p className="overline">{item.overline}</p>
            <p className="d4" style={{ marginTop: "0.5rem" }}>
              {item.title}
            </p>
            <p className="body-sm" style={{ marginTop: "0.5rem" }}>
              {item.body}
            </p>
            <Link href={item.href} className="btn btn--gold" style={{ marginTop: "1rem" }}>
              {item.cta}
            </Link>
          </div>
        );
      })}
    </aside>
  );
}

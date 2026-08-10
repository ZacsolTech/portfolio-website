import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type LinkArrowProps = {
  /** Omit when `as="span"` — the affordance is inside a card-level link. */
  href?: string;
  /**
   * Render as a span when an ancestor already owns the navigation. Nesting an
   * <a> inside an <a> is invalid and browsers recover from it unpredictably.
   */
  as?: "link" | "span";
  className?: string;
  children: ReactNode;
};

export function LinkArrow({ href, as = "link", className, children }: LinkArrowProps) {
  if (as === "span" || !href) {
    return (
      <span className={cn("link-arrow", className)}>
        {children}
        <ArrowRight aria-hidden />
      </span>
    );
  }

  return (
    <Link href={href} className={cn("link-arrow", className)}>
      {children}
      <ArrowRight aria-hidden />
    </Link>
  );
}

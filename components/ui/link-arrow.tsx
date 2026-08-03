import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type LinkArrowProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function LinkArrow({ href, className, children }: LinkArrowProps) {
  return (
    <Link href={href} className={cn("link-arrow", className)}>
      {children}
      <ArrowRight aria-hidden />
    </Link>
  );
}

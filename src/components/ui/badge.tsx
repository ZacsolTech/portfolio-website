import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "default" | "gold" | "dark";

export type BadgeProps = {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
};

const variantClass: Record<BadgeVariant, string | undefined> = {
  default: undefined,
  gold: "badge--gold",
  dark: "badge--dark",
};

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span className={cn("badge", variantClass[variant], className)}>{children}</span>
  );
}

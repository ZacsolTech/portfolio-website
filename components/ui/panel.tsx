import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PanelVariant = "default" | "dark";

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: PanelVariant;
  children: ReactNode;
};

export function Panel({
  variant = "default",
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className={cn("panel", variant === "dark" && "panel--dark", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export type PanelRowProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function PanelRow({ className, children, ...rest }: PanelRowProps) {
  return (
    <div className={cn("panel__row", className)} {...rest}>
      {children}
    </div>
  );
}

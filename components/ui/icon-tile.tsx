import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconTileSize = "sm" | "default";
export type IconTileVariant = "default" | "gold";

export type IconTileProps = HTMLAttributes<HTMLDivElement> & {
  size?: IconTileSize;
  variant?: IconTileVariant;
  children: ReactNode;
};

export function IconTile({
  size = "default",
  variant = "default",
  className,
  children,
  ...rest
}: IconTileProps) {
  return (
    <div
      className={cn(
        "icon-tile",
        size === "sm" && "icon-tile--sm",
        variant === "gold" && "icon-tile--gold",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type IconTileNumProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function IconTileNum({ className, children, ...rest }: IconTileNumProps) {
  return (
    <span className={cn("icon-tile__n", className)} {...rest}>
      {children}
    </span>
  );
}

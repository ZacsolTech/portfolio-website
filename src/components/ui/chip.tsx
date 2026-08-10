import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChipProps = {
  className?: string;
  children: ReactNode;
};

export function Chip({ className, children }: ChipProps) {
  return <span className={cn("chip", className)}>{children}</span>;
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatProps = HTMLAttributes<HTMLDivElement> & {
  value: ReactNode;
  label: ReactNode;
};

export function Stat({ value, label, className, ...rest }: StatProps) {
  return (
    <div className={cn("stat", className)} {...rest}>
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

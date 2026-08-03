import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type OverlineProps = HTMLAttributes<HTMLParagraphElement> & {
  gold?: boolean;
  children: ReactNode;
};

export function Overline({ gold, className, children, ...rest }: OverlineProps) {
  return (
    <p className={cn("overline", gold && "overline--gold", className)} {...rest}>
      {children}
    </p>
  );
}

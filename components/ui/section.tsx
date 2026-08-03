import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SectionVariant = "paper" | "paper-alt" | "ink" | "wash" | "none";

export type SectionProps = HTMLAttributes<HTMLElement> & {
  variant?: SectionVariant;
  persist?: boolean;
  onDark?: boolean;
  children: ReactNode;
};

const variantClass: Record<SectionVariant, string | undefined> = {
  paper: "section--paper",
  "paper-alt": "section--paper-alt",
  ink: "section--ink",
  wash: "section--wash",
  none: undefined,
};

export function Section({
  variant = "paper",
  persist,
  onDark,
  id,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "section",
        variantClass[variant],
        persist && "section--persist",
        onDark && "on-dark",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

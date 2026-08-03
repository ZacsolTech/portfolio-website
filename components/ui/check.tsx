import { Check as CheckIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CheckProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Check({ className, children, ...rest }: CheckProps) {
  return (
    <div className={cn("check", className)} {...rest}>
      <CheckIcon aria-hidden />
      <span>{children}</span>
    </div>
  );
}

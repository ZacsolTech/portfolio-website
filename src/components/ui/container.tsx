import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Container({ className, children, ...rest }: ContainerProps) {
  return (
    <div className={cn("container", className)} {...rest}>
      {children}
    </div>
  );
}

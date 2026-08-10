import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DisplaySize = "d1" | "d2" | "d3" | "d4";

export type DisplayProps = HTMLAttributes<HTMLElement> & {
  size?: DisplaySize;
  as?: ElementType;
  children: ReactNode;
};

const defaultTag: Record<DisplaySize, ElementType> = {
  d1: "h1",
  d2: "h2",
  d3: "h3",
  d4: "h4",
};

export function Display({
  size = "d2",
  as,
  className,
  children,
  ...rest
}: DisplayProps) {
  const Tag = as ?? defaultTag[size];
  return (
    <Tag className={cn(size, className)} {...rest}>
      {children}
    </Tag>
  );
}

export type LeadProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function Lead({ className, children, ...rest }: LeadProps) {
  return (
    <p className={cn("lead", className)} {...rest}>
      {children}
    </p>
  );
}

export type BodySmProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function BodySm({ className, children, ...rest }: BodySmProps) {
  return (
    <p className={cn("body-sm", className)} {...rest}>
      {children}
    </p>
  );
}

export type EmSerifProps = HTMLAttributes<HTMLElement> & {
  block?: boolean;
  as?: "em" | "span" | "i";
  children: ReactNode;
};

export function EmSerif({
  block,
  as: Tag = "em",
  className,
  children,
  ...rest
}: EmSerifProps) {
  return (
    <Tag className={cn("em-serif", block && "em-serif--block", className)} {...rest}>
      {children}
    </Tag>
  );
}

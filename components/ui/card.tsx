import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "dark" | "media";

export type CardProps = HTMLAttributes<HTMLElement> & {
  variant?: CardVariant;
  children: ReactNode;
};

const variantClass: Record<CardVariant, string | undefined> = {
  default: undefined,
  dark: "card--dark",
  media: "card--media",
};

export function Card({ variant = "default", className, children, ...rest }: CardProps) {
  return (
    <article className={cn("card", variantClass[variant], className)} {...rest}>
      {children}
    </article>
  );
}

export type CardMediaProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardMedia({ className, children, ...rest }: CardMediaProps) {
  return (
    <div className={cn("card__img", className)} {...rest}>
      {children}
    </div>
  );
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardBody({ className, children, ...rest }: CardBodyProps) {
  return (
    <div className={cn("card__body", className)} {...rest}>
      {children}
    </div>
  );
}

export type CardTopProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function CardTop({ className, children, ...rest }: CardTopProps) {
  return (
    <div className={cn("card__top", className)} {...rest}>
      {children}
    </div>
  );
}

export type CardNumProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function CardNum({ className, children, ...rest }: CardNumProps) {
  return (
    <span className={cn("card__num", className)} {...rest}>
      {children}
    </span>
  );
}

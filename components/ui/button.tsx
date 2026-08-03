"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "gold" | "ink" | "ghost" | "outline-dark";
export type ButtonSize = "default" | "sm" | "lg";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

const variantClass: Record<ButtonVariant, string> = {
  gold: "btn--gold",
  ink: "btn--ink",
  ghost: "btn--ghost",
  "outline-dark": "btn--outline-dark",
};

const sizeClass: Record<ButtonSize, string | undefined> = {
  default: undefined,
  sm: "btn--sm",
  lg: "btn--lg",
};

export function Button({
  variant = "gold",
  size = "default",
  className,
  children,
  href,
  type = "button",
  disabled,
  onClick,
}: ButtonProps) {
  const classes = cn("btn", variantClass[variant], sizeClass[size], className);

  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled || undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

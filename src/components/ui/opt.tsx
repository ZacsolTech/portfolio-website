"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type OptProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
  optKey?: ReactNode;
  children: ReactNode;
};

export function Opt({
  pressed = false,
  optKey,
  className,
  children,
  type = "button",
  ...rest
}: OptProps) {
  return (
    <button
      type={type}
      className={cn("opt", className)}
      aria-pressed={pressed}
      {...rest}
    >
      {optKey != null && <span className="opt__key">{optKey}</span>}
      <span>{children}</span>
    </button>
  );
}

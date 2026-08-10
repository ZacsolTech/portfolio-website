import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ConsoleProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Console({ className, children, ...rest }: ConsoleProps) {
  return (
    <div className={cn("console", className)} {...rest}>
      {children}
    </div>
  );
}

export type ConsoleBarProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  children?: ReactNode;
};

export function ConsoleBar({ title, className, children, ...rest }: ConsoleBarProps) {
  return (
    <div className={cn("console__bar", className)} {...rest}>
      {children ?? (
        <>
          <LiveDot />
          {title != null && <span className="console__title">{title}</span>}
        </>
      )}
    </div>
  );
}

export type ConsoleBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function ConsoleBody({ className, children, ...rest }: ConsoleBodyProps) {
  return (
    <div className={cn("console__body", className)} {...rest}>
      {children}
    </div>
  );
}

export type LiveDotProps = HTMLAttributes<HTMLSpanElement>;

export function LiveDot({ className, ...rest }: LiveDotProps) {
  return <span className={cn("live", className)} aria-hidden {...rest} />;
}

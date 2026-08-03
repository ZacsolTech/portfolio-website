"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ElementType,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const STAGGER_MS = 70;
const OBSERVER_OPTS: IntersectionObserverInit = {
  threshold: 0.12,
  rootMargin: "0px 0px -60px 0px",
};

export type RevealProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  index?: number;
  children: ReactNode;
};

export function Reveal({
  as: Tag = "div",
  index,
  className,
  children,
  style,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const staggerIndex = index ?? 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }

    const fromAttr = el.dataset.revealIndex;
    const delay =
      (fromAttr != null ? Number(fromAttr) : staggerIndex) * STAGGER_MS;

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        window.setTimeout(() => {
          entry.target.classList.add("is-in");
        }, Number.isFinite(delay) ? delay : 0);
        io.unobserve(entry.target);
      }
    }, OBSERVER_OPTS);

    io.observe(el);
    return () => io.disconnect();
  }, [staggerIndex]);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", className)}
      data-reveal-index={staggerIndex}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export type RevealGroupProps = {
  className?: string;
  children: ReactNode;
  as?: ElementType;
};

export function RevealGroup({
  className,
  children,
  as: Tag = "div",
}: RevealGroupProps) {
  const items = Children.map(children, (child, i) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{ index?: number }>;
    return cloneElement(el, {
      index: el.props.index ?? i,
    });
  });

  return <Tag className={className}>{items}</Tag>;
}

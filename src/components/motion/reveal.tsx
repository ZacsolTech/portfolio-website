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

const STAGGER_MS = 65;
const OBSERVER_OPTS: IntersectionObserverInit = {
  threshold: 0.1,
  rootMargin: "0px 0px -56px 0px",
};

/**
 * One observer for the whole document rather than one per element.
 * A homepage carries ~35 Reveal instances; 35 IntersectionObservers is 35
 * separate sets of layout bookkeeping for what is a single scroll question.
 */
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (observer) return observer;

  observer = new IntersectionObserver((entries, io) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      io.unobserve(el);

      const parsed = Number(el.dataset.revealIndex);
      const delay = Number.isFinite(parsed) ? parsed * STAGGER_MS : 0;

      if (delay <= 0) {
        el.classList.add("is-in");
      } else {
        window.setTimeout(() => el.classList.add("is-in"), delay);
      }
    }
  }, OBSERVER_OPTS);

  return observer;
}

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

    const io = getObserver();
    if (!io) {
      el.classList.add("is-in");
      return;
    }

    io.observe(el);
    return () => io.unobserve(el);
  }, []);

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

"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Chip } from "@/components/ui";
import type { PortfolioItem } from "@/lib/content";
import { thumbClass } from "@/lib/seo";

type Props = {
  item: PortfolioItem;
  index?: number;
  onClose: () => void;
};

function categoryLabel(category: string) {
  if (category === "ai") return "AI";
  if (category === "automation") return "Automation";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function ProjectDetailModal({ item, index = 0, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveImage(0);
  }, [item.slug]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, mounted]);

  function onPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted) return null;

  const primary = item.images[activeImage] ?? item.images[0];

  return createPortal(
    <div className="project-modal" role="presentation">
      <button
        type="button"
        className="project-modal__backdrop"
        aria-label="Close project details"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="project-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onPanelKeyDown}
      >
        <header className="project-modal__header">
          <span className="overline">Project</span>
          <button
            ref={closeRef}
            type="button"
            className="project-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="project-modal__scroll">
          {/* 1. Project images — fills first modal screen */}
          <section className="project-modal__gallery" aria-label="Project images">
            <div className="project-modal__showcase">
              <div className="project-modal__stage">
                {primary.src ? (
                  <Image
                    src={primary.src}
                    alt={primary.alt}
                    fill
                    className="project-modal__photo"
                    sizes="(max-width: 640px) 100vw, 46rem"
                    priority
                  />
                ) : (
                  <div
                    className={`thumb ${thumbClass(index + activeImage)} project-modal__frame`}
                    data-label=""
                    role="img"
                    aria-label={primary.alt}
                  >
                    <div className="project-modal__ui" aria-hidden>
                      <span className="project-modal__ui-bar" />
                      <span className="project-modal__ui-row" />
                      <span className="project-modal__ui-row project-modal__ui-row--short" />
                      <div className="project-modal__ui-grid">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {item.images.length > 1 ? (
                <aside className="project-modal__rail" aria-label="Image thumbnails">
                  <div className="project-modal__thumbs" role="tablist" aria-label="Select image">
                    {item.images.map((img, i) => (
                      <button
                        key={`${img.caption}-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={activeImage === i}
                        aria-label={img.caption}
                        className={`project-modal__thumb-btn${activeImage === i ? " project-modal__thumb-btn--on" : ""}`}
                        onClick={() => setActiveImage(i)}
                      >
                        {img.src ? (
                          <span className="project-modal__thumb-media">
                            <Image
                              src={img.src}
                              alt=""
                              fill
                              className="project-modal__photo"
                              sizes="140px"
                            />
                          </span>
                        ) : (
                          <div
                            className={`thumb ${thumbClass(index + i)} project-modal__thumb-frame`}
                            data-label=""
                            aria-hidden
                          >
                            <span className="project-modal__thumb-num">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </aside>
              ) : null}

              <div className="project-modal__meta">
                <span className="project-modal__index">
                  {String(activeImage + 1).padStart(2, "0")}
                  <span aria-hidden> / </span>
                  {String(item.images.length).padStart(2, "0")}
                </span>
                <p className="project-modal__caption">{primary.caption}</p>
              </div>
            </div>
          </section>

          <div className="project-modal__details">
          {/* 2. Title · sector · category */}
          <section className="project-modal__identity" aria-label="Project overview">
            <div className="project-modal__identity-cell">
              <span className="overline">Title</span>
              <h2 id={titleId} className="project-modal__title">
                {item.title}
              </h2>
            </div>
            <div className="project-modal__identity-cell">
              <span className="overline">Sector</span>
              <p className="project-modal__identity-value">{item.sector}</p>
            </div>
            <div className="project-modal__identity-cell">
              <span className="overline">Category</span>
              <p className="project-modal__identity-value">
                {categoryLabel(item.category)}
              </p>
            </div>
          </section>

          {/* 3. Tech stack */}
          <section className="project-modal__stack">
            <span className="overline">Tech stack</span>
            <div className="project-modal__chips">
              {item.stack.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </section>

          {/* 4. Description */}
          <section className="project-modal__description">
            <span className="overline">Description</span>
            <div className="project-modal__copy">
              {item.description.map((para) => (
                <p key={para.slice(0, 48)} className="body-sm">
                  {para}
                </p>
              ))}
            </div>
          </section>
          </div>
        </div>

        <footer className="project-modal__footer">
          <Link href="/contact" className="btn btn--gold btn--sm" onClick={onClose}>
            Start a project
          </Link>
          <Link href="/book" className="btn btn--ghost btn--sm" onClick={onClose}>
            Book a consultation
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
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

const emptySubscribe = () => () => {};

export function ProjectDetailModal({ item, index = 0, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const imageCount = item.images.length;
  const canZoom = Boolean(item.images[activeImage]?.src ?? item.images[0]?.src);

  const goPrev = useCallback(() => {
    setActiveImage((prev) => (prev - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const goNext = useCallback(() => {
    setActiveImage((prev) => (prev + 1) % imageCount);
  }, [imageCount]);

  /** Drive the carousel from a journey stage — and scroll it back into
      view, since the stage list sits well below the stage image. */
  const jumpToImage = useCallback((i: number) => {
    setActiveImage(i);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (lightboxOpen) {
          setLightboxOpen(false);
          return;
        }
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [onClose, goPrev, goNext, lightboxOpen],
  );

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
    <>
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
          <div className="project-modal__header-meta">
            <span className="badge">{item.sector}</span>
            <span className="project-modal__header-title" id={titleId}>
              {item.title}
            </span>
          </div>
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

        <div className="project-modal__scroll" ref={scrollRef}>
          {/* Main stage + parallel thumbnail column */}
          <section className="project-modal__carousel" aria-label="Project images">
            <div className="project-modal__showcase">
              <div className="project-modal__stage">
                {primary.src ? (
                  <Image
                    src={primary.src}
                    alt={primary.alt}
                    fill
                    className="project-modal__photo"
                    sizes="(max-width: 768px) 100vw, 48rem"
                    priority
                  />
                ) : (
                  <div
                    className={`thumb ${thumbClass(index + activeImage)} project-modal__frame`}
                    data-label={primary.caption}
                    role="img"
                    aria-label={primary.alt}
                  />
                )}

                {canZoom ? (
                  <button
                    type="button"
                    className="project-modal__zoom"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="Zoom image"
                  >
                    <ZoomIn size={16} aria-hidden />
                  </button>
                ) : null}

                {imageCount > 1 ? (
                  <>
                    <button
                      type="button"
                      className="project-modal__nav project-modal__nav--prev"
                      onClick={goPrev}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="project-modal__nav project-modal__nav--next"
                      onClick={goNext}
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} aria-hidden />
                    </button>
                    <div className="project-modal__counter">
                      {activeImage + 1} / {imageCount}
                    </div>
                  </>
                ) : null}
              </div>

              {imageCount > 1 ? (
                <aside className="project-modal__rail" aria-label="More images">
                  <div className="project-modal__strip" role="tablist" aria-label="Select image">
                    {item.images.map((img, i) => (
                      <button
                        key={`${img.caption}-${i}`}
                        type="button"
                        role="tab"
                        aria-selected={activeImage === i}
                        aria-label={img.caption}
                        className={`project-modal__strip-btn${activeImage === i ? " project-modal__strip-btn--on" : ""}`}
                        onClick={() => setActiveImage(i)}
                      >
                        {img.src ? (
                          <Image
                            src={img.src}
                            alt=""
                            fill
                            className="project-modal__strip-img"
                            sizes="120px"
                          />
                        ) : (
                          <div
                            className={`thumb ${thumbClass(index + i)} project-modal__strip-fallback`}
                            data-label=""
                            aria-hidden
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </aside>
              ) : null}
            </div>

            <p className="project-modal__caption">{primary.caption}</p>
          </section>

          <div className="project-modal__details">
            <section className="project-modal__identity" aria-label="Project overview">
              <div className="project-modal__identity-cell">
                <span className="overline">Title</span>
                <h2 className="project-modal__title">{item.title}</h2>
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

            <section className="project-modal__stack">
              <span className="overline">Tech stack</span>
              <div className="project-modal__chips">
                {item.stack.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </section>

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

            {item.journey ? (
              <section className="project-modal__journey">
                <span className="overline">Start to submission</span>
                <ol className="journey journey--modal">
                  {item.journey.map((stage, i) => {
                    const shotIndex = stage.image;
                    const canJump =
                      shotIndex !== undefined && Boolean(item.images[shotIndex]?.src);
                    return (
                      <li key={stage.title} className="journey__i">
                        <span className="journey__n" aria-hidden>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="journey__body">
                          <span className="overline journey__when">{stage.when}</span>
                          <h3 className="journey__t">{stage.title}</h3>
                          <p className="body-sm journey__d">{stage.body}</p>
                          <p className="journey__out">
                            <span className="overline">Delivered</span>
                            {stage.deliverable}
                          </p>
                          {canJump ? (
                            <button
                              type="button"
                              className="journey__jump"
                              onClick={() => jumpToImage(shotIndex)}
                            >
                              See this step ↑
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}
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
    </div>

    {lightboxOpen && primary.src ? (
      <div
        className="project-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={`${item.title} — full image`}
        onClick={() => setLightboxOpen(false)}
      >
        <button
          type="button"
          className="project-lightbox__close"
          onClick={() => setLightboxOpen(false)}
          aria-label="Close zoom"
        >
          <X size={22} aria-hidden />
        </button>

        <div
          className="project-lightbox__frame"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={primary.src}
            alt={primary.alt}
            fill
            className="project-lightbox__photo"
            sizes="100vw"
            quality={100}
            priority
          />
        </div>

        {imageCount > 1 ? (
          <>
            <button
              type="button"
              className="project-lightbox__nav project-lightbox__nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft size={26} aria-hidden />
            </button>
            <button
              type="button"
              className="project-lightbox__nav project-lightbox__nav--next"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next image"
            >
              <ChevronRight size={26} aria-hidden />
            </button>
            <div className="project-lightbox__counter">
              {activeImage + 1} / {imageCount}
            </div>
          </>
        ) : null}
      </div>
    ) : null}
    </>,
    document.body,
  );
}

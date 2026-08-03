import type { FaqItem } from "@/lib/content";

type FaqListProps = {
  items: FaqItem[];
  className?: string;
};

export function FaqList({ items, className }: FaqListProps) {
  return (
    <div className={className}>
      {items.map((item) => (
        <details key={item.q} className="acc__item">
          <summary className="acc__trigger">
            {item.q}
            <span className="acc__icon" aria-hidden>
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <div className="acc__panel">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

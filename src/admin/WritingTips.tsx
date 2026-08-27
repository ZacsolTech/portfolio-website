import React from "react";

const TIPS = [
  { mark: "**text**", meaning: "Bold" },
  { mark: "## Heading", meaning: "Big heading" },
  { mark: "### Heading", meaning: "Smaller heading" },
  { mark: "[text](/page)", meaning: "Link" },
  { mark: "> text", meaning: "Quote" },
  { mark: "![description](/media/file.png)", meaning: "Photo in the article" },
];

export function WritingTips() {
  return (
    <aside className="zacsol-tips">
      <p className="zacsol-tips__title">How to format</p>
      <ul className="zacsol-tips__list">
        {TIPS.map((tip) => (
          <li key={tip.mark}>
            <code>{tip.mark}</code>
            <span>{tip.meaning}</span>
          </li>
        ))}
      </ul>
      <p className="zacsol-tips__note">
        Leave a blank line between paragraphs. Upload extra photos under Media
        first, then paste the line above on its own line.
      </p>
    </aside>
  );
}

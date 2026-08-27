import type { ReactNode } from "react";
import { ArticleImage } from "@/components/blog/article-image";

type Props = {
  paragraphs: string[];
};

function formatInline(text: string): string {
  const withBold = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(
    /\[([^\]]+)\]\((\/[^)\s]+|https:\/\/[^)\s]+)\)/g,
    '<a href="$2">$1</a>',
  );
}

function isTableRow(block: string): boolean {
  const trimmed = block.trim();
  return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

const IMAGE_RE =
  /^!\[([^\]]*)\]\(((?:\/|https:\/\/)[^)\s]+)(?:\s+"([^"]*)")?\)$/;

function parseImage(block: string) {
  const match = block.trim().match(IMAGE_RE);
  if (!match) return null;
  return { alt: match[1], src: match[2], caption: match[3] };
}

function parseRows(blocks: string[]): ReactNode {
  const lines = blocks
    .flatMap((b) => b.split("\n"))
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));

  const split = (line: string) => {
    const inner = line.startsWith("|") ? line.slice(1) : line;
    const withoutEnd = inner.endsWith("|") ? inner.slice(0, -1) : inner;
    return withoutEnd.split("|").map((c) => c.trim());
  };

  const dataLines = lines.filter((l) => !/^\|[\s-:|]+\|$/.test(l));
  if (dataLines.length < 2) return null;

  const header = split(dataLines[0]);
  const rows = dataLines.slice(1).map(split);

  return (
    <div className="article-table-wrap">
      <table>
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={`${i}-${j}`}
                  dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTextBlock(block: string, key: number): ReactNode {
  const image = parseImage(block);
  if (image) {
    return (
      <ArticleImage
        key={key}
        src={image.src}
        alt={image.alt}
        caption={image.caption}
      />
    );
  }
  if (block.startsWith("```")) {
    const inner = block.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
    return (
      <pre key={key} className="article-pre">
        <code>{inner}</code>
      </pre>
    );
  }
  if (block.startsWith("## ")) {
    return <h2 key={key}>{block.replace(/^##\s+/, "")}</h2>;
  }
  if (block.startsWith("### ")) {
    return <h3 key={key}>{block.replace(/^###\s+/, "")}</h3>;
  }
  if (block.startsWith("> ")) {
    return <blockquote key={key}>{block.replace(/^>\s+/, "")}</blockquote>;
  }
  return (
    <p key={key} dangerouslySetInnerHTML={{ __html: formatInline(block) }} />
  );
}

export function ArticleBody({ paragraphs }: Props) {
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    if (isTableRow(paragraphs[i])) {
      const rows = [paragraphs[i]];
      i += 1;
      while (i < paragraphs.length && isTableRow(paragraphs[i])) {
        rows.push(paragraphs[i]);
        i += 1;
      }
      const table = parseRows(rows);
      nodes.push(table ? <div key={`t-${i}`}>{table}</div> : renderTextBlock(rows.join("\n"), i));
      continue;
    }
    nodes.push(renderTextBlock(paragraphs[i], i));
    i += 1;
  }
  return <div className="article-body">{nodes}</div>;
}

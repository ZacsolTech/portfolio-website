/**
 * Split a markdown article into blocks for the public renderer.
 *
 * Blank lines separate paragraphs, except inside fenced code so a ``` sample
 * with empty lines stays one block.
 */
export function markdownToBlocks(source: string): string[] {
  const blocks: string[] = [];
  let buffer: string[] = [];
  let inFence = false;

  for (const line of source.replace(/\r\n/g, "\n").split("\n")) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      buffer.push(line);
      continue;
    }
    if (!inFence && line.trim() === "") {
      if (buffer.length) {
        blocks.push(buffer.join("\n"));
        buffer = [];
      }
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length) blocks.push(buffer.join("\n"));
  return blocks.filter((block) => block.trim());
}

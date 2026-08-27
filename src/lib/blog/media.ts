type MediaDoc = {
  url?: string | null;
  filename?: string | null;
  alt?: string | null;
  caption?: string | null;
};

/** Turn Payload's absolute media URLs into local paths next/image can load. */
export function publicImageSrc(src: string): string {
  const raw = src.trim();
  if (!raw || raw.startsWith("/")) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/api/media/") || parsed.pathname.startsWith("/media/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return raw;
  } catch {
    return raw;
  }
}

export function mediaUrl(file: MediaDoc | number | null | undefined): string {
  if (!file || typeof file === "number") return "";
  if (file.url?.trim()) return publicImageSrc(file.url.trim());
  if (file.filename?.trim()) return `/media/${file.filename.trim()}`;
  return "";
}

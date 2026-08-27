export const BLOG_PATH = "/blog";

export function blogPath(slug: string): string {
  return `${BLOG_PATH}/${slug}`;
}

/** Human date for listings and post headers — "August 27, 2026". */
export function formatBlogDate(value: string): string {
  const iso = value.length === 10 ? `${value}T12:00:00.000Z` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

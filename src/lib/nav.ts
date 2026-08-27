import { zac } from "@/lib/content/zac";

export const mainNav = [
  { href: "/services", label: "Services", id: "services" },
  { href: "/consultant", label: zac.consultant.navLabel, id: "ai-consultant" },
  { href: "/portfolio", label: "Projects", id: "work" },
  { href: "/blog", label: "Blog", id: "blog" },
  { href: "/industries", label: "Industries", id: "industries" },
  { href: "/about", label: "About", id: "about" },
  { href: "/contact", label: "Contact", id: "contact" },
] as const;

export type MainNavItem = (typeof mainNav)[number];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

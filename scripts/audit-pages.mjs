import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE = process.env.AUDIT_BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "scripts", "audit-out");
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { path: "/", name: "home", scrollTo: "#industries" },
  { path: "/industries", name: "industries" },
  { path: "/services", name: "services" },
  { path: "/portfolio", name: "portfolio" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
  { path: "/insights", name: "insights" },
  { path: "/consultant", name: "consultant" },
  { path: "/book", name: "book" },
  { path: "/tools/estimator", name: "estimator" },
  { path: "/tools/readiness", name: "readiness" },
];

function sniff(page) {
  return page.evaluate(() => {
    const issues = [];

    // Find elements that look like the white-pill bug: anchors with
    // background but display:inline / inline-* and block children
    document.querySelectorAll("a").forEach((a) => {
      const cs = getComputedStyle(a);
      const hasBg =
        cs.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        cs.backgroundColor !== "transparent";
      const isInline = cs.display === "inline" || cs.display === "inline-block";
      const hasBlockChild = [...a.children].some((c) => {
        const d = getComputedStyle(c).display;
        return d === "block" || d === "flex" || d === "grid";
      });
      if (hasBg && isInline && hasBlockChild) {
        const r = a.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          issues.push({
            type: "inline-link-with-bg",
            href: a.getAttribute("href"),
            className: a.className,
            display: cs.display,
            bg: cs.backgroundColor,
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
    });

    // Card links missing display:block
    document.querySelectorAll("a").forEach((a) => {
      if (!a.querySelector(".card, .card--media")) return;
      const cs = getComputedStyle(a);
      if (cs.display === "inline") {
        issues.push({
          type: "inline-card-link",
          href: a.getAttribute("href"),
          className: a.className,
        });
      }
    });

    // Industries cards
    const inds = [...document.querySelectorAll(".ind__c")].slice(0, 2).map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        display: cs.display,
        flexDirection: cs.flexDirection,
        bg: cs.backgroundColor,
        w: Math.round(r.width),
        h: Math.round(r.height),
        br: cs.borderRadius,
        className: el.className,
      };
    });

    // Overflowing text clipped oddly
    const clipped = [];
    document.querySelectorAll(".ind__s, .lead, .card p").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2) {
        clipped.push({
          text: (el.textContent || "").slice(0, 40),
          className: el.className,
        });
      }
    });

    // Hydration markers / next error overlay
    const nextError = !!document.querySelector(
      "nextjs-portal, [data-nextjs-dialog], #__next-build-error",
    );

    return {
      theme: document.documentElement.getAttribute("data-theme"),
      inds,
      issues,
      clipped: clipped.slice(0, 8),
      nextError,
      title: document.title,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const report = [];

for (const theme of ["light", "dark"]) {
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    try {
      const res = await page.goto(`${BASE}${p.path}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
        localStorage.setItem("theme", t);
      }, theme);
      await page.waitForTimeout(400);

      if (p.scrollTo) {
        const target = page.locator(p.scrollTo);
        if ((await target.count()) > 0) {
          await target.scrollIntoViewIfNeeded();
          await page.waitForTimeout(700);
        }
      }

      const data = await sniff(page);
      const shot = join(OUT, `${p.name}-${theme}.png`);
      if (p.scrollTo && (await page.locator(p.scrollTo).count()) > 0) {
        await page.locator(p.scrollTo).screenshot({ path: shot });
      } else {
        await page.screenshot({ path: shot, fullPage: false });
      }

      const entry = {
        path: p.path,
        theme,
        status: res?.status(),
        shot,
        ...data,
      };
      report.push(entry);
      console.log(
        `[${theme}] ${p.path} → ${res?.status()} issues=${data.issues.length} inds=${JSON.stringify(data.inds[0] || null)}`,
      );
    } catch (e) {
      console.error(`[${theme}] ${p.path} FAIL`, e.message);
      report.push({ path: p.path, theme, error: e.message });
    } finally {
      await page.close();
    }
  }
}

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log("\nWrote", join(OUT, "report.json"));
await browser.close();

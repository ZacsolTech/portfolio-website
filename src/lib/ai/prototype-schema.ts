import { z } from "zod";
import type { ServiceSlug } from "./schema";

/**
 * Prototype contract.
 *
 * The blueprint tells a visitor what we would build. This shows it to them —
 * a rendered mock of the thing itself, generated from their own conversation,
 * so a restaurant owner sees a restaurant homepage and an operations manager
 * sees their order flow as a diagram. It is the difference between a proposal
 * and a demonstration, and it is what earns a reply.
 *
 * The model returns a *specification*, never markup. Our own components render
 * it with our own type and spacing, which means three things that matter: it
 * cannot inject anything into the page, it cannot come back looking broken,
 * and it is legible in both themes without the model knowing either exists.
 *
 * Kind is forced from the recommended service line (see resolvePrototypeKind),
 * not left to the model — the mock has to match what we said we would build.
 */

/* --------------------------------- palette -------------------------------- */

/**
 * Accents the model may choose from.
 *
 * A prototype that wears our lime on every industry looks like our website
 * with someone else's words in it, so the model picks a tone for the sector.
 * It picks from a list rather than emitting a hex value: every entry here is
 * checked for contrast against both surfaces, and a free-text colour is one
 * unreadable headline away from making us look worse than no prototype at all.
 */
export const ACCENTS = [
  "amber",
  "emerald",
  "sky",
  "violet",
  "rose",
  "slate",
  "lime",
] as const;

export type Accent = (typeof ACCENTS)[number];

export const AccentSchema = z.enum(ACCENTS);

/* ---------------------------------- kinds --------------------------------- */

/**
 * What is being mocked. Resolved from the blueprint's serviceSlug so a mobile
 * engagement always shows a phone journey and an automation engagement always
 * shows a flow — never a generic homepage for every problem.
 */
export const PROTOTYPE_KINDS = [
  "landing",
  "dashboard",
  "workflow",
  "mobile",
  "pages",
] as const;
export type PrototypeKind = (typeof PROTOTYPE_KINDS)[number];

export const PROTOTYPE_KIND_LABELS: Record<PrototypeKind, string> = {
  landing: "Homepage concept",
  dashboard: "Dashboard concept",
  workflow: "Automation flow",
  mobile: "App screen flow",
  pages: "Website / page map",
};

/* --------------------------------- sections ------------------------------- */

export const SECTION_TYPES = [
  "hero",
  "features",
  "list",
  "stats",
  "testimonial",
  "gallery",
  "cta",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/**
 * One row inside a section.
 *
 * Deliberately flat and mostly optional. Gemini honours a single wide object
 * far more reliably than a discriminated union, so the model fills whichever
 * fields its section type needs and the renderer reads only those — a `price`
 * on a testimonial is ignored rather than being a validation failure that
 * costs the visitor their whole prototype.
 */
export const ProtoItemSchema = z.object({
  title: z.string().max(80).optional(),
  body: z.string().max(240).optional(),
  /** Headline figure for stats: "98%", "1,200", "4.8". */
  value: z.string().max(24).optional(),
  /** Caption under a value, or the attribution on a quote. */
  label: z.string().max(80).optional(),
  /** Menu prices, plan prices, anything money-shaped. Free text — it is a mock. */
  price: z.string().max(24).optional(),
});

export type ProtoItem = z.infer<typeof ProtoItemSchema>;

export const ProtoSectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  /** Small label above the section heading. */
  eyebrow: z.string().max(40).optional(),
  title: z.string().max(120).optional(),
  body: z.string().max(400).optional(),
  ctaPrimary: z.string().max(32).optional(),
  ctaSecondary: z.string().max(32).optional(),
  items: z.array(ProtoItemSchema).max(8).default([]),
});

export type ProtoSection = z.infer<typeof ProtoSectionSchema>;

/* -------------------------- screens / pages ------------------------------- */

/**
 * One phone screen or website page in a multi-surface mock.
 *
 * Mobile journeys and full site maps both use this shape so the model only
 * has to learn one nested object, and the renderer decides chrome (phone vs
 * browser) from the parent kind.
 */
export const ProtoScreenSchema = z.object({
  id: z.string().min(1).max(24),
  /** Short label: "Login", "Home", "Book a table". */
  title: z.string().min(1).max(40),
  /** One line on why this surface exists in their product. */
  purpose: z.string().max(120).optional(),
  sections: z.array(ProtoSectionSchema).max(5).default([]),
});

export type ProtoScreen = z.infer<typeof ProtoScreenSchema>;

/* -------------------------------- dashboard ------------------------------- */

export const ProtoKpiSchema = z.object({
  label: z.string().min(1).max(48),
  value: z.string().min(1).max(20),
  /** Movement against the previous period: "+12%", "-3.4%". */
  delta: z.string().max(16).optional(),
  trend: z.enum(["up", "down", "flat"]).default("flat"),
  /** Whether "up" is good here. Churn going up is not a win. */
  goodWhen: z.enum(["up", "down"]).default("up"),
});

export type ProtoKpi = z.infer<typeof ProtoKpiSchema>;

export const ProtoChartSchema = z.object({
  title: z.string().max(80),
  kind: z.enum(["bar", "line"]).default("bar"),
  /** Y-axis meaning, e.g. "orders per day". */
  unit: z.string().max(32).optional(),
  points: z
    .array(z.object({ label: z.string().max(16), value: z.number().min(0).max(1e9) }))
    .min(3)
    .max(14),
});

export type ProtoChart = z.infer<typeof ProtoChartSchema>;

export const ProtoTableSchema = z.object({
  title: z.string().max(80),
  columns: z.array(z.string().min(1).max(28)).min(2).max(5),
  rows: z.array(z.array(z.string().max(40)).max(5)).max(6),
  /**
   * Column index rendered as a status pill rather than plain text. Status is
   * the only thing anyone actually scans a table like this for.
   */
  statusColumn: z.number().int().min(0).max(4).optional(),
});

export type ProtoTable = z.infer<typeof ProtoTableSchema>;

/* -------------------------------- workflow -------------------------------- */

export const NODE_KINDS = ["trigger", "action", "ai", "condition", "output"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const ProtoNodeSchema = z.object({
  id: z.string().min(1).max(24),
  label: z.string().min(2).max(60),
  kind: z.enum(NODE_KINDS),
  /** The system this step touches: "WhatsApp", "Shopify", "Postgres". */
  app: z.string().max(32).optional(),
  detail: z.string().max(120).optional(),
});

export type ProtoNode = z.infer<typeof ProtoNodeSchema>;

export const ProtoEdgeSchema = z.object({
  from: z.string().min(1).max(24),
  to: z.string().min(1).max(24),
  /** Branch label on a condition: "in stock", "needs review". */
  label: z.string().max(28).optional(),
});

export type ProtoEdge = z.infer<typeof ProtoEdgeSchema>;

/* -------------------------------- prototype ------------------------------- */

export const PrototypeSchema = z.object({
  kind: z.enum(PROTOTYPE_KINDS),
  /** The product's name in the mock — theirs, or one that fits their business. */
  productName: z.string().min(1).max(48),
  /** One line under the title explaining what the visitor is looking at. */
  caption: z.string().min(8).max(200),
  accent: AccentSchema.default("lime"),

  /** landing (single long page) */
  sections: z.array(ProtoSectionSchema).max(8).default([]),
  /** Fake browser address, e.g. "bellavista.com". Presentation only. */
  url: z.string().max(60).optional(),

  /** mobile · pages — ordered journey or full site map */
  screens: z.array(ProtoScreenSchema).max(6).default([]),

  /** dashboard */
  nav: z.array(z.string().min(1).max(24)).max(6).default([]),
  kpis: z.array(ProtoKpiSchema).max(4).default([]),
  chart: ProtoChartSchema.optional(),
  table: ProtoTableSchema.optional(),

  /** workflow */
  nodes: z.array(ProtoNodeSchema).max(10).default([]),
  edges: z.array(ProtoEdgeSchema).max(14).default([]),

  promptVersion: z.string().optional(),
  source: z.enum(["gemini", "rules"]),
});

export type Prototype = z.infer<typeof PrototypeSchema>;

export const PROTOTYPE_PROMPT_VERSION = "consultant-prototype-v2";

/* ------------------------- service → kind policy -------------------------- */

const PROCESS_HINT =
  /\b(automat|workflow|integrat|whatsapp|email.?pipeline|hand.?off|approval|process|zapier|n8n|orchestrat|routing|ticket.?flow)\b/i;

/**
 * Pick the mock kind from the recommended service — and for custom software,
 * from whether the problem is really a process vs a product surface.
 */
export function resolvePrototypeKind(
  serviceSlug: ServiceSlug,
  hints?: { seed?: string; current?: string },
): PrototypeKind {
  switch (serviceSlug) {
    case "web-development":
    case "ui-ux-design":
      return "pages";
    case "data-science":
      return "landing";
    case "mobile-app-development":
      return "mobile";
    case "ai-automation":
    case "content-automation":
    case "business-process-automation":
      return "workflow";
    case "custom-software": {
      const text = `${hints?.seed ?? ""} ${hints?.current ?? ""}`;
      return PROCESS_HINT.test(text) ? "workflow" : "pages";
    }
    default:
      return "landing";
  }
}

/**
 * Whether a spec has enough in it to be worth showing.
 *
 * An empty frame with a caption under it is worse than no prototype: it reads
 * as a broken feature rather than a missing one. The consultant checks this
 * before it commits to rendering anything.
 */
export function isRenderable(prototype: Prototype | null | undefined): prototype is Prototype {
  if (!prototype) return false;
  switch (prototype.kind) {
    case "workflow":
      return prototype.nodes.length >= 2;
    case "dashboard":
      return prototype.kpis.length >= 2 || Boolean(prototype.chart) || Boolean(prototype.table);
    case "mobile":
    case "pages":
      return prototype.screens.length >= 3;
    default:
      return prototype.sections.length >= 2;
  }
}

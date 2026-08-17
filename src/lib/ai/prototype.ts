import { Type } from "@google/genai";
import {
  BLUEPRINT_MODELS,
  GeminiLadderError,
  TIMEOUTS,
  errorText,
  getGenAI,
  hasGemini,
  runWithLadder,
} from "./client";
import { parseJsonLoose } from "./partial-json";
import {
  ACCENTS,
  NODE_KINDS,
  PROTOTYPE_KINDS,
  PROTOTYPE_PROMPT_VERSION,
  PrototypeSchema,
  SECTION_TYPES,
  isRenderable,
  resolvePrototypeKind,
  type Prototype,
  type PrototypeKind,
} from "./prototype-schema";
import type { Blueprint, ConsultantAnswers, ServiceSlug } from "./schema";

/**
 * Prototype generation.
 *
 * Runs after the blueprint, against the same intake, and is allowed to fail:
 * the blueprint is the deliverable and the prototype is what makes the visitor
 * believe it. A null return costs a picture, never the roadmap.
 *
 * Kind is forced from serviceSlug so the mock matches the engagement we just
 * recommended — a mobile blueprint never draws a generic homepage.
 */

const MAX_OUTPUT_TOKENS = 4500;

type PrototypeBlueprint = Pick<
  Blueprint,
  "title" | "features" | "serviceTitle" | "serviceSlug"
>;

function kindBrief(kind: PrototypeKind): string {
  switch (kind) {
    case "pages":
      return `## pages (fixed)
- \`screens\`: 4-6 website pages the problem actually needs, in a sensible IA order.
- Screen 1 MUST be the landing / home page — hero, value prop, primary CTA.
- Remaining screens cover the other requirement pages (services/menu, booking, about, dashboard preview, contact, pricing, etc.) that their brief implies. Do not invent unrelated pages.
- Each screen: \`id\`, \`title\` (nav label), optional \`purpose\`, and 1-3 \`sections\` with real copy.
- \`url\`: a plausible domain for their business.
- Leave \`nodes\`, \`kpis\`, \`table\`, and top-level \`sections\` empty.`;
    case "mobile":
      return `## mobile (fixed)
- \`screens\`: 4-6 major app screens in the real user journey order (e.g. login → home → create post → comments → profile).
- Each screen is what they would tap through on a phone — short titles, UI copy, CTAs that belong on that screen.
- Each screen: \`id\`, \`title\`, optional \`purpose\`, and 1-3 \`sections\` (hero/features/list/stats/cta as phone UI blocks).
- Leave \`nodes\`, \`kpis\`, \`table\`, top-level \`sections\`, and \`url\` empty.`;
    case "workflow":
      return `## workflow (fixed)
- \`nodes\`: 4-8 steps. \`kind\` is one of ${NODE_KINDS.join(" | ")} — start with a \`trigger\`, end with an \`output\`. \`app\` is the real system that step touches ("WhatsApp", "Shopify", "Google Sheets", "Postgres"). \`label\` is what happens, in their vocabulary.
- \`edges\`: connect them by id, in order. Give a \`condition\` node two outgoing edges with short branch labels.
- Leave \`sections\`, \`screens\`, \`kpis\` and \`table\` empty.`;
    case "landing":
      return `## landing (fixed)
- \`sections\`: 5-7, covering nearly the whole site brief on one scrollable homepage — start with \`hero\`, then features/services, list or gallery of concrete offerings, stats or testimonial, and a final \`cta\`.
- Types: ${SECTION_TYPES.join(" | ")}.
  - hero: \`title\` is the headline, \`body\` one supporting line, \`ctaPrimary\` the action their customer takes. \`url\` is a plausible domain.
  - features / gallery: \`items\` with a \`title\` and one-line \`body\`.
  - list: a menu, a price list, a service list — \`items\` with \`title\`, \`body\` and \`price\`. Real dishes, real services, plausible prices.
  - stats: \`items\` with \`value\` and \`label\`.
  - testimonial: \`body\` is the quote, one item with \`label\` as the attribution.
  - cta: \`title\` and \`ctaPrimary\`.
- Leave \`nodes\`, \`screens\`, \`kpis\` and \`table\` empty.`;
    case "dashboard":
      return `## dashboard (fixed)
- \`nav\`: 3-5 section names from their domain.
- \`kpis\`: 3-4 metrics THEY would care about, with plausible values and movement. Set \`goodWhen\` to "down" for metrics where falling is a win.
- \`chart\`: 5-12 points with realistic shape.
- \`table\`: the working list they would actually stare at, 3-5 rows. Set \`statusColumn\` to the index of the status column.
- Leave \`sections\`, \`screens\` and \`nodes\` empty.`;
  }
}

export function buildPrototypeSystemPrompt(kind: PrototypeKind): string {
  return `You are ZAC — ZACSOL's principal designer, mocking up the thing a prospective client just described so they can see it rather than read about it.

This is the moment the visitor decides whether we understood them. Generic output loses them. If they said "we take orders on WhatsApp and lose half of them", the mock shows their actual steps and systems. If they run a restaurant called Bella Vista, every page says Bella Vista with Italian dishes and plausible prices — not "Product One" and "Your headline here".

## Kind is fixed
You MUST return \`"kind": "${kind}"\`. Do not choose another kind. The service line already decided the artifact; your job is to fill it with their problem.

${kindBrief(kind)}

## Every kind
- \`productName\`: their business name if they gave one, otherwise a name that fits their sector. Never a placeholder.
- \`caption\`: one line telling the visitor what they are looking at, addressed to them.
- \`accent\`: a tone that suits the sector — ${ACCENTS.join(", ")}. Warm for hospitality and retail, cooler for finance, healthcare and logistics. Do not default to lime for everything.

## Never
- Never write lorem ipsum, "Feature One", "Your text here", or any other placeholder.
- Never include prices for OUR services. Money in a mock is the client's own pricing.
- Never write HTML, CSS, markdown or emoji. You return data; we draw it.

Return ONLY JSON matching the schema.`;
}

export function buildPrototypeUserPrompt(input: {
  seed: string;
  answers: ConsultantAnswers;
  blueprint: PrototypeBlueprint;
  kind: PrototypeKind;
}): string {
  return `Problem, in the client's own words:
"""
${input.seed}
"""

Intake:
- Who it's for: ${input.answers.audience}
- How they cope now: ${input.answers.today}
- First release must-haves: ${input.answers.v1}
- Timing: ${input.answers.timing}

What we proposed to build for them:
- ${input.blueprint.title} (${input.blueprint.serviceTitle} · ${input.blueprint.serviceSlug})
- Deliverables: ${input.blueprint.features.slice(0, 8).join("; ")}

Fixed prototype kind: ${input.kind}
Prompt version: ${PROTOTYPE_PROMPT_VERSION}

Mock it up. Use their names, their vocabulary and their numbers. Cover the surfaces their problem actually requires.`;
}

/* ------------------------------ gemini schema ----------------------------- */

const itemSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    body: { type: Type.STRING },
    value: { type: Type.STRING },
    label: { type: Type.STRING },
    price: { type: Type.STRING },
  },
};

const sectionSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: [...SECTION_TYPES] },
    eyebrow: { type: Type.STRING },
    title: { type: Type.STRING },
    body: { type: Type.STRING },
    ctaPrimary: { type: Type.STRING },
    ctaSecondary: { type: Type.STRING },
    items: { type: Type.ARRAY, items: itemSchema },
  },
  required: ["type"],
};

const geminiPrototypeSchema = {
  type: Type.OBJECT,
  properties: {
    kind: { type: Type.STRING, enum: [...PROTOTYPE_KINDS] },
    productName: { type: Type.STRING },
    caption: { type: Type.STRING },
    accent: { type: Type.STRING, enum: [...ACCENTS] },
    url: { type: Type.STRING },
    sections: { type: Type.ARRAY, items: sectionSchema },
    screens: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          purpose: { type: Type.STRING },
          sections: { type: Type.ARRAY, items: sectionSchema },
        },
        required: ["id", "title"],
      },
    },
    nav: { type: Type.ARRAY, items: { type: Type.STRING } },
    kpis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          delta: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["up", "down", "flat"] },
          goodWhen: { type: Type.STRING, enum: ["up", "down"] },
        },
        required: ["label", "value"],
      },
    },
    chart: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        kind: { type: Type.STRING, enum: ["bar", "line"] },
        unit: { type: Type.STRING },
        points: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.NUMBER },
            },
            required: ["label", "value"],
          },
        },
      },
      required: ["title", "points"],
    },
    table: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        columns: { type: Type.ARRAY, items: { type: Type.STRING } },
        rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
        statusColumn: { type: Type.NUMBER },
      },
      required: ["title", "columns", "rows"],
    },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          kind: { type: Type.STRING, enum: [...NODE_KINDS] },
          app: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ["id", "label", "kind"],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ["from", "to"],
      },
    },
  },
  required: ["kind", "productName", "caption", "accent"],
};

/* ------------------------------ normalisation ----------------------------- */

function clip(value: unknown, max: number): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Placeholder copy the model falls back on when it has not understood the
 * business. One "Feature One" in a mock undoes the entire point of showing it,
 * so a section carrying them is dropped rather than rendered.
 */
const PLACEHOLDER =
  /lorem ipsum|your (headline|text|logo|content|title) here|feature (one|two|three)|product (one|two|three)|placeholder|sample text|tbd\b/i;

function isPlaceholder(...values: (string | undefined)[]): boolean {
  return values.some((v) => (v ? PLACEHOLDER.test(v) : false));
}

function normalizeItems(raw: unknown, cap: number) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, cap)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        title: clip(item.title, 80),
        body: clip(item.body, 240),
        value: clip(item.value, 24),
        label: clip(item.label, 80),
        price: clip(item.price, 24),
      };
    })
    .filter((item) => Object.values(item).some(Boolean))
    .filter((item) => !isPlaceholder(item.title, item.body, item.label));
}

function normalizeSections(raw: unknown, cap = 8) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, cap)
    .map((entry) => {
      const section = entry as Record<string, unknown>;
      const type = (SECTION_TYPES as readonly string[]).includes(String(section.type))
        ? (section.type as (typeof SECTION_TYPES)[number])
        : "features";
      return {
        type,
        eyebrow: clip(section.eyebrow, 40),
        title: clip(section.title, 120),
        body: clip(section.body, 400),
        ctaPrimary: clip(section.ctaPrimary, 32),
        ctaSecondary: clip(section.ctaSecondary, 32),
        items: normalizeItems(section.items, 8),
      };
    })
    .filter((section) => !isPlaceholder(section.title, section.body))
    // A section with neither a heading nor contents renders as a gap.
    .filter((section) => Boolean(section.title || section.body) || section.items.length > 0);
}

function normalizeScreens(raw: unknown) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 6)
    .map((entry, i) => {
      const screen = entry as Record<string, unknown>;
      const title = clip(screen.title, 40) ?? `Screen ${i + 1}`;
      return {
        id: clip(screen.id, 24) ?? `s${i + 1}`,
        title,
        purpose: clip(screen.purpose, 120),
        sections: normalizeSections(screen.sections, 5),
      };
    })
    .filter((screen) => screen.title.length >= 1)
    .filter((screen) => !isPlaceholder(screen.title, screen.purpose))
    .filter((screen) => screen.sections.length > 0 || Boolean(screen.purpose));
}

function normalizeGraph(rawNodes: unknown, rawEdges: unknown) {
  const nodes = (Array.isArray(rawNodes) ? rawNodes : [])
    .slice(0, 10)
    .map((entry) => {
      const node = entry as Record<string, unknown>;
      return {
        id: clip(node.id, 24) ?? "",
        label: clip(node.label, 60) ?? "",
        kind: (NODE_KINDS as readonly string[]).includes(String(node.kind))
          ? (node.kind as (typeof NODE_KINDS)[number])
          : "action",
        app: clip(node.app, 32),
        detail: clip(node.detail, 120),
      };
    })
    .filter((node) => node.id && node.label.length >= 2);

  const ids = new Set(nodes.map((n) => n.id));

  // An edge to a node that does not exist would draw a connector into empty
  // space, so it is dropped rather than rendered as a dangling line.
  const edges = (Array.isArray(rawEdges) ? rawEdges : [])
    .slice(0, 14)
    .map((entry) => {
      const edge = entry as Record<string, unknown>;
      return {
        from: clip(edge.from, 24) ?? "",
        to: clip(edge.to, 24) ?? "",
        label: clip(edge.label, 28),
      };
    })
    .filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to);

  return { nodes, edges };
}

function normalizeChart(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const chart = raw as Record<string, unknown>;

  const points = (Array.isArray(chart.points) ? chart.points : [])
    .slice(0, 14)
    .map((entry) => {
      const point = entry as Record<string, unknown>;
      return { label: clip(point.label, 16) ?? "", value: Number(point.value) };
    })
    .filter((p) => p.label && Number.isFinite(p.value) && p.value >= 0);

  const title = clip(chart.title, 80);
  if (!title || points.length < 3) return undefined;

  return {
    title,
    kind: chart.kind === "line" ? ("line" as const) : ("bar" as const),
    unit: clip(chart.unit, 32),
    points,
  };
}

function normalizeTable(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const table = raw as Record<string, unknown>;

  const columns = (Array.isArray(table.columns) ? table.columns : [])
    .slice(0, 5)
    .map((c) => clip(c, 28))
    .filter((c): c is string => Boolean(c));

  const title = clip(table.title, 80);
  if (!title || columns.length < 2) return undefined;

  // Ragged rows are the common failure. Padding beats dropping: a short row
  // still carries information, an absent table carries none.
  const rows = (Array.isArray(table.rows) ? table.rows : [])
    .slice(0, 6)
    .map((row) =>
      Array.from({ length: columns.length }, (_, i) =>
        clip(Array.isArray(row) ? row[i] : undefined, 40) ?? "—",
      ),
    )
    .filter((row) => row.some((cell) => cell !== "—"));

  if (rows.length === 0) return undefined;

  const statusColumn = Number(table.statusColumn);

  return {
    title,
    columns,
    rows,
    statusColumn:
      Number.isInteger(statusColumn) && statusColumn >= 0 && statusColumn < columns.length
        ? statusColumn
        : undefined,
  };
}

/**
 * Coerce a model draft into a renderable spec.
 *
 * Exported for the eval suite: this is where a bad generation is caught, and
 * "the renderer never receives a dangling edge or a ragged table row" is a
 * claim worth testing rather than asserting.
 *
 * When `forcedKind` is set (normal path), the service map wins over whatever
 * the model emitted — drift here would show a homepage for a mobile build.
 */
export function normalizePrototype(raw: unknown, forcedKind?: PrototypeKind): Prototype {
  const draft = (typeof raw === "string" ? parseJsonLoose(raw) : raw) as Record<string, unknown>;

  const kind =
    forcedKind ??
    ((PROTOTYPE_KINDS as readonly string[]).includes(String(draft.kind))
      ? (draft.kind as PrototypeKind)
      : "landing");

  const { nodes, edges } = normalizeGraph(draft.nodes, draft.edges);
  const screens = normalizeScreens(draft.screens);

  const kpis = (Array.isArray(draft.kpis) ? draft.kpis : [])
    .slice(0, 4)
    .map((entry) => {
      const kpi = entry as Record<string, unknown>;
      return {
        label: clip(kpi.label, 48) ?? "",
        value: clip(kpi.value, 20) ?? "",
        delta: clip(kpi.delta, 16),
        trend:
          kpi.trend === "up" || kpi.trend === "down" ? (kpi.trend as "up" | "down") : ("flat" as const),
        goodWhen: kpi.goodWhen === "down" ? ("down" as const) : ("up" as const),
      };
    })
    .filter((kpi) => kpi.label && kpi.value);

  const multiSurface = kind === "mobile" || kind === "pages";

  return PrototypeSchema.parse({
    kind,
    productName: clip(draft.productName, 48) ?? "Your product",
    caption: clip(draft.caption, 200) ?? "A first look at what we would build.",
    accent: (ACCENTS as readonly string[]).includes(String(draft.accent)) ? draft.accent : "lime",
    url: kind === "landing" || kind === "pages" || kind === "dashboard" ? clip(draft.url, 60) : undefined,
    sections: kind === "landing" ? normalizeSections(draft.sections, 8) : [],
    screens: multiSurface ? screens : [],
    nav: (Array.isArray(draft.nav) ? draft.nav : [])
      .slice(0, 6)
      .map((n) => clip(n, 24))
      .filter((n): n is string => Boolean(n)),
    kpis: kind === "dashboard" ? kpis : [],
    chart: kind === "dashboard" ? normalizeChart(draft.chart) : undefined,
    table: kind === "dashboard" ? normalizeTable(draft.table) : undefined,
    nodes: kind === "workflow" ? nodes : [],
    edges: kind === "workflow" ? edges : [],
    promptVersion: PROTOTYPE_PROMPT_VERSION,
    source: "gemini",
  });
}

/* ------------------------------ rules fallback ---------------------------- */

function buildWorkflowFallback(input: {
  answers: ConsultantAnswers;
  blueprint: PrototypeBlueprint;
}): Prototype {
  const features = input.blueprint.features.slice(0, 5);

  const nodes = [
    {
      id: "n0",
      label: `Work arrives from ${input.answers.today.toLowerCase()}`.slice(0, 60),
      kind: "trigger" as const,
      app: undefined,
      detail: undefined,
    },
    ...features.map((feature, i) => ({
      id: `n${i + 1}`,
      label: feature.slice(0, 60),
      kind: "action" as const,
      app: undefined,
      detail: undefined,
    })),
    {
      id: "out",
      label: "Result back to the team",
      kind: "output" as const,
      app: undefined,
      detail: undefined,
    },
  ];

  const edges = nodes.slice(0, -1).map((node, i) => ({
    from: node.id,
    to: nodes[i + 1]!.id,
    label: undefined,
  }));

  return PrototypeSchema.parse({
    kind: "workflow",
    productName: input.blueprint.title.slice(0, 48),
    caption: `How work for ${input.answers.audience.toLowerCase()} would move through the system we are proposing.`.slice(
      0,
      200,
    ),
    accent: "lime",
    nodes,
    edges,
    promptVersion: PROTOTYPE_PROMPT_VERSION,
    source: "rules",
  });
}

function buildLandingFallback(input: {
  answers: ConsultantAnswers;
  blueprint: PrototypeBlueprint;
}): Prototype {
  const features = input.blueprint.features.slice(0, 4);
  return PrototypeSchema.parse({
    kind: "landing",
    productName: input.blueprint.title.slice(0, 48),
    caption: `A first look at a site shaped for ${input.answers.audience.toLowerCase()}.`.slice(0, 200),
    accent: "lime",
    url: "yoursite.example",
    sections: [
      {
        type: "hero" as const,
        title: input.blueprint.title.slice(0, 120),
        body: `Built for ${input.answers.audience.toLowerCase()} — replacing ${input.answers.today.toLowerCase()}.`.slice(
          0,
          400,
        ),
        ctaPrimary: "Get started",
        items: [],
      },
      {
        type: "features" as const,
        title: "What visitors can do",
        items: features.map((f) => ({ title: f.slice(0, 80), body: undefined })),
      },
      {
        type: "cta" as const,
        title: "Ready when you are",
        ctaPrimary: "Talk to us",
        items: [],
      },
    ],
    promptVersion: PROTOTYPE_PROMPT_VERSION,
    source: "rules",
  });
}

function buildScreensFallback(input: {
  answers: ConsultantAnswers;
  blueprint: PrototypeBlueprint;
  kind: "mobile" | "pages";
}): Prototype {
  const features = input.blueprint.features.slice(0, 4);
  const v1Bits = input.answers.v1
    .split(/[,;/]| and /i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3)
    .slice(0, 4);
  const pageTitles =
    v1Bits.length >= 2
      ? v1Bits.map((bit) => bit.slice(0, 40))
      : features.map((f) => f.slice(0, 40));

  const screens: Array<{
    id: string;
    title: string;
    purpose: string;
    sections: Array<{
      type: (typeof SECTION_TYPES)[number];
      title: string;
      body?: string;
      ctaPrimary?: string;
      ctaSecondary?: string;
      items: Array<{ title?: string; body?: string; price?: string }>;
    }>;
  }> = [
    {
      id: "s1",
      title: input.kind === "mobile" ? "Home" : "Home",
      purpose:
        input.kind === "pages"
          ? "Landing — first impression for the people who will use this."
          : "Primary entry — what the product is for.",
      sections:
        input.kind === "pages"
          ? [
              {
                type: "hero",
                title: input.blueprint.title.slice(0, 120),
                body: `Built for ${input.answers.audience.toLowerCase()}. Replaces ${input.answers.today.toLowerCase()}.`.slice(
                  0,
                  400,
                ),
                ctaPrimary: "Get started",
                ctaSecondary: "See how it works",
                items: [],
              },
              {
                type: "features",
                title: "What you can do here",
                items: features.slice(0, 3).map((f) => ({
                  title: f.slice(0, 80),
                  body: `Part of the first release: ${input.answers.v1.slice(0, 120)}`,
                })),
              },
              {
                type: "cta",
                title: "Ready when you are",
                ctaPrimary: "Start now",
                items: [],
              },
            ]
          : [
              {
                type: "hero",
                title: input.blueprint.title.slice(0, 120),
                body: `For ${input.answers.audience.toLowerCase()}.`.slice(0, 400),
                ctaPrimary: "Open",
                items: [],
              },
            ],
    },
    ...pageTitles.slice(0, 3).map((title, i) => ({
      id: `s${i + 2}`,
      title,
      purpose: "A core surface from the first-release scope.",
      sections: [
        {
          type: "features" as const,
          title: title.slice(0, 120),
          body: `For ${input.answers.audience.toLowerCase()} — replacing ${input.answers.today.toLowerCase()}.`.slice(
            0,
            400,
          ),
          items: [
            { title: "Primary action", body: title.slice(0, 240) },
            { title: "Why it matters", body: input.answers.v1.slice(0, 240) },
          ],
        },
        {
          type: "cta" as const,
          title: "Continue",
          ctaPrimary: "Next",
          items: [],
        },
      ],
    })),
  ];

  // Pad to 3 screens so isRenderable passes even on thin feature lists.
  while (screens.length < 3) {
    const n = screens.length + 1;
    screens.push({
      id: `s${n}`,
      title: n === 2 ? "Details" : "Contact",
      purpose: "Supporting surface for the proposed product.",
      sections: [
        {
          type: "cta",
          title: input.blueprint.title.slice(0, 120),
          ctaPrimary: "Continue",
          items: [],
        },
      ],
    });
  }

  return PrototypeSchema.parse({
    kind: input.kind,
    productName: input.blueprint.title.slice(0, 48),
    caption:
      input.kind === "mobile"
        ? `Major screens for the app we would build for ${input.answers.audience.toLowerCase()}.`.slice(
            0,
            200,
          )
        : `Website concept for ${input.answers.audience.toLowerCase()} — landing plus the pages your brief needs.`.slice(
            0,
            200,
          ),
    accent: "emerald",
    url: input.kind === "pages" ? "yoursite.example" : undefined,
    screens,
    promptVersion: PROTOTYPE_PROMPT_VERSION,
    source: "rules",
  });
}

/**
 * A prototype without the model.
 *
 * Built from the blueprint's own feature list and service line, so it is still
 * about their project — but it is a thinner stand-in than a Gemini mock, and
 * honest about being the lesser output.
 */
export function buildRulesPrototype(input: {
  answers: ConsultantAnswers;
  blueprint: PrototypeBlueprint;
  seed?: string;
}): Prototype {
  const kind = resolvePrototypeKind(input.blueprint.serviceSlug as ServiceSlug, {
    seed: input.seed,
    current: input.answers.today,
  });

  if (kind === "workflow") return buildWorkflowFallback(input);
  if (kind === "landing" || kind === "dashboard") return buildLandingFallback(input);
  return buildScreensFallback({ ...input, kind: kind === "mobile" ? "mobile" : "pages" });
}

/* -------------------------------- generation ------------------------------ */

export type GeneratePrototypeResult = {
  prototype: Prototype | null;
  usedFallback: boolean;
  model?: string;
  error?: string;
};

/**
 * Generate a prototype for a blueprint.
 *
 * Never throws and never blocks: the blueprint is what the visitor was
 * promised, and a mock that could not be drawn should cost them a picture
 * rather than their roadmap.
 */
export async function generatePrototype(input: {
  seed: string;
  answers: ConsultantAnswers;
  blueprint: PrototypeBlueprint;
}): Promise<GeneratePrototypeResult> {
  const kind = resolvePrototypeKind(input.blueprint.serviceSlug as ServiceSlug, {
    seed: input.seed,
    current: input.answers.today,
  });

  if (!hasGemini()) {
    const prototype = buildRulesPrototype(input);
    return { prototype, usedFallback: true, error: "GEMINI_API_KEY missing" };
  }

  try {
    const { value, model } = await runWithLadder(
      BLUEPRINT_MODELS,
      TIMEOUTS.blueprint,
      async (candidate, signal) => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: candidate,
          contents: buildPrototypeUserPrompt({ ...input, kind }),
          config: {
            systemInstruction: buildPrototypeSystemPrompt(kind),
            responseMimeType: "application/json",
            responseSchema: geminiPrototypeSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            // Higher than the blueprint: this is the creative half, and a mock
            // that reads as boilerplate fails at the only job it has.
            temperature: 0.75,
            abortSignal: signal,
          },
        });

        const text = response.text;
        if (!text?.trim()) throw new Error(`Empty prototype response (${candidate})`);

        const prototype = normalizePrototype(text, kind);
        // Half a prototype is worse than none — try the next model instead.
        if (!isRenderable(prototype)) {
          throw new Error(`Prototype too thin to render (${candidate})`);
        }
        return prototype;
      },
      { label: "consultant:prototype", attemptsPerModel: 1 },
    );

    return { prototype: value, usedFallback: false, model };
  } catch (err) {
    const error =
      err instanceof GeminiLadderError
        ? err.failures.map((f) => `${f.model}[${f.kind}]`).join(" | ")
        : errorText(err);
    console.warn("[consultant] prototype fell back to rules:", error.slice(0, 200));

    const prototype = buildRulesPrototype(input);
    return {
      prototype: isRenderable(prototype) ? prototype : null,
      usedFallback: true,
      error,
    };
  }
}

/**
 * Vendor price    — the running cost of a project, in code.
 *
 * The division of labour here is the whole point. A visitor asking "what does
 * an n8n automation cost?" wants three numbers: the n8n subscription, the model
 * API spend, and the build. Only the last of those is our own rate card; the
 * other two are somebody else's price list, and a language model asked to
 * recall them will confidently invent a tier that does not exist.
 *
 * So the model chooses *which* products a project needs and *how much of them*
 * it will consume — both genuine judgement calls about the project in front of
 * it. This file supplies every actual figure. That keeps the estimate specific
 * to the conversation while leaving every number traceable to a line you can
 * point at in a sales call.
 *
 * Prices are list prices in USD, monthly, and go stale. `PRICES_AS_OF` is the
 * date they were last checked — surface it, and re-check it, rather than
 * letting a two-year-old figure quietly anchor a quote.
 */

export const PRICES_AS_OF = "2026-02";

export const RUN_COST_CATEGORIES = [
  "automation",
  "ai-model",
  "hosting",
  "database",
  "auth",
  "comms",
  "payments",
  "storage",
  "analytics",
  "search",
  "monitoring",
  "other",
] as const;

export type RunCostCategory = (typeof RUN_COST_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<RunCostCategory, string> = {
  automation: "Workflow & automation",
  "ai-model": "AI model usage",
  hosting: "Hosting & compute",
  database: "Database",
  auth: "Authentication",
  comms: "Messaging & comms",
  payments: "Payments",
  storage: "File storage & media",
  analytics: "Analytics",
  search: "Search",
  monitoring: "Monitoring",
  other: "Other services",
};

/**
 * A metered charge. `per` is the block size the unit price is quoted in —
 * $0.30 per 1,000,000 tokens is `{ unitUsd: 0.3, per: 1_000_000 }` — because
 * every vendor quotes in a different block and normalising at read time is how
 * you end up a thousand times out.
 *
 * For plans sold as an allowance rather than a meter, `unitUsd` is the *cost
 * of going over*, derived from what the next tier up charges per unit. It must
 * never be zero: a rate of zero models a subscription with unlimited usage,
 * which no vendor sells, and it would quietly quote a client four times their
 * allowance at the entry-tier price.
 */
export type Meter = {
  id: string;
  label: string;
  /** What one unit is, in the words the model should think in. */
  unit: string;
  unitUsd: number;
  per: number;
  /** Units included in the base fee before metering starts. */
  includedUnits?: number;
};

export type CatalogEntry = {
  key: string;
  vendor: string;
  /** The specific tier. "Pro", not "paid plan" — vagueness is what we're fixing. */
  plan: string;
  category: RunCostCategory;
  /** Fixed monthly fee before any metered usage. */
  baseMonthlyUsd: number;
  /** When set, `baseMonthlyUsd` is charged per seat and the plan needs a count. */
  perSeat?: boolean;
  meters?: Meter[];
  /** Shown under the line. Where the money actually goes, or how to avoid it. */
  note?: string;
  /** A cheaper route we would genuinely recommend. Candour sells better. */
  cheaperAlternative?: string;
};

/* ------------------------------------------------------------------ *
 * The catalog
 *
 * Kept deliberately small. Every key here is injected into the model's
 * prompt, so this list is a menu it must choose from — a hundred niche
 * entries would cost context and buy nothing. Add a product when we have
 * actually deployed it for a client.
 * ------------------------------------------------------------------ */

const ENTRIES: CatalogEntry[] = [
  /* ------------------------------- automation ------------------------------ */
  {
    key: "n8n-cloud-starter",
    vendor: "n8n",
    plan: "Cloud Starter",
    category: "automation",
    baseMonthlyUsd: 24,
    meters: [
      {
        id: "executions",
        label: "Workflow executions",
        unit: "executions/month",
        // Beyond the allowance you are on Pro, whose $60/10k works out here.
        unitUsd: 0.006,
        per: 1,
        includedUnits: 2_500,
      },
    ],
    note: "Includes 2,500 workflow executions and 5 active workflows; past that you move up a tier.",
    cheaperAlternative: "Self-hosting n8n on a $12/mo VPS removes this fee entirely.",
  },
  {
    key: "n8n-cloud-pro",
    vendor: "n8n",
    plan: "Cloud Pro",
    category: "automation",
    baseMonthlyUsd: 60,
    meters: [
      {
        id: "executions",
        label: "Workflow executions",
        unit: "executions/month",
        unitUsd: 0.005,
        per: 1,
        includedUnits: 10_000,
      },
    ],
    note: "10,000 executions, 15 active workflows, and execution history you can debug from.",
  },
  {
    key: "n8n-self-hosted",
    vendor: "n8n",
    plan: "Community (self-hosted)",
    category: "automation",
    baseMonthlyUsd: 14,
    note: "The licence is free; this is the small VPS it runs on. You own the box and the upgrades.",
  },
  {
    key: "make-core",
    vendor: "Make",
    plan: "Core",
    category: "automation",
    baseMonthlyUsd: 12,
    meters: [
      {
        id: "operations",
        label: "Operations",
        unit: "operations/month",
        unitUsd: 0.0009,
        per: 1,
        includedUnits: 10_000,
      },
    ],
    note: "Priced per operation, and one scenario run is many operations — volume moves this fast.",
  },
  {
    key: "zapier-professional",
    vendor: "Zapier",
    plan: "Professional",
    category: "automation",
    baseMonthlyUsd: 49,
    note: "Fastest to stand up, most expensive to scale. Worth it below ~2,000 tasks a month.",
    cheaperAlternative: "n8n does the same job for a fraction of this once volume is real.",
  },
  {
    key: "temporal-cloud",
    vendor: "Temporal",
    plan: "Cloud (usage-based)",
    category: "automation",
    baseMonthlyUsd: 100,
    note: "For long-running, must-not-drop workflows. Overkill unless failure is expensive.",
  },

  /* -------------------------------- ai models ------------------------------- */
  {
    key: "gemini-flash-lite",
    vendor: "Google",
    plan: "Gemini Flash Lite",
    category: "ai-model",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "input-tokens",
        label: "Input tokens",
        unit: "input tokens/month",
        unitUsd: 0.1,
        per: 1_000_000,
      },
      {
        id: "output-tokens",
        label: "Output tokens",
        unit: "output tokens/month",
        unitUsd: 0.4,
        per: 1_000_000,
      },
    ],
    note: "Cheapest model that still follows a schema reliably. Right default for classification and routing.",
  },
  {
    key: "gemini-flash",
    vendor: "Google",
    plan: "Gemini Flash",
    category: "ai-model",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "input-tokens",
        label: "Input tokens",
        unit: "input tokens/month",
        unitUsd: 0.3,
        per: 1_000_000,
      },
      {
        id: "output-tokens",
        label: "Output tokens",
        unit: "output tokens/month",
        unitUsd: 2.5,
        per: 1_000_000,
      },
    ],
    note: "The workhorse. Output tokens cost roughly eight times input, so response length is the lever.",
  },
  {
    key: "gemini-pro",
    vendor: "Google",
    plan: "Gemini Pro",
    category: "ai-model",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "input-tokens",
        label: "Input tokens",
        unit: "input tokens/month",
        unitUsd: 1.25,
        per: 1_000_000,
      },
      {
        id: "output-tokens",
        label: "Output tokens",
        unit: "output tokens/month",
        unitUsd: 10,
        per: 1_000_000,
      },
    ],
    note: "Reserved for the reasoning-heavy step. Routing everything here is the most common way AI bills surprise people.",
  },
  {
    key: "gemini-embeddings",
    vendor: "Google",
    plan: "Text embeddings",
    category: "ai-model",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "input-tokens",
        label: "Embedded tokens",
        unit: "tokens embedded/month",
        unitUsd: 0.15,
        per: 1_000_000,
      },
    ],
    note: "Charged on the initial corpus load and again on every re-index, not just on queries.",
  },
  {
    key: "speech-to-text",
    vendor: "Google",
    plan: "Speech-to-Text",
    category: "ai-model",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "audio-minutes",
        label: "Audio transcribed",
        unit: "minutes of audio/month",
        unitUsd: 0.016,
        per: 1,
      },
    ],
  },

  /* --------------------------------- hosting -------------------------------- */
  {
    key: "vercel-pro",
    vendor: "Vercel",
    plan: "Pro",
    category: "hosting",
    baseMonthlyUsd: 20,
    perSeat: true,
    note: "Per seat. Bandwidth and function time beyond the included allowance bill on top.",
  },
  {
    key: "vercel-hobby",
    vendor: "Vercel",
    plan: "Hobby",
    category: "hosting",
    baseMonthlyUsd: 0,
    note: "Free, and fine until you have a commercial user base or need a team seat.",
  },
  {
    key: "aws-small",
    vendor: "AWS",
    plan: "Small production footprint",
    category: "hosting",
    baseMonthlyUsd: 120,
    note: "Container service, load balancer, logs and backups for a low-traffic production app.",
  },
  {
    key: "aws-medium",
    vendor: "AWS",
    plan: "Mid-size production footprint",
    category: "hosting",
    baseMonthlyUsd: 450,
    note: "Multi-AZ, autoscaling, staging environment alongside production.",
  },
  {
    key: "vps-small",
    vendor: "Hetzner / DigitalOcean",
    plan: "Small VPS",
    category: "hosting",
    baseMonthlyUsd: 14,
    note: "One box you manage yourself. Cheapest credible option, and you own the patching.",
  },

  /* -------------------------------- database -------------------------------- */
  {
    key: "supabase-pro",
    vendor: "Supabase",
    plan: "Pro",
    category: "database",
    baseMonthlyUsd: 25,
    note: "Postgres, auth and file storage in one bill. Usually replaces two other lines here.",
  },
  {
    key: "neon-scale",
    vendor: "Neon",
    plan: "Scale",
    category: "database",
    baseMonthlyUsd: 69,
    note: "Serverless Postgres with branching — worth it when preview environments matter.",
  },
  {
    key: "managed-postgres-small",
    vendor: "Managed Postgres",
    plan: "Small instance",
    category: "database",
    baseMonthlyUsd: 30,
    note: "Single instance with daily backups. No read replica.",
  },
  {
    key: "managed-postgres-ha",
    vendor: "Managed Postgres",
    plan: "High-availability",
    category: "database",
    baseMonthlyUsd: 190,
    note: "Primary plus standby with automatic failover. The line item that buys you a night's sleep.",
  },
  {
    key: "redis-managed",
    vendor: "Upstash / Redis Cloud",
    plan: "Managed Redis",
    category: "database",
    baseMonthlyUsd: 10,
    note: "Caching, queues and rate limiting.",
  },
  {
    key: "vector-db",
    vendor: "Pinecone / pgvector",
    plan: "Managed vector store",
    category: "database",
    baseMonthlyUsd: 25,
    note: "pgvector on the Postgres you already pay for is usually enough below a few million vectors.",
    cheaperAlternative: "Use pgvector in your existing database and drop this line.",
  },

  /* ---------------------------------- auth ---------------------------------- */
  {
    key: "clerk-pro",
    vendor: "Clerk",
    plan: "Pro",
    category: "auth",
    baseMonthlyUsd: 25,
    meters: [
      {
        id: "mau",
        label: "Monthly active users",
        unit: "monthly active users",
        unitUsd: 0.02,
        per: 1,
        includedUnits: 10_000,
      },
    ],
  },
  {
    key: "auth0-essentials",
    vendor: "Auth0",
    plan: "Essentials",
    category: "auth",
    baseMonthlyUsd: 35,
    meters: [
      {
        id: "mau",
        label: "Monthly active users",
        unit: "monthly active users",
        unitUsd: 0.03,
        per: 1,
        includedUnits: 500,
      },
    ],
    note: "Enterprise SSO sits on a higher tier again — check before promising it.",
  },

  /* ---------------------------------- comms --------------------------------- */
  {
    key: "twilio-sms",
    vendor: "Twilio",
    plan: "SMS",
    category: "comms",
    baseMonthlyUsd: 2,
    meters: [
      {
        id: "messages",
        label: "SMS sent",
        unit: "messages/month",
        unitUsd: 0.0079,
        per: 1,
      },
    ],
    note: "US rate. International and long messages cost multiples of this.",
  },
  {
    key: "twilio-whatsapp",
    vendor: "Twilio",
    plan: "WhatsApp Business API",
    category: "comms",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "conversations",
        label: "Conversations",
        unit: "24h conversations/month",
        unitUsd: 0.03,
        per: 1,
      },
    ],
    note: "Billed per 24-hour conversation window, not per message.",
  },
  {
    key: "resend-pro",
    vendor: "Resend",
    plan: "Pro",
    category: "comms",
    baseMonthlyUsd: 20,
    meters: [
      {
        id: "emails",
        label: "Emails sent",
        unit: "emails/month",
        unitUsd: 0.0004,
        per: 1,
        includedUnits: 50_000,
      },
    ],
  },
  {
    key: "email-transactional-free",
    vendor: "Resend / SES",
    plan: "Free tier",
    category: "comms",
    baseMonthlyUsd: 0,
    note: "Fine below a few thousand emails a month.",
  },

  /* -------------------------------- payments -------------------------------- */
  {
    key: "stripe",
    vendor: "Stripe",
    plan: "Standard",
    category: "payments",
    baseMonthlyUsd: 0,
    meters: [
      {
        id: "volume",
        label: "Payment volume",
        unit: "USD processed/month",
        unitUsd: 0.029,
        per: 1,
      },
    ],
    note: "2.9% plus 30¢ a transaction. Comes out of revenue rather than budget, but it is real money.",
  },

  /* --------------------------------- storage -------------------------------- */
  {
    key: "object-storage",
    vendor: "S3 / R2",
    plan: "Object storage",
    category: "storage",
    baseMonthlyUsd: 5,
    meters: [
      {
        id: "gb-stored",
        label: "Stored data",
        unit: "GB stored/month",
        unitUsd: 0.023,
        per: 1,
      },
    ],
  },
  {
    key: "media-cdn",
    vendor: "Cloudinary / Mux",
    plan: "Media pipeline",
    category: "storage",
    baseMonthlyUsd: 89,
    note: "Image and video transcoding. Only needed when user-generated media is core.",
  },

  /* ------------------------- analytics · search · ops ------------------------ */
  {
    key: "analytics-basic",
    vendor: "Plausible / PostHog",
    plan: "Product analytics",
    category: "analytics",
    baseMonthlyUsd: 19,
  },
  {
    key: "metabase-cloud",
    vendor: "Metabase",
    plan: "Starter Cloud",
    category: "analytics",
    baseMonthlyUsd: 85,
    note: "Self-hosted Metabase is free if someone will own the container.",
  },
  {
    key: "clickhouse-cloud",
    vendor: "ClickHouse",
    plan: "Development",
    category: "analytics",
    baseMonthlyUsd: 50,
    note: "Only earns its place above roughly 50M rows or sub-second dashboards.",
  },
  {
    key: "search-managed",
    vendor: "Algolia / Typesense",
    plan: "Managed search",
    category: "search",
    baseMonthlyUsd: 30,
    cheaperAlternative: "Postgres full-text search covers most catalogues under ~50k records.",
  },
  {
    key: "monitoring-basic",
    vendor: "Sentry / Better Stack",
    plan: "Team",
    category: "monitoring",
    baseMonthlyUsd: 26,
    note: "Error tracking and uptime alerts. The first thing cut and the first thing missed.",
  },

  /* --------------------------------- generic -------------------------------- */
  /*
   * Escape hatches. A project will always need something we have not listed —
   * their POS, a regional payment gateway, an industry data feed. Without a
   * bucket to put it in the model either omits the cost entirely or invents a
   * vendor tier, and both are worse than an honest placeholder.
   */
  {
    key: "third-party-saas-small",
    vendor: "Third-party service",
    plan: "Entry tier",
    category: "other",
    baseMonthlyUsd: 25,
    note: "Placeholder for a tool we have not priced. Confirmed during discovery.",
  },
  {
    key: "third-party-saas-mid",
    vendor: "Third-party service",
    plan: "Business tier",
    category: "other",
    baseMonthlyUsd: 99,
    note: "Placeholder for a tool we have not priced. Confirmed during discovery.",
  },
  {
    key: "third-party-saas-large",
    vendor: "Third-party service",
    plan: "Enterprise tier",
    category: "other",
    baseMonthlyUsd: 400,
    note: "Placeholder for a tool we have not priced. Confirmed during discovery.",
  },
];

export const CATALOG: Record<string, CatalogEntry> = Object.fromEntries(
  ENTRIES.map((entry) => [entry.key, entry]),
);

export const CATALOG_KEYS = ENTRIES.map((e) => e.key);

export function catalogEntry(key: string): CatalogEntry | undefined {
  return CATALOG[key];
}

/* ------------------------------------------------------------------ *
 * Pricing a selection
 * ------------------------------------------------------------------ */

export type UsageVolume = { meter: string; volume: number };

/** What the model asks for: a product, a quantity, and how hard it gets used. */
export type RunCostSelection = {
  key: string;
  /** Seats, instances, or phone numbers, depending on the entry. Defaults to 1. */
  qty?: number;
  usage?: UsageVolume[];
  /** The model's justification, in project terms. Shown to the visitor. */
  why?: string;
};

export type RunCostLine = {
  key: string;
  vendor: string;
  plan: string;
  category: RunCostCategory;
  /** Fixed portion — a subscription we can state with confidence. */
  fixedUsd: number;
  /** Usage portion — a projection, and the part that moves. */
  meteredUsd: number;
  monthlyUsd: number;
  /** One line per meter: "12.0M input tokens · $3.60". */
  meterDetail: string[];
  why?: string;
  note?: string;
  cheaperAlternative?: string;
};

function formatUnits(volume: number): string {
  if (volume >= 1_000_000) {
    const m = volume / 1_000_000;
    return `${m >= 10 || Number.isInteger(m) ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    const k = volume / 1_000;
    return `${k >= 10 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)}k`;
  }
  return String(Math.round(volume));
}

function formatMoney(value: number): string {
  if (value === 0) return "$0";
  if (value < 1) return `$${value.toFixed(2)}`;
  if (value < 100) return `$${value.toFixed(value < 10 ? 2 : 0)}`;
  return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Turn one selection into a costed line.
 *
 * `usageMultiplier` is how the scale lever reaches metered products: doubling
 * the user base doubles the token spend but not the subscription, and a model
 * that quoted volumes for 5,000 users should not be re-asked when the visitor
 * drags the slider to 50,000.
 */
export function priceSelection(
  selection: RunCostSelection,
  usageMultiplier = 1,
): RunCostLine | null {
  const entry = catalogEntry(selection.key);
  if (!entry) return null;

  const qty = Math.max(1, Math.min(500, Math.round(selection.qty ?? 1)));
  const fixedUsd = entry.perSeat ? entry.baseMonthlyUsd * qty : entry.baseMonthlyUsd;

  let meteredUsd = 0;
  const meterDetail: string[] = [];

  for (const meter of entry.meters ?? []) {
    const supplied = selection.usage?.find((u) => u.meter === meter.id);
    if (!supplied) continue;

    const volume = Math.max(0, supplied.volume) * usageMultiplier;
    const billable = Math.max(0, volume - (meter.includedUnits ?? 0));
    const cost = (billable / meter.per) * meter.unitUsd;
    meteredUsd += cost;

    // An included allowance the project stays inside is worth saying out loud —
    // it is the difference between "free" and "we forgot to count it".
    if (meter.includedUnits && billable === 0) {
      meterDetail.push(
        `${formatUnits(volume)} ${meter.label.toLowerCase()} — within the included ${formatUnits(meter.includedUnits)}`,
      );
    } else {
      meterDetail.push(
        `${formatUnits(volume)} ${meter.label.toLowerCase()} · ${formatMoney(cost)}`,
      );
    }
  }

  return {
    key: entry.key,
    vendor: entry.vendor,
    plan: entry.perSeat && qty > 1 ? `${entry.plan} × ${qty} seats` : entry.plan,
    category: entry.category,
    fixedUsd: Math.round(fixedUsd * 100) / 100,
    meteredUsd: Math.round(meteredUsd * 100) / 100,
    monthlyUsd: Math.round((fixedUsd + meteredUsd) * 100) / 100,
    meterDetail,
    why: selection.why,
    note: entry.note,
    cheaperAlternative: entry.cheaperAlternative,
  };
}

/**
 * The catalog as the model sees it.
 *
 * Deliberately shows the prices. A model that knows n8n Cloud Pro is $60 and
 * Gemini Pro output is $10/M picks a sensible architecture for the budget the
 * visitor described, instead of specifying a stack and discovering afterwards
 * that it costs more per month than the client's current software.
 */
export function renderCatalogForPrompt(): string {
  const byCategory = new Map<RunCostCategory, CatalogEntry[]>();
  for (const entry of ENTRIES) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }

  const blocks: string[] = [];
  for (const [category, entries] of byCategory) {
    const lines = entries.map((entry) => {
      const price = entry.perSeat
        ? `$${entry.baseMonthlyUsd}/seat/mo`
        : entry.baseMonthlyUsd > 0
          ? `$${entry.baseMonthlyUsd}/mo`
          : "no fixed fee";

      const meters = (entry.meters ?? [])
        .map((m) => {
          const rate =
            m.unitUsd > 0
              ? `$${m.unitUsd}/${m.per === 1 ? m.unit.split("/")[0] : formatUnits(m.per)}`
              : "included";
          const included = m.includedUnits
            ? `, ${formatUnits(m.includedUnits)} included`
            : "";
          return `      meter "${m.id}" — supply ${m.unit} (${rate}${included})`;
        })
        .join("\n");

      return `  ${entry.key} — ${entry.vendor} ${entry.plan}, ${price}${
        entry.perSeat ? " (set qty to the seat count)" : ""
      }${meters ? `\n${meters}` : ""}`;
    });

    blocks.push(`${CATEGORY_LABELS[category]}:\n${lines.join("\n")}`);
  }

  return blocks.join("\n\n");
}

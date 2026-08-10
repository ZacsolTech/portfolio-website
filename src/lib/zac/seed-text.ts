import { industries } from "@/lib/content/industries";
import { portfolio } from "@/lib/content/portfolio";
import { services } from "@/lib/content/services";

/**
 * The text behind every curated seed id.
 *
 * Split out of `seeds.ts` and imported dynamically because it reaches into the
 * site's content modules: keeping it here means services, industries and
 * portfolio load once, on the first seeded click, instead of on every page.
 *
 * Built from that content rather than hand-written, so a new service or
 * industry gets a working contextual entry point without a second list to
 * forget to update. The prefixes here must stay in step with `PREFIX_MODE`
 * in `seeds.ts`.
 *
 * Every line is a **complete sentence in the visitor's voice**. These are
 * auto-sent, so a trailing "here's what we're dealing with:" would post a
 * dangling fragment and force ZAC to ask what the visitor meant. A short,
 * true statement of intent lets it open with a targeted question instead —
 * and never puts a claim in their mouth they did not make.
 */

export type SeedText = { text: string };

/**
 * "Web development" → "web development", but "AI automation" and "UI/UX
 * design" keep their capitals. A blanket `toLowerCase()` produced
 * "ai automation".
 */
function midSentence(title: string): string {
  if (/^[A-Z]{2,}/.test(title)) return title;
  return title.charAt(0).toLowerCase() + title.slice(1);
}

/** Case-study titles carry a suffix ("— try it live") that isn't the name. */
function projectName(title: string): string {
  return title.split(" — ")[0];
}

function buildRegistry(): Map<string, SeedText> {
  const registry = new Map<string, SeedText>();

  for (const service of services) {
    const name = midSentence(service.title);
    registry.set(`service.${service.slug}`, {
      text: `I'm looking into ${name} for my business.`,
    });
    registry.set(`cost.${service.slug}`, {
      text: `I'd like a cost range for a ${name} project.`,
    });
  }

  for (const industry of industries) {
    registry.set(`industry.${industry.slug}`, {
      text: `We're a ${midSentence(industry.name)} business and something isn't working.`,
    });
  }

  for (const item of portfolio) {
    registry.set(`like.${item.slug}`, {
      text: `I'd like something along the lines of your "${projectName(item.title)}" project. What would that cost?`,
    });
  }

  /* Hand-written seeds for the generic entry points. */
  const fixed: Record<string, SeedText> = {
    contact: {
      text: "I'd rather work this out here than wait on an email reply.",
    },
    book: {
      text: "Before I book a call I'd like a ballpark figure.",
    },
    pricing: {
      text: "I'd like a cost range for a project I'm planning.",
    },
    roadmap: {
      text: "I'd like a full solution roadmap for a problem we have.",
    },
  };

  for (const [id, entry] of Object.entries(fixed)) {
    registry.set(id, entry);
  }

  return registry;
}

const REGISTRY = buildRegistry();

export function seedText(id: string): SeedText | null {
  return REGISTRY.get(id) ?? null;
}

import { formatMoneyBand, type Blueprint, type Slots } from "./schema";

/**
 * Blueprint delivery over Resend's REST API.
 *
 * Called direct over HTTP rather than through the SDK to keep the serverless
 * bundle small — this is one POST with a JSON body.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
/**
 * Generous on purpose: the first call from a cold instance spends ~11s on DNS
 * and the TLS handshake, while warm calls return in well under a second. A
 * tighter budget silently drops the very first lead after every deploy.
 */
const SEND_TIMEOUT_MS = 25_000;

export type EmailResult =
  | { status: "sent"; id?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://zacsol.com").replace(/\/$/, "");
}

/** Escape anything model- or visitor-supplied before it lands in HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function phaseRows(blueprint: Blueprint): string {
  let cursor = 1;
  return blueprint.phases
    .map((phase, i) => {
      const from = cursor;
      const to = cursor + phase.weeks - 1;
      cursor = to + 1;
      return `<tr>
        <td style="padding:8px 12px 8px 0;color:#71717a;font:12px ui-monospace,monospace;white-space:nowrap;">${String(i + 1).padStart(2, "0")}</td>
        <td style="padding:8px 12px 8px 0;color:#18181b;font-size:14px;">${esc(phase.name)}</td>
        <td style="padding:8px 0;color:#71717a;font:12px ui-monospace,monospace;white-space:nowrap;">wk ${from}–${to}</td>
      </tr>`;
    })
    .join("");
}

function list(items: string[] | undefined, color: string): string {
  if (!items?.length) return "";
  return `<ul style="margin:8px 0 0;padding-left:18px;color:${color};font-size:14px;line-height:1.7;">
    ${items.map((item) => `<li>${esc(item)}</li>`).join("")}
  </ul>`;
}

function renderHtml(input: {
  name: string;
  blueprint: Blueprint;
  slots: Slots;
}): string {
  const { name, blueprint, slots } = input;
  const url = appUrl();

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
<div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">

  <div style="background:#09090b;border-radius:16px;padding:28px;">
    <p style="margin:0;color:#a1a1aa;font:11px ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;">ZACSOL · Solution Blueprint</p>
    <h1 style="margin:12px 0 0;color:#fff;font-size:24px;line-height:1.3;">${esc(blueprint.title)}</h1>
    <p style="margin:12px 0 0;color:rgba(255,255,255,.72);font-size:15px;line-height:1.6;">${esc(blueprint.why)}</p>
  </div>

  <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">Hi ${esc(name)}, here's the full roadmap from your consultation — the version without the blur.</p>

  <table style="width:100%;margin:24px 0 0;border-collapse:collapse;background:#fff;border-radius:12px;">
    <tr>
      <td style="padding:16px;border-bottom:1px solid #e4e4e7;">
        <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Project type</div>
        <div style="margin-top:4px;font-size:15px;font-weight:600;">${esc(blueprint.serviceTitle)}</div>
      </td>
      <td style="padding:16px;border-bottom:1px solid #e4e4e7;">
        <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Duration</div>
        <div style="margin-top:4px;font-size:15px;font-weight:600;">${blueprint.durationWeeks[0]}–${blueprint.durationWeeks[1]} weeks</div>
      </td>
      <td style="padding:16px;border-bottom:1px solid #e4e4e7;">
        <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Investment</div>
        <div style="margin-top:4px;font-size:15px;font-weight:600;">${esc(formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1]))}</div>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:16px;border-bottom:1px solid #e4e4e7;">
        <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">What you get</div>
        ${list(blueprint.features, "#3f3f46")}
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:16px;border-bottom:1px solid #e4e4e7;">
        <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Stack</div>
        <div style="margin-top:8px;font-size:14px;color:#3f3f46;">${blueprint.stack.map(esc).join(" · ")}</div>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:16px;border-bottom:1px solid #e4e4e7;">
        <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Phased timeline</div>
        <table style="width:100%;margin-top:8px;border-collapse:collapse;">${phaseRows(blueprint)}</table>
        <div style="margin-top:10px;font-size:13px;color:#71717a;">Team: ${esc(blueprint.team)}</div>
      </td>
    </tr>
    ${
      blueprint.assumptions?.length
        ? `<tr><td colspan="3" style="padding:16px;border-bottom:1px solid #e4e4e7;">
             <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Assumptions worth challenging</div>
             ${list(blueprint.assumptions, "#3f3f46")}
           </td></tr>`
        : ""
    }
    ${
      blueprint.risks?.length
        ? `<tr><td colspan="3" style="padding:16px;">
             <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">What could derail this</div>
             ${list(blueprint.risks, "#3f3f46")}
           </td></tr>`
        : ""
    }
  </table>

  <div style="margin:28px 0 0;padding:20px;background:#fff;border-radius:12px;">
    <div style="color:#71717a;font:11px ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;">Based on what you told us</div>
    <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#3f3f46;">
      ${esc(slots.problem ?? "")}<br>
      <span style="color:#71717a;">${esc(slots.industry ?? "")} · ${esc(slots.current ?? "")} · ${esc(slots.scale ?? "")} · ${esc(slots.timeline ?? "")}</span>
    </p>
  </div>

  <div style="margin:28px 0 0;text-align:center;">
    <a href="${url}/book" style="display:inline-block;padding:14px 28px;background:#18181b;color:#fff;border-radius:999px;text-decoration:none;font-size:15px;font-weight:600;">Book 30 minutes with an engineer</a>
    <p style="margin:14px 0 0;font-size:13px;color:#71717a;">Not a sales call. Bring the assumptions you disagree with.</p>
  </div>

  <p style="margin:32px 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;text-align:center;">
    Estimates are indicative and based on a short conversation, not a full discovery.<br>
    ZACSOL · <a href="${url}" style="color:#71717a;">${esc(url.replace(/^https?:\/\//, ""))}</a>
  </p>
</div>
</body></html>`;
}

function renderText(input: { name: string; blueprint: Blueprint }): string {
  const { name, blueprint } = input;
  const lines = [
    `Hi ${name},`,
    "",
    `Your solution blueprint: ${blueprint.title}`,
    "",
    blueprint.why,
    "",
    `Project type: ${blueprint.serviceTitle}`,
    `Duration: ${blueprint.durationWeeks[0]}-${blueprint.durationWeeks[1]} weeks`,
    `Investment: ${formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1])}`,
    `Team: ${blueprint.team}`,
    "",
    "What you get:",
    ...blueprint.features.map((f) => `  - ${f}`),
    "",
    `Stack: ${blueprint.stack.join(", ")}`,
    "",
    "Phases:",
    ...blueprint.phases.map((p) => `  - ${p.name} (${p.weeks} wk)`),
  ];

  if (blueprint.assumptions?.length) {
    lines.push("", "Assumptions worth challenging:", ...blueprint.assumptions.map((a) => `  - ${a}`));
  }
  if (blueprint.risks?.length) {
    lines.push("", "What could derail this:", ...blueprint.risks.map((r) => `  - ${r}`));
  }

  lines.push(
    "",
    `Book a call: ${appUrl()}/book`,
    "",
    "Estimates are indicative and based on a short conversation, not a full discovery.",
    "ZACSOL",
  );
  return lines.join("\n");
}

export async function sendBlueprintEmail(input: {
  to: string;
  name: string;
  blueprint: Blueprint;
  slots: Slots;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      status: "skipped",
      reason: !apiKey ? "RESEND_API_KEY not set" : "RESEND_FROM_EMAIL not set",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: from.includes("<") ? from : `ZACSOL <${from}>`,
        to: [input.to],
        subject: `Your solution blueprint: ${input.blueprint.title}`,
        html: renderHtml(input),
        text: renderText(input),
        ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { status: "failed", error: `Resend ${response.status}: ${body.slice(0, 200)}` };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return { status: "sent", id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "failed",
      error: err instanceof Error && err.name === "AbortError" ? "Resend timed out" : message,
    };
  } finally {
    clearTimeout(timer);
  }
}

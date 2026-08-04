/**
 * Email template primitives.
 *
 * Hand-written table-and-inline-style HTML rather than a component library:
 * every mail client that matters still needs exactly this markup, the output is
 * ~8KB with no build step, and it keeps the transactional path free of a
 * dependency that would have to be audited and upgraded for the life of the
 * project.
 *
 * The palette is a light, print-friendly neutral set rather than the site's
 * tokens — email cannot use CSS custom properties, and dark-mode inversion in
 * clients like Outlook mangles anything clever.
 */

export const palette = {
	ink: "#18181b",
	body: "#3f3f46",
	muted: "#71717a",
	faint: "#a1a1aa",
	line: "#e4e4e7",
	paper: "#ffffff",
	page: "#f4f4f5",
	dark: "#09090b",
	gold: "#b8893a",
} as const;

const SANS =
	"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

/** Escape anything model-, visitor- or database-supplied before it hits HTML. */
export function esc(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Only http(s) links may be emitted.
 *
 * A URL that reaches a template is often assembled from configuration, and a
 * `javascript:` or `data:` href in an HTML email is a phishing vector some
 * webmail clients will happily render. Anything else collapses to the site root.
 */
export function safeUrl(value: string | null | undefined): string {
	if (!value) return appUrl();
	try {
		const parsed = new URL(value, appUrl());
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return appUrl();
		return parsed.toString();
	} catch {
		return appUrl();
	}
}

export function appUrl(): string {
	return (process.env.NEXT_PUBLIC_APP_URL || "https://zacsol.com").replace(/\/$/, "");
}

export function absolute(path: string): string {
	return `${appUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/* ------------------------------- components ------------------------------- */

/**
 * Preview text. Padded with zero-width joiners so the client does not pull the
 * first line of body copy in after it — a well-known and genuinely necessary hack.
 */
function preheaderBlock(text: string): string {
	return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(text)}${"&#8204;&nbsp;".repeat(60)}</div>`;
}

export function shell(input: { preheader: string; body: string }): string {
	return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>ZACSOL</title>
</head>
<body style="margin:0;padding:0;background:${palette.page};-webkit-font-smoothing:antialiased;">
${preheaderBlock(input.preheader)}
<div style="max-width:640px;margin:0 auto;padding:32px 20px;font-family:${SANS};color:${palette.ink};">
${input.body}
</div>
</body></html>`;
}

export function masthead(input: {
	overline: string;
	title: string;
	lede?: string;
}): string {
	return `<div style="background:${palette.dark};border-radius:16px;padding:28px;">
  <p style="margin:0;color:${palette.faint};font:11px ${MONO};letter-spacing:.2em;text-transform:uppercase;">${esc(input.overline)}</p>
  <h1 style="margin:12px 0 0;color:#fff;font-size:24px;line-height:1.3;font-weight:600;">${esc(input.title)}</h1>
  ${
		input.lede
			? `<p style="margin:12px 0 0;color:rgba(255,255,255,.72);font-size:15px;line-height:1.6;">${esc(input.lede)}</p>`
			: ""
	}
</div>`;
}

export function paragraph(text: string, opts?: { muted?: boolean }): string {
	const color = opts?.muted ? palette.muted : palette.ink;
	return `<p style="margin:20px 0 0;font-size:15px;line-height:1.65;color:${color};">${esc(text)}</p>`;
}

/** Paragraph that may contain pre-escaped inline markup built by a template. */
export function rawParagraph(html: string): string {
	return `<p style="margin:20px 0 0;font-size:15px;line-height:1.65;color:${palette.ink};">${html}</p>`;
}

export function card(inner: string): string {
	return `<div style="margin:24px 0 0;padding:20px;background:${palette.paper};border-radius:12px;border:1px solid ${palette.line};">${inner}</div>`;
}

export function label(text: string): string {
	return `<div style="color:${palette.muted};font:11px ${MONO};letter-spacing:.15em;text-transform:uppercase;">${esc(text)}</div>`;
}

export function statRow(
	items: { label: string; value: string }[],
): string {
	const cells = items
		.map(
			(item) => `<td style="padding:16px;border-bottom:1px solid ${palette.line};vertical-align:top;">
        ${label(item.label)}
        <div style="margin-top:4px;font-size:15px;font-weight:600;color:${palette.ink};">${esc(item.value)}</div>
      </td>`,
		)
		.join("");

	return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;background:${palette.paper};border-radius:12px;border:1px solid ${palette.line};">
    <tr>${cells}</tr>
  </table>`;
}

export function section(title: string, inner: string): string {
	return `<div style="margin:16px 0 0;padding:16px;background:${palette.paper};border:1px solid ${palette.line};border-radius:12px;">
    ${label(title)}
    ${inner}
  </div>`;
}

export function bullets(items: string[] | undefined): string {
	if (!items?.length) return "";
	return `<ul style="margin:10px 0 0;padding-left:18px;color:${palette.body};font-size:14px;line-height:1.7;">
    ${items.map((item) => `<li>${esc(item)}</li>`).join("")}
  </ul>`;
}

export function definitionRows(rows: { term: string; value: string }[]): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:10px 0 0;border-collapse:collapse;">
    ${rows
			.map(
				(row) => `<tr>
        <td style="padding:6px 12px 6px 0;color:${palette.muted};font-size:13px;white-space:nowrap;vertical-align:top;">${esc(row.term)}</td>
        <td style="padding:6px 0;color:${palette.ink};font-size:14px;">${esc(row.value)}</td>
      </tr>`,
			)
			.join("")}
  </table>`;
}

export function button(input: { href: string; label: string; note?: string }): string {
	return `<div style="margin:28px 0 0;text-align:center;">
    <a href="${esc(safeUrl(input.href))}" style="display:inline-block;padding:14px 28px;background:${palette.ink};color:#fff;border-radius:999px;text-decoration:none;font-size:15px;font-weight:600;">${esc(input.label)}</a>
    ${
			input.note
				? `<p style="margin:14px 0 0;font-size:13px;color:${palette.muted};">${esc(input.note)}</p>`
				: ""
		}
  </div>`;
}

export function secondaryLink(input: { href: string; label: string }): string {
	return `<p style="margin:14px 0 0;text-align:center;font-size:14px;">
    <a href="${esc(safeUrl(input.href))}" style="color:${palette.muted};">${esc(input.label)}</a>
  </p>`;
}

export function footer(input?: { note?: string; unsubscribeUrl?: string }): string {
	const host = appUrl().replace(/^https?:\/\//, "");
	return `<p style="margin:32px 0 0;font-size:12px;color:${palette.faint};line-height:1.6;text-align:center;">
    ${input?.note ? `${esc(input.note)}<br>` : ""}
    ZACSOL · <a href="${esc(appUrl())}" style="color:${palette.muted};">${esc(host)}</a>
    ${
			input?.unsubscribeUrl
				? `<br><a href="${esc(safeUrl(input.unsubscribeUrl))}" style="color:${palette.faint};">Unsubscribe from these follow-ups</a>`
				: ""
		}
  </p>`;
}

/* -------------------------------- plaintext ------------------------------- */

/**
 * Every message ships a text alternative. It is not a courtesy: a
 * multipart/alternative body materially improves deliverability, and screen
 * readers and text-only clients get a real message instead of stripped tags.
 */
export function textBlock(lines: (string | false | null | undefined)[]): string {
	return lines.filter((line): line is string => typeof line === "string").join("\n");
}

/* ------------------------------- formatting ------------------------------- */

export function formatDateTime(iso: string, timezone: string): string {
	try {
		return new Intl.DateTimeFormat("en-GB", {
			timeZone: timezone,
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZoneName: "short",
		}).format(new Date(iso));
	} catch {
		// An invalid IANA zone from stored data must not throw inside a send.
		return new Date(iso).toUTCString();
	}
}

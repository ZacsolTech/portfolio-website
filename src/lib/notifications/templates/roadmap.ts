import { formatMoneyBand, type Blueprint, type Slots } from "@/lib/ai/schema";
import type { EmailContent } from "../email";
import {
	absolute,
	bullets,
	button,
	card,
	definitionRows,
	esc,
	footer,
	label,
	masthead,
	palette,
	paragraph,
	secondaryLink,
	section,
	shell,
	statRow,
	textBlock,
} from "./kit";

/**
 * Blueprint delivery — the email the consultant's gate promises.
 *
 * This is the highest-stakes message on the site: it is what the visitor
 * forwards to whoever holds the budget, so it has to read as a document rather
 * than a receipt.
 */

function phaseTable(blueprint: Blueprint): string {
	let cursor = 1;
	const rows = blueprint.phases
		.map((phase, i) => {
			const from = cursor;
			const to = cursor + phase.weeks - 1;
			cursor = to + 1;
			return `<tr>
        <td style="padding:8px 12px 8px 0;color:${palette.muted};font:12px ui-monospace,monospace;white-space:nowrap;vertical-align:top;">${String(i + 1).padStart(2, "0")}</td>
        <td style="padding:8px 12px 8px 0;color:${palette.ink};font-size:14px;">${esc(phase.name)}</td>
        <td style="padding:8px 0;color:${palette.muted};font:12px ui-monospace,monospace;white-space:nowrap;vertical-align:top;">wk ${from}–${to}</td>
      </tr>`;
		})
		.join("");

	return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 0;border-collapse:collapse;">${rows}</table>`;
}

export function renderRoadmapEmail(input: {
	name: string;
	blueprint: Blueprint;
	slots: Slots;
	roadmapUrl?: string | null;
}): EmailContent {
	const { name, blueprint, slots, roadmapUrl } = input;

	const intake = [
		slots.audience && { term: "Who it's for", value: slots.audience },
		slots.today && { term: "Today", value: slots.today },
		slots.v1 && { term: "First release", value: slots.v1 },
		slots.timing && { term: "Timing", value: slots.timing },
	].filter((row): row is { term: string; value: string } => Boolean(row));

	const body = [
		masthead({
			overline: "ZACSOL · Solution Blueprint",
			title: blueprint.title,
			lede: blueprint.why,
		}),
		paragraph(
			`Hi ${name}, here's the full roadmap from your consultation — the version without the blur.`,
		),
		statRow([
			{ label: "Project type", value: blueprint.serviceTitle },
			{
				label: "Duration",
				value: `${blueprint.durationWeeks[0]}–${blueprint.durationWeeks[1]} weeks`,
			},
			{
				label: "Investment",
				value: formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1]),
			},
		]),
		section("What you get", bullets(blueprint.features)),
		section(
			"Stack",
			`<div style="margin-top:8px;font-size:14px;color:${palette.body};">${blueprint.stack.map(esc).join(" · ")}</div>`,
		),
		section(
			"Phased timeline",
			`${phaseTable(blueprint)}<div style="margin-top:10px;font-size:13px;color:${palette.muted};">Team: ${esc(blueprint.team)}</div>`,
		),
		blueprint.assumptions?.length
			? section("Assumptions worth challenging", bullets(blueprint.assumptions))
			: "",
		blueprint.risks?.length
			? section("What could derail this", bullets(blueprint.risks))
			: "",
		slots.outcome
			? card(
					`${label("Based on what you told us")}
           <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:${palette.body};">${esc(slots.outcome)}</p>
           ${intake.length ? definitionRows(intake) : ""}`,
				)
			: "",
		button({
			href: absolute("/book"),
			label: "Book 30 minutes with an engineer",
			note: "Not a sales call. Bring the assumptions you disagree with.",
		}),
		roadmapUrl
			? secondaryLink({ href: roadmapUrl, label: "View or share this roadmap online →" })
			: "",
		footer({
			note: "Estimates are indicative and based on a short conversation, not a full discovery.",
		}),
	].join("\n");

	const text = textBlock([
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
		blueprint.assumptions?.length ? "" : null,
		blueprint.assumptions?.length ? "Assumptions worth challenging:" : null,
		...(blueprint.assumptions ?? []).map((a) => `  - ${a}`),
		blueprint.risks?.length ? "" : null,
		blueprint.risks?.length ? "What could derail this:" : null,
		...(blueprint.risks ?? []).map((r) => `  - ${r}`),
		"",
		roadmapUrl ? `View or share this roadmap: ${roadmapUrl}` : null,
		`Book a call: ${absolute("/book")}`,
		"",
		"Estimates are indicative and based on a short conversation, not a full discovery.",
		"ZACSOL",
	]);

	return {
		subject: `Your solution blueprint: ${blueprint.title}`,
		html: shell({
			preheader: `${blueprint.serviceTitle} · ${blueprint.durationWeeks[0]}–${blueprint.durationWeeks[1]} weeks · ${formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1])}`,
			body,
		}),
		text,
	};
}

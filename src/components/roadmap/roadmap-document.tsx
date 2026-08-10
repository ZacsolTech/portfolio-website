import Link from "next/link";
import { formatMoneyBand, type Blueprint, type Slots } from "@/lib/ai/schema";
import { site } from "@/lib/content";
import { PrintButton } from "./print-button";

/**
 * The roadmap as a document, not a webpage.
 *
 * `PAGES.md` §14: "this is what the visitor forwards to their boss, so it must
 * look like a document". That drives everything here — a fixed light paper
 * surface regardless of the site theme, a masthead with a generated date, and
 * a layout whose print output is the deliverable rather than an afterthought.
 */

function Field({
	label,
	children,
	wide,
}: {
	label: string;
	children: React.ReactNode;
	wide?: boolean;
}) {
	return (
		<div className={`doc-field${wide ? " doc-field--wide" : ""}`}>
			<div className="doc-field__k">{label}</div>
			<div className="doc-field__v">{children}</div>
		</div>
	);
}

function List({ items }: { items: string[] }) {
	return (
		<ul className="doc-list">
			{items.map((item) => (
				<li key={item}>{item}</li>
			))}
		</ul>
	);
}

export type RoadmapDocumentProps = {
	name: string;
	blueprint: Blueprint;
	slots: Slots;
	createdAt: string;
	shareUrl: string;
};

export function RoadmapDocument({
	name,
	blueprint,
	slots,
	createdAt,
	shareUrl,
}: RoadmapDocumentProps) {
	const generated = new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(createdAt));

	// Cumulative week offsets derived rather than accumulated: a running
	// mutation inside map does not survive the React compiler.
	const timeline = blueprint.phases.map((phase, i) => {
		const from = blueprint.phases.slice(0, i).reduce((sum, p) => sum + p.weeks, 1);
		return { ...phase, from, to: from + phase.weeks - 1, index: i };
	});

	const totalWeeks = blueprint.phases.reduce((sum, phase) => sum + phase.weeks, 0);

	const intake = [
		slots.industry && { term: "Industry", value: slots.industry },
		slots.current && { term: "How it works today", value: slots.current },
		slots.scale && { term: "Scale", value: slots.scale },
		slots.timeline && { term: "Timeline", value: slots.timeline },
	].filter((row): row is { term: string; value: string } => Boolean(row));

	return (
		<article className="doc">
			<header className="doc__head">
				<div className="doc__brand">
					<span className="doc__mark" aria-hidden>
						Z
					</span>
					<div>
						<p className="doc__org">{site.legalName}</p>
						<p className="doc__kind">Solution roadmap</p>
					</div>
				</div>
				<div className="doc__meta">
					<p>
						<span>Prepared for</span>
						{name}
					</p>
					<p>
						<span>Generated</span>
						<time dateTime={createdAt}>{generated}</time>
					</p>
				</div>
				<div className="doc__actions">
					<PrintButton />
				</div>
			</header>

			<h1 className="doc__title">{blueprint.title}</h1>
			<p className="doc__why">{blueprint.why}</p>

			<section className="doc-grid" aria-label="Summary">
				<Field label="Project type">{blueprint.serviceTitle}</Field>
				<Field label="Duration">
					{blueprint.durationWeeks[0]}–{blueprint.durationWeeks[1]} weeks
				</Field>
				<Field label="Investment band">
					{formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1])}
				</Field>
				<Field label="Team" wide>
					{blueprint.team}
				</Field>
			</section>

			<section className="doc-section">
				<h2>Scope</h2>
				<List items={blueprint.features} />
			</section>

			<section className="doc-section">
				<h2>Stack</h2>
				<p className="doc-inline">{blueprint.stack.join(" · ")}</p>
			</section>

			<section className="doc-section">
				<h2>
					Phased delivery <span className="doc-section__note">{totalWeeks} weeks of work</span>
				</h2>
				<ol className="doc-phases">
					{timeline.map((phase) => (
						<li key={`${phase.name}-${phase.index}`}>
							<span className="doc-phases__n">{String(phase.index + 1).padStart(2, "0")}</span>
							<span className="doc-phases__name">{phase.name}</span>
							<span className="doc-phases__wk">
								wk {phase.from}–{phase.to}
							</span>
						</li>
					))}
				</ol>
			</section>

			{blueprint.assumptions?.length ? (
				<section className="doc-section">
					<h2>Assumptions worth challenging</h2>
					<p className="doc-section__lede">
						Every estimate rests on these. If one is wrong, the numbers above move —
						which is exactly what the first call is for.
					</p>
					<List items={blueprint.assumptions} />
				</section>
			) : null}

			{blueprint.risks?.length ? (
				<section className="doc-section">
					<h2>What could derail this</h2>
					<List items={blueprint.risks} />
				</section>
			) : null}

			{slots.problem ? (
				<section className="doc-section">
					<h2>The brief we worked from</h2>
					<blockquote className="doc-quote">{slots.problem}</blockquote>
					{intake.length ? (
						<dl className="doc-dl">
							{intake.map((row) => (
								<div key={row.term}>
									<dt>{row.term}</dt>
									<dd>{row.value}</dd>
								</div>
							))}
						</dl>
					) : null}
				</section>
			) : null}

			<section className="doc-cta">
				<h2>Next step</h2>
				<p>
					Thirty minutes with a senior engineer to pressure-test the assumptions and
					shape a first phase. Not a sales call.
				</p>
				<div className="doc-cta__actions">
					<Link href="/book" className="btn btn--gold">
						Book a consultation
					</Link>
					<Link href="/portfolio" className="btn btn--outline-dark">
						See comparable projects
					</Link>
				</div>
			</section>

			<footer className="doc__foot">
				<p>
					Estimates are indicative and based on a short conversation, not a full
					discovery. Scope, cost and timeline are re-baselined after discovery and put
					in writing before any work starts.
				</p>
				<p className="doc__foot-meta">
					{site.legalName} · {site.email} · <span className="doc__url">{shareUrl}</span>
				</p>
			</footer>
		</article>
	);
}

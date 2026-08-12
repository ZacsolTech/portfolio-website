import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { PrototypeView } from "@/components/prototype/prototype-view";
import type { Prototype } from "@/lib/ai/prototype-schema";
import { formatMoneyBand, type Blueprint, type Slots } from "@/lib/ai/schema";
import { site } from "@/lib/content";
import { DownloadPdfButton } from "./download-pdf-button";

/**
 * The roadmap as a shareable proposal document.
 *
 * Forwarded to a boss or board — so it reads as a light paper proposal, not
 * a themed webpage. Print output is the PDF deliverable.
 */

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="doc-meta">
			<p className="doc-meta__k">{label}</p>
			<p className="doc-meta__v">{children}</p>
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
	/** Null on roadmaps minted before prototypes shipped, or when one could not be drawn. */
	prototype?: Prototype | null;
	slots: Slots;
	createdAt: string;
	shareUrl: string;
};

export function RoadmapDocument({
	name,
	blueprint,
	prototype,
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
		<article className="doc" id="roadmap-doc">
			<header className="doc__head">
				<div className="doc__brand">
					<Logo className="doc__logo" />
					<div className="doc__brand-copy">
						<p className="doc__kind">Solution roadmap</p>
						<p className="doc__prepared">
							Prepared for <strong>{name}</strong>
						</p>
					</div>
				</div>
				<div className="doc__head-end">
					<p className="doc__date">
						<span>Generated</span>
						<time dateTime={createdAt}>{generated}</time>
					</p>
					<div className="doc__actions">
						<DownloadPdfButton title={blueprint.title} />
					</div>
				</div>
			</header>

			<section className="doc-hero">
				<p className="doc-hero__eyebrow">{blueprint.serviceTitle}</p>
				<h1 className="doc__title">{blueprint.title}</h1>
				<p className="doc__why">{blueprint.why}</p>
			</section>

			<section className="doc-summary" aria-label="Summary">
				<div className="doc-band">
					<p className="doc-band__k">Investment band</p>
					<p className="doc-band__v">
						{formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1])}
					</p>
				</div>
				<div className="doc-summary__grid">
					<Meta label="Duration">
						{blueprint.durationWeeks[0]}–{blueprint.durationWeeks[1]} weeks
					</Meta>
					<Meta label="Team">{blueprint.team}</Meta>
					<Meta label="Project type">{blueprint.serviceTitle}</Meta>
					<Meta label="Delivery">{totalWeeks} weeks of phased work</Meta>
				</div>
			</section>

			{/*
				Placed early: a forwarded reader decides in seconds whether to keep
				reading, and a picture of the thing does that work better than a
				bulleted list of deliverables.
			*/}
			{prototype ? (
				<section className="doc-section doc-section--proto">
					<div className="doc-section__head">
						<h2>What it could look like</h2>
						<p className="doc-section__lede">
							A first visual of the system — enough to pressure-test the idea
							before discovery.
						</p>
					</div>
					<PrototypeView prototype={prototype} variant="document" />
				</section>
			) : null}

			<section className="doc-section">
				<div className="doc-section__head">
					<h2>Scope</h2>
					<p className="doc-section__lede">
						What is in the first build. Anything not listed here is out of scope
						until discovery says otherwise.
					</p>
				</div>
				<List items={blueprint.features} />
			</section>

			<section className="doc-section">
				<div className="doc-section__head">
					<h2>Stack</h2>
				</div>
				<ul className="doc-stack">
					{blueprint.stack.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</section>

			<section className="doc-section">
				<div className="doc-section__head">
					<h2>Phased delivery</h2>
					<p className="doc-section__lede">
						{totalWeeks} weeks of work, sequenced so each phase leaves something
						usable.
					</p>
				</div>
				<ol className="doc-phases">
					{timeline.map((phase) => (
						<li key={`${phase.name}-${phase.index}`}>
							<span className="doc-phases__n" aria-hidden>
								{String(phase.index + 1).padStart(2, "0")}
							</span>
							<div className="doc-phases__body">
								<span className="doc-phases__name">{phase.name}</span>
								<span className="doc-phases__wk">
									Weeks {phase.from}–{phase.to}
									<span aria-hidden> · </span>
									{phase.weeks} wk{phase.weeks === 1 ? "" : "s"}
								</span>
							</div>
						</li>
					))}
				</ol>
			</section>

			{(blueprint.assumptions?.length || blueprint.risks?.length) ? (
				<section className="doc-split" aria-label="Assumptions and risks">
					{blueprint.assumptions?.length ? (
						<div className="doc-panel">
							<h2>Assumptions worth challenging</h2>
							<p className="doc-panel__lede">
								If one of these is wrong, the numbers above move — that is what
								the first call is for.
							</p>
							<List items={blueprint.assumptions} />
						</div>
					) : null}
					{blueprint.risks?.length ? (
						<div className="doc-panel doc-panel--warn">
							<h2>What could derail this</h2>
							<p className="doc-panel__lede">
								Known risks we would watch or design around in discovery.
							</p>
							<List items={blueprint.risks} />
						</div>
					) : null}
				</section>
			) : null}

			{slots.problem ? (
				<section className="doc-section">
					<div className="doc-section__head">
						<h2>The brief we worked from</h2>
					</div>
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
				<p className="doc-cta__eyebrow">Next step</p>
				<h2 className="doc-cta__title">
					Pressure-test this with a senior engineer
				</h2>
				<p>
					Thirty minutes to challenge the assumptions, tighten the first phase,
					and decide whether this is worth building. Not a sales pitch.
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
					discovery. Scope, cost and timeline are re-baselined after discovery and
					put in writing before any work starts.
				</p>
				<p className="doc__foot-meta">
					{site.legalName} · {site.email}
					<span className="doc__foot-sep" aria-hidden>
						·
					</span>
					<span className="doc__url">{shareUrl}</span>
				</p>
			</footer>
		</article>
	);
}

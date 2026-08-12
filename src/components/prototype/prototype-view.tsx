import {
	PROTOTYPE_KIND_LABELS,
	type ProtoChart,
	type ProtoSection,
	type ProtoTable,
	type Prototype,
} from "@/lib/ai/prototype-schema";

/**
 * The prototype, drawn.
 *
 * Renders a model-authored specification with our own components, which is the
 * whole reason the model returns data instead of markup: nothing here can be
 * injected into the page, nothing arrives half-styled, and every mock is
 * legible in both themes without the model knowing either exists.
 *
 * Server-rendered on purpose. It appears inside the consultant panel and again
 * inside the forwarded roadmap document, and neither needs a byte of
 * JavaScript to show a picture.
 */

/* --------------------------------- chrome --------------------------------- */

/** Browser furniture. Sells "this is a real screen" more than any amount of detail. */
function BrowserChrome({ url }: { url?: string }) {
	return (
		<div className="proto__chrome" aria-hidden>
			<span className="proto__dots">
				<i />
				<i />
				<i />
			</span>
			{url ? <span className="proto__url">{url}</span> : null}
		</div>
	);
}

/* -------------------------------- sections -------------------------------- */

function Hero({ section }: { section: ProtoSection }) {
	return (
		<div className="proto-hero">
			{section.eyebrow ? <p className="proto-eyebrow">{section.eyebrow}</p> : null}
			{section.title ? <h3 className="proto-hero__title">{section.title}</h3> : null}
			{section.body ? <p className="proto-hero__body">{section.body}</p> : null}
			{section.ctaPrimary ? (
				<div className="proto-hero__ctas">
					<span className="proto-btn proto-btn--solid">{section.ctaPrimary}</span>
					{section.ctaSecondary ? (
						<span className="proto-btn">{section.ctaSecondary}</span>
					) : null}
				</div>
			) : null}
		</div>
	);
}

function Features({ section }: { section: ProtoSection }) {
	return (
		<div className="proto-block">
			{section.title ? <h4 className="proto-block__title">{section.title}</h4> : null}
			<div className="proto-grid">
				{section.items.map((item, i) => (
					<div className="proto-card" key={`${item.title ?? i}`}>
						<span className="proto-card__mark" aria-hidden />
						{item.title ? <p className="proto-card__title">{item.title}</p> : null}
						{item.body ? <p className="proto-card__body">{item.body}</p> : null}
					</div>
				))}
			</div>
		</div>
	);
}

/** Menus, service lists, price lists — anything with a name, a line and a price. */
function PriceList({ section }: { section: ProtoSection }) {
	return (
		<div className="proto-block">
			{section.title ? <h4 className="proto-block__title">{section.title}</h4> : null}
			<ul className="proto-list">
				{section.items.map((item, i) => (
					<li key={`${item.title ?? i}`}>
						<span className="proto-list__main">
							{item.title ? <span className="proto-list__name">{item.title}</span> : null}
							{item.body ? <span className="proto-list__desc">{item.body}</span> : null}
						</span>
						{item.price ? <span className="proto-list__price">{item.price}</span> : null}
					</li>
				))}
			</ul>
		</div>
	);
}

function Stats({ section }: { section: ProtoSection }) {
	return (
		<div className="proto-block proto-block--stats">
			{section.items.map((item, i) => (
				<div className="proto-stat" key={`${item.label ?? i}`}>
					<span className="proto-stat__value">{item.value}</span>
					<span className="proto-stat__label">{item.label}</span>
				</div>
			))}
		</div>
	);
}

function Testimonial({ section }: { section: ProtoSection }) {
	const attribution = section.items[0]?.label ?? section.items[0]?.title;
	return (
		<figure className="proto-quote">
			<blockquote>{section.body ?? section.title}</blockquote>
			{attribution ? <figcaption>{attribution}</figcaption> : null}
		</figure>
	);
}

/**
 * Image placeholders, labelled with what each image would be.
 *
 * Deliberately not stock photography. A grey panel that says "the dining room"
 * reads as a considered layout; a generic photo of somebody else's restaurant
 * reads as a template, which is exactly the impression this exists to avoid.
 */
function Gallery({ section }: { section: ProtoSection }) {
	return (
		<div className="proto-block">
			{section.title ? <h4 className="proto-block__title">{section.title}</h4> : null}
			<div className="proto-gallery">
				{section.items.map((item, i) => (
					<div className="proto-shot" key={`${item.title ?? i}`}>
						<span>{item.title ?? item.label}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function Cta({ section }: { section: ProtoSection }) {
	return (
		<div className="proto-cta">
			{section.title ? <p className="proto-cta__title">{section.title}</p> : null}
			{section.ctaPrimary ? (
				<span className="proto-btn proto-btn--solid">{section.ctaPrimary}</span>
			) : null}
		</div>
	);
}

function Section({ section }: { section: ProtoSection }) {
	switch (section.type) {
		case "hero":
			return <Hero section={section} />;
		case "list":
			return <PriceList section={section} />;
		case "stats":
			return <Stats section={section} />;
		case "testimonial":
			return <Testimonial section={section} />;
		case "gallery":
			return <Gallery section={section} />;
		case "cta":
			return <Cta section={section} />;
		default:
			return <Features section={section} />;
	}
}

/* -------------------------------- dashboard ------------------------------- */

function Chart({ chart }: { chart: ProtoChart }) {
	const max = Math.max(...chart.points.map((p) => p.value), 1);

	return (
		<div className="proto-chart">
			<div className="proto-chart__head">
				<h4 className="proto-block__title">{chart.title}</h4>
				{chart.unit ? <span className="proto-chart__unit">{chart.unit}</span> : null}
			</div>

			{chart.kind === "line" ? (
				// preserveAspectRatio="none" lets one viewBox stretch to any panel
				// width; the stroke is vector-effect'd so it does not stretch with it.
				<svg
					className="proto-chart__svg"
					viewBox="0 0 100 40"
					preserveAspectRatio="none"
					role="img"
					aria-label={chart.title}
				>
					<polyline
						vectorEffect="non-scaling-stroke"
						points={chart.points
							.map((p, i) => {
								const x = (i / Math.max(1, chart.points.length - 1)) * 100;
								const y = 38 - (p.value / max) * 34;
								return `${x.toFixed(2)},${y.toFixed(2)}`;
							})
							.join(" ")}
					/>
				</svg>
			) : (
				<div className="proto-bars" role="img" aria-label={chart.title}>
					{chart.points.map((point, i) => (
						<span
							className="proto-bars__col"
							key={`${point.label}-${i}`}
							style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
						/>
					))}
				</div>
			)}

			<div className="proto-chart__axis" aria-hidden>
				{chart.points.map((point, i) => (
					<span key={`${point.label}-${i}`}>{point.label}</span>
				))}
			</div>
		</div>
	);
}

function Table({ table }: { table: ProtoTable }) {
	return (
		<div className="proto-table-wrap">
			<h4 className="proto-block__title">{table.title}</h4>
			<table className="proto-table">
				<thead>
					<tr>
						{table.columns.map((column) => (
							<th key={column} scope="col">
								{column}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{table.rows.map((row, r) => (
						<tr key={`row-${r}`}>
							{row.map((cell, c) => (
								<td key={`cell-${r}-${c}`}>
									{c === table.statusColumn ? (
										<span className="proto-pill">{cell}</span>
									) : (
										cell
									)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Dashboard({ prototype }: { prototype: Prototype }) {
	return (
		<div className="proto-dash">
			{prototype.nav.length > 0 ? (
				<nav className="proto-dash__nav" aria-hidden>
					<span className="proto-dash__brand">{prototype.productName}</span>
					{prototype.nav.map((item, i) => (
						<span key={item} className={i === 0 ? "is-active" : undefined}>
							{item}
						</span>
					))}
				</nav>
			) : null}

			<div className="proto-dash__body">
				{prototype.kpis.length > 0 ? (
					<div className="proto-kpis">
						{prototype.kpis.map((kpi) => {
							// "Up" is not automatically good. Missed orders climbing is a
							// red number, and a mock that colours it green tells the
							// visitor we did not read their problem.
							const good =
								kpi.trend === "flat"
									? undefined
									: (kpi.trend === "up") === (kpi.goodWhen === "up");
							return (
								<div className="proto-kpi" key={kpi.label}>
									<span className="proto-kpi__label">{kpi.label}</span>
									<span className="proto-kpi__value">{kpi.value}</span>
									{kpi.delta ? (
										<span
											className="proto-kpi__delta"
											data-tone={good === undefined ? "flat" : good ? "good" : "bad"}
										>
											{kpi.trend === "up" ? "▲" : kpi.trend === "down" ? "▼" : "—"}{" "}
											{kpi.delta}
										</span>
									) : null}
								</div>
							);
						})}
					</div>
				) : null}

				{prototype.chart ? <Chart chart={prototype.chart} /> : null}
				{prototype.table ? <Table table={prototype.table} /> : null}
			</div>
		</div>
	);
}

/* -------------------------------- workflow -------------------------------- */

const NODE_LABELS: Record<string, string> = {
	trigger: "Trigger",
	action: "Action",
	ai: "AI",
	condition: "Check",
	output: "Output",
};

function Workflow({ prototype }: { prototype: Prototype }) {
	const { nodes, edges } = prototype;
	const index = new Map(nodes.map((node, i) => [node.id, i]));

	/**
	 * Nodes are drawn in the order the model listed them, with connectors
	 * between neighbours. Laying out a real graph would buy branching that
	 * these mocks almost never have, at the cost of a diagram that can collapse
	 * on a phone — so edges that skip ahead or loop back are annotated on the
	 * node instead of drawn, which stays readable at any width.
	 */
	const labelFor = (fromIndex: number) =>
		edges.find(
			(edge) => index.get(edge.from) === fromIndex && index.get(edge.to) === fromIndex + 1,
		)?.label;

	const asidesFor = (nodeId: string) =>
		edges
			.filter((edge) => {
				const from = index.get(edge.from);
				const to = index.get(edge.to);
				return edge.from === nodeId && from !== undefined && to !== undefined && to !== from + 1;
			})
			.map((edge) => ({
				label: edge.label,
				target: nodes[index.get(edge.to)!]!.label,
			}));

	return (
		<ol className="proto-flow">
			{nodes.map((node, i) => {
				const branchLabel = labelFor(i);
				const asides = asidesFor(node.id);

				return (
					<li className="proto-flow__step" key={node.id}>
						<div className="proto-node" data-kind={node.kind}>
							<div className="proto-node__head">
								<span className="proto-node__kind">{NODE_LABELS[node.kind] ?? node.kind}</span>
								{node.app ? <span className="proto-node__app">{node.app}</span> : null}
							</div>
							<p className="proto-node__label">{node.label}</p>
							{node.detail ? <p className="proto-node__detail">{node.detail}</p> : null}
							{asides.map((aside) => (
								<p className="proto-node__aside" key={`${aside.label}-${aside.target}`}>
									{aside.label ? `${aside.label} → ` : "→ "}
									{aside.target}
								</p>
							))}
						</div>

						{i < nodes.length - 1 ? (
							<span className="proto-flow__link" aria-hidden>
								{branchLabel ? <em>{branchLabel}</em> : null}
							</span>
						) : null}
					</li>
				);
			})}
		</ol>
	);
}

/* ---------------------------------- shell --------------------------------- */

export type PrototypeViewProps = {
	prototype: Prototype;
	/** Set on the forwarded document, where the mock is evidence, not a teaser. */
	variant?: "panel" | "document";
};

export function PrototypeView({ prototype, variant = "panel" }: PrototypeViewProps) {
	const framed = prototype.kind === "landing" || prototype.kind === "dashboard";

	return (
		<figure
			className={`proto proto--${variant}`}
			data-accent={prototype.accent}
			data-kind={prototype.kind}
		>
			<figcaption className="proto__cap">
				<span className="proto__kind">{PROTOTYPE_KIND_LABELS[prototype.kind]}</span>
				<p className="proto__caption">{prototype.caption}</p>
			</figcaption>

			<div className="proto__frame">
				{framed ? <BrowserChrome url={prototype.url} /> : null}

				<div className="proto__screen">
					{prototype.kind === "workflow" ? (
						<Workflow prototype={prototype} />
					) : prototype.kind === "dashboard" ? (
						<Dashboard prototype={prototype} />
					) : (
						prototype.sections.map((section, i) => (
							<Section section={section} key={`${section.type}-${i}`} />
						))
					)}
				</div>
			</div>

			<p className="proto__fine">
				A concept generated from this conversation, not a finished design. It exists to show
				you what we understood — the real thing starts from your brand and your users.
			</p>
		</figure>
	);
}

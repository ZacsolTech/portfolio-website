import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { RoadmapDocument } from "@/components/roadmap/roadmap-document";
import { findRoadmapByToken, recordRoadmapView, roadmapUrl } from "@/lib/roadmaps/store";

/**
 * `/roadmap/[id]` — the consultant's output as a forwardable document.
 *
 * Always rendered dynamically and never cached: the token is a bearer
 * credential, and a roadmap sitting in a shared CDN cache is somebody else's
 * quote waiting to be served to the wrong person.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ id: string }> };

/**
 * `noindex` is not optional here. These pages contain a named individual and a
 * price, and they are reachable by anyone holding the link — that must not
 * include anyone holding a search engine.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const { id } = await params;
	const roadmap = await findRoadmapByToken(id);

	return {
		title: roadmap ? `${roadmap.title} — Solution roadmap` : "Roadmap",
		description: roadmap?.blueprint.why?.slice(0, 200),
		robots: { index: false, follow: false, nocache: true, noarchive: true },
		alternates: { canonical: undefined },
	};
}

export default async function RoadmapPage({ params }: Params) {
	const { id } = await params;
	const roadmap = await findRoadmapByToken(id);

	if (!roadmap) notFound();

	// Counted after the response is flushed — the reader waits for the document,
	// not for our analytics write.
	after(() => recordRoadmapView(id));

	return (
		// Pinned to the light palette: the recipient is usually someone the
		// sender forwarded it to, and a dark-mode quote reads as a screenshot
		// rather than a proposal.
		<div className="roadmap-page" data-theme="light">
			<RoadmapDocument
				name={roadmap.name}
				blueprint={roadmap.blueprint}
				slots={roadmap.slots}
				createdAt={roadmap.createdAt}
				shareUrl={roadmapUrl(roadmap.token)}
			/>
		</div>
	);
}

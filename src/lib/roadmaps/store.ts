import { PrototypeSchema, type Prototype } from "@/lib/ai/prototype-schema";
import { BlueprintSchema, SlotsSchema, type Blueprint, type Slots } from "@/lib/ai/schema";
import { createToken } from "@/lib/security/tokens";
import { absoluteUrl } from "@/lib/seo";

/**
 * Shareable roadmap storage.
 *
 * The document is *frozen* at mint time. Someone who forwards a roadmap to
 * their board must be able to trust that the link still shows the numbers they
 * forwarded — so the blueprint is copied into the row rather than referenced
 * from a session that expires in six hours or from a lead a colleague might edit.
 */

export type RoadmapDocument = {
	token: string;
	title: string;
	name: string;
	email: string;
	blueprint: Blueprint;
	prototype: Prototype | null;
	slots: Slots;
	createdAt: string;
	views: number;
};

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

export function roadmapUrl(token: string): string {
	return absoluteUrl(`/roadmap/${token}`);
}

/**
 * Mint a roadmap. Returns null rather than throwing: a database outage should
 * cost the shareable link, not the blueprint email the visitor is waiting for.
 */
export async function createRoadmap(input: {
	name: string;
	email: string;
	blueprint: Blueprint;
	prototype?: Prototype | null;
	slots: Slots;
	leadId?: string | number;
}): Promise<{ id: string | number; token: string; url: string } | null> {
	const token = createToken();

	try {
		const payload = await payloadClient();
		const doc = await payload.create({
			collection: "roadmaps",
			overrideAccess: true,
			data: {
				token,
				title: input.blueprint.title,
				name: input.name,
				email: input.email,
				blueprint: input.blueprint,
				prototype: input.prototype ?? null,
				slots: input.slots,
				views: 0,
				...(input.leadId !== undefined ? { lead: input.leadId } : {}),
			} as never,
		});

		return { id: doc.id, token, url: roadmapUrl(token) };
	} catch (err) {
		console.error("[roadmaps] could not mint roadmap:", err);
		return null;
	}
}

/**
 * Load a roadmap by its link token.
 *
 * Both the blueprint and the intake are re-validated on the way out. They were
 * written as free-form JSON, and a shape that has drifted since should render a
 * 404 rather than crash the page for whoever the link was forwarded to.
 */
export async function findRoadmapByToken(
	token: string,
): Promise<RoadmapDocument | null> {
	if (!token || token.length > 128) return null;

	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "roadmaps",
			where: { token: { equals: token } },
			limit: 1,
			overrideAccess: true,
		});

		const doc = found.docs[0];
		if (!doc || doc.revoked) return null;

		const blueprint = BlueprintSchema.safeParse(doc.blueprint);
		if (!blueprint.success) {
			console.error(`[roadmaps] stored blueprint failed validation for ${token}`);
			return null;
		}

		const slots = SlotsSchema.safeParse(doc.slots ?? {});

		// A mock that no longer validates is dropped, never fatal: the document
		// is the blueprint, and losing a picture beats 404-ing a link someone
		// forwarded to their board.
		const prototype = doc.prototype ? PrototypeSchema.safeParse(doc.prototype) : null;
		if (doc.prototype && !prototype?.success) {
			console.warn(`[roadmaps] stored prototype failed validation for ${token}`);
		}

		return {
			token: doc.token,
			title: doc.title,
			name: doc.name,
			email: doc.email,
			blueprint: blueprint.data,
			prototype: prototype?.success ? prototype.data : null,
			slots: slots.success ? slots.data : {},
			createdAt: doc.createdAt,
			views: typeof doc.views === "number" ? doc.views : 0,
		};
	} catch (err) {
		console.error(`[roadmaps] lookup failed for ${token}:`, err);
		return null;
	}
}

/**
 * Count a view. Fire-and-forget from the page render — a failed counter must
 * never take down the document it is counting.
 */
export async function recordRoadmapView(token: string): Promise<void> {
	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "roadmaps",
			where: { token: { equals: token } },
			limit: 1,
			overrideAccess: true,
		});
		const doc = found.docs[0];
		if (!doc) return;

		await payload.update({
			collection: "roadmaps",
			id: doc.id,
			overrideAccess: true,
			data: {
				views: (typeof doc.views === "number" ? doc.views : 0) + 1,
				lastViewedAt: new Date().toISOString(),
			} as never,
		});
	} catch {
		// Analytics, not correctness.
	}
}

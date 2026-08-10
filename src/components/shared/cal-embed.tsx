"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Cal.com inline embed.
 *
 * Loaded from Cal's CDN rather than through `@calcom/embed-react`: the official
 * snippet is a few lines, it is the interface Cal versions and supports, and it
 * keeps a third-party scheduling widget out of the main bundle for the 16 pages
 * that never show it.
 *
 * Only rendered when `NEXT_PUBLIC_CAL_LINK` is set. Without it the site uses its
 * own booking flow, so nothing here is on the critical path.
 */

type CalApi = ((action: string, ...args: unknown[]) => void) & {
	ns?: Record<string, CalApi>;
	q?: unknown[];
	loaded?: boolean;
};

declare global {
	interface Window {
		Cal?: CalApi;
	}
}

const SCRIPT_SRC = "https://app.cal.com/embed/embed.js";

let loader: Promise<void> | null = null;

function loadCal(): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.Cal?.loaded) return Promise.resolve();
	if (loader) return loader;

	loader = new Promise<void>((resolve, reject) => {
		// Cal's own bootstrap: a queueing stub so `Cal(...)` calls made before the
		// script arrives are replayed once it does.
		if (!window.Cal) {
			const stub: CalApi = ((...args: unknown[]) => {
				stub.q = stub.q ?? [];
				stub.q.push(args);
			}) as CalApi;
			window.Cal = stub;
		}

		const script = document.createElement("script");
		script.src = SCRIPT_SRC;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => {
			loader = null;
			reject(new Error("cal.com embed failed to load"));
		};
		document.head.appendChild(script);
	});

	return loader;
}

export function CalEmbed({ calLink }: { calLink: string }) {
	const hostId = useId().replace(/[^a-zA-Z0-9-]/g, "");
	const mounted = useRef(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (mounted.current) return;
		mounted.current = true;

		loadCal()
			.then(() => {
				const cal = window.Cal;
				if (!cal) return;
				cal("init", { origin: "https://app.cal.com" });
				cal("inline", {
					elementOrSelector: `#${hostId}`,
					calLink,
					config: { layout: "month_view" },
				});
				cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
			})
			.catch(() => setFailed(true));
	}, [calLink, hostId]);

	if (failed) {
		return (
			<p className="body-sm" role="alert" style={{ padding: "2rem 1rem" }}>
				The booking calendar couldn&apos;t load. Email{" "}
				<a href="mailto:hello@zacsol.com">hello@zacsol.com</a> and we&apos;ll find a time.
			</p>
		);
	}

	return <div id={hostId} style={{ width: "100%", minHeight: "34rem", overflow: "auto" }} />;
}

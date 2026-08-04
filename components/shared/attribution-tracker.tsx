"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/leads/attribution";

/**
 * Records first-touch campaign data once per tab.
 *
 * Mounted in the frontend layout so it runs on whichever page the visitor
 * lands on — by the time they reach a form the campaign query string is long
 * gone from the URL.
 */
export function AttributionTracker() {
	useEffect(() => {
		captureAttribution();
	}, []);

	return null;
}

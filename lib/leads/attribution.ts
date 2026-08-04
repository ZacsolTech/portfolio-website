"use client";

import { AttributionSchema, type Attribution } from "./schema";

/**
 * First-touch attribution, captured in the browser.
 *
 * Written once per tab on the first page view and read again whenever a form
 * submits, so a visitor who lands on a campaign URL and converts three pages
 * later still carries the campaign that brought them.
 *
 * Deliberately `sessionStorage`, not a cookie or `localStorage`: it is not
 * shared across tabs, dies with the tab, and never leaves the origin, which
 * keeps it outside the consent banner while still answering the only question
 * we actually ask of it — "which campaign produced this lead?".
 */

const STORAGE_KEY = "zacsol:attribution";

const PARAM_MAP: Record<string, keyof Attribution> = {
	utm_source: "source",
	utm_medium: "medium",
	utm_campaign: "campaign",
	utm_term: "term",
	utm_content: "content",
	gclid: "gclid",
	fbclid: "fbclid",
};

function isInternalReferrer(referrer: string): boolean {
	if (!referrer) return true;
	try {
		return new URL(referrer).host === window.location.host;
	} catch {
		return true;
	}
}

/**
 * Record attribution if this tab has none yet.
 *
 * First touch wins: a visitor who arrives from an ad, reads three pages and
 * then converts should be credited to the ad, not to the internal link they
 * happened to click last.
 */
export function captureAttribution(): void {
	if (typeof window === "undefined") return;
	try {
		if (window.sessionStorage.getItem(STORAGE_KEY)) return;

		const params = new URLSearchParams(window.location.search);
		const captured: Attribution = {
			firstSeenAt: new Date().toISOString(),
			landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 300),
		};

		for (const [param, key] of Object.entries(PARAM_MAP)) {
			const value = params.get(param);
			if (value) captured[key] = value.slice(0, 200);
		}

		const referrer = document.referrer;
		if (!isInternalReferrer(referrer)) {
			captured.referrer = referrer.slice(0, 500);
		}

		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
	} catch {
		// Private browsing can throw on sessionStorage. Attribution is a
		// nice-to-have; never let it break the page it is embedded in.
	}
}

/** Attribution for this tab, or an empty object when there is none. */
export function readAttribution(): Attribution {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = AttributionSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : {};
	} catch {
		return {};
	}
}

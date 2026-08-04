"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing when no site key is configured, so local development and
 * preview builds are not blocked behind a challenge that cannot succeed. The
 * server verifies independently — a client that skips this still gets rejected
 * once the keys exist.
 *
 * Explicit rendering (rather than the `cf-turnstile` auto-render class) is used
 * because forms here live inside React trees that mount and unmount: explicit
 * mode gives us a handle to remove, and to reset after a failed submit so the
 * visitor gets a fresh, single-use token on their retry.
 */

type TurnstileApi = {
	render: (
		element: HTMLElement,
		options: {
			sitekey: string;
			callback: (token: string) => void;
			"error-callback"?: () => void;
			"expired-callback"?: () => void;
			"timeout-callback"?: () => void;
			theme?: "auto" | "light" | "dark";
			size?: "normal" | "flexible" | "compact";
			action?: string;
			appearance?: "always" | "execute" | "interaction-only";
		},
	) => string;
	remove: (widgetId: string) => void;
	reset: (widgetId: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
		onloadTurnstileCallback?: () => void;
	}
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** One shared loader promise: several forms can be on a page at once. */
let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.turnstile) return Promise.resolve();
	if (scriptPromise) return scriptPromise;

	scriptPromise = new Promise<void>((resolve, reject) => {
		const existing = document.getElementById(SCRIPT_ID);
		if (existing) {
			existing.addEventListener("load", () => resolve());
			existing.addEventListener("error", () => reject(new Error("turnstile failed")));
			return;
		}

		const script = document.createElement("script");
		script.id = SCRIPT_ID;
		script.src = SCRIPT_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => {
			scriptPromise = null;
			reject(new Error("turnstile failed to load"));
		};
		document.head.appendChild(script);
	});

	return scriptPromise;
}

export type TurnstileProps = {
	/** Receives the single-use token, or `null` when it expires or errors. */
	onToken: (token: string | null) => void;
	/** Labels the challenge in Cloudflare's analytics, e.g. "contact". */
	action?: string;
	className?: string;
};

export type TurnstileHandle = { reset: () => void };

export function Turnstile({ onToken, action, className }: TurnstileProps) {
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
	const hostRef = useRef<HTMLDivElement>(null);
	const widgetRef = useRef<string | null>(null);
	const [failed, setFailed] = useState(false);
	const id = useId();

	// Kept in a ref so re-renders of the parent form never re-run the effect and
	// tear down a widget the visitor has already solved.
	const onTokenRef = useRef(onToken);
	useEffect(() => {
		onTokenRef.current = onToken;
	}, [onToken]);

	useEffect(() => {
		if (!siteKey) return;
		let cancelled = false;

		loadTurnstile()
			.then(() => {
				if (cancelled || !hostRef.current || !window.turnstile) return;
				widgetRef.current = window.turnstile.render(hostRef.current, {
					sitekey: siteKey,
					action,
					theme: "auto",
					size: "flexible",
					callback: (token) => onTokenRef.current(token),
					"expired-callback": () => onTokenRef.current(null),
					"timeout-callback": () => onTokenRef.current(null),
					"error-callback": () => {
						onTokenRef.current(null);
						setFailed(true);
					},
				});
			})
			.catch(() => {
				if (!cancelled) setFailed(true);
			});

		return () => {
			cancelled = true;
			const widgetId = widgetRef.current;
			if (widgetId && window.turnstile) {
				try {
					window.turnstile.remove(widgetId);
				} catch {
					// Already gone with the DOM node. Nothing to clean up.
				}
			}
			widgetRef.current = null;
		};
	}, [siteKey, action]);

	if (!siteKey) return null;

	return (
		<div className={className} style={{ marginTop: "1rem" }}>
			<div ref={hostRef} id={`turnstile-${id}`} />
			{failed ? (
				<p className="body-sm" style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>
					The verification check could not load. You can still submit — we screen on
					the server too.
				</p>
			) : null}
		</div>
	);
}

/**
 * Token state plus a reset, for forms that need a fresh token after a failed
 * submit. Turnstile tokens are single-use: reusing one returns
 * `timeout-or-duplicate` and the visitor is told their retry failed too.
 */
export function useTurnstile() {
	const [token, setToken] = useState<string | null>(null);
	const [nonce, setNonce] = useState(0);

	const reset = useCallback(() => {
		setToken(null);
		// Remounting the widget is the only reliable way to invalidate a spent
		// token across every Turnstile mode.
		setNonce((n) => n + 1);
	}, []);

	return { token, setToken, reset, nonce } as const;
}

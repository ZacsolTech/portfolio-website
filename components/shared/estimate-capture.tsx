"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Turnstile, useTurnstile } from "@/components/shared/turnstile";
import { readAttribution } from "@/lib/leads/attribution";

/**
 * Optional capture on the estimator's result screen.
 *
 * Everything above it is already unlocked. This is an offer, not a gate — it
 * collapses to a single line until someone chooses to open it, so a visitor
 * who only wanted the number is never asked for anything.
 */

const CONSENT_TEXT =
	"Send me this estimate by email. We'll follow up once or twice — you can stop it at any time.";

export function EstimateCapture({ sessionId }: { sessionId: string }) {
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const turnstile = useTurnstile();

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;

		const form = event.currentTarget;
		const data = new FormData(form);

		setBusy(true);
		setError(null);

		try {
			const res = await fetch("/api/estimator", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "capture",
					sessionId,
					name: String(data.get("name") ?? "").trim(),
					email: String(data.get("email") ?? "").trim(),
					company: String(data.get("company") ?? ""),
					utm: readAttribution(),
					turnstileToken: turnstile.token ?? undefined,
				}),
			});

			const payload = (await res.json().catch(() => null)) as { error?: string } | null;
			if (!res.ok) throw new Error(payload?.error ?? "Could not save that.");

			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save that.");
			// Turnstile tokens are single-use; a retry needs a fresh one.
			turnstile.reset();
		} finally {
			setBusy(false);
		}
	}

	if (done) {
		return (
			<p className="est-capture est-capture--done" role="status">
				Got it — a senior engineer will look at this estimate and follow up.
			</p>
		);
	}

	if (!open) {
		return (
			<p className="est-capture">
				Want a person to sanity-check this?{" "}
				<button type="button" className="link-u est-capture__open" onClick={() => setOpen(true)}>
					Send it to an engineer
				</button>
				.
			</p>
		);
	}

	return (
		<form onSubmit={onSubmit} className="est-capture est-capture--form" noValidate>
			<label className="sr-only" htmlFor="est-name">
				Full name
			</label>
			<input
				id="est-name"
				name="name"
				className="gate__field"
				placeholder="Full name"
				autoComplete="name"
				required
				minLength={2}
				maxLength={80}
			/>
			<label className="sr-only" htmlFor="est-email">
				Work email
			</label>
			<input
				id="est-email"
				name="email"
				type="email"
				className="gate__field"
				placeholder="Work email"
				autoComplete="email"
				required
				maxLength={160}
			/>
			{/* Honeypot — off-screen, not display:none, so bots still fill it. */}
			<input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />

			<Turnstile key={turnstile.nonce} action="estimator-capture" onToken={turnstile.setToken} />

			<button type="submit" className="btn btn--gold" disabled={busy}>
				{busy ? "Sending…" : "Send it over"}
			</button>

			<p className="gate__fine">
				{CONSENT_TEXT} See <Link href="/privacy">privacy</Link>.
			</p>

			{error ? (
				<p role="alert" className="form-error">
					{error}
				</p>
			) : null}
		</form>
	);
}

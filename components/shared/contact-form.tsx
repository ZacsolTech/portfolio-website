"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Turnstile, useTurnstile } from "@/components/shared/turnstile";
import { Check, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { contactExpectations, services, site } from "@/lib/content";
import { zac } from "@/lib/content/zac";
import { readAttribution } from "@/lib/leads/attribution";

const CONSENT_TEXT =
	"I agree to be contacted by email about this enquiry. We don't sell your details.";

export function ContactForm() {
	const router = useRouter();
	const [consent, setConsent] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const turnstile = useTurnstile();

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy || !consent) return;

		const form = event.currentTarget;
		const data = new FormData(form);

		setBusy(true);
		setError(null);

		try {
			const res = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: String(data.get("name") ?? "").trim(),
					email: String(data.get("email") ?? "").trim(),
					phone: String(data.get("phone") ?? "").trim() || undefined,
					service: String(data.get("service") ?? "") || undefined,
					budget: String(data.get("budget") ?? "") || undefined,
					message: String(data.get("message") ?? "").trim(),
					company: String(data.get("company") ?? ""),
					consent: true,
					utm: readAttribution(),
					turnstileToken: turnstile.token ?? undefined,
				}),
			});

			const payload = (await res.json().catch(() => null)) as { error?: string } | null;
			if (!res.ok) throw new Error(payload?.error ?? "Could not send that just now.");

			router.push("/thank-you");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not send that just now.");
			// Turnstile tokens are single-use; a retry needs a fresh one.
			turnstile.reset();
			setBusy(false);
		}
	}

	return (
		<form onSubmit={onSubmit} noValidate>
			<Panel className="contact-panel" style={{ padding: "1.75rem" }}>
				<p className="body-sm" style={{ margin: "0 0 1.25rem" }}>
					In a hurry?{" "}
					<Link href="/consultant" className="link-u">
						{zac.consultant.name} answers in three minutes
					</Link>
					.
				</p>

				<div className="grid-2" style={{ gap: "1rem" }}>
					<Field label="Name" htmlFor="contact-name">
						<Input
							id="contact-name"
							name="name"
							autoComplete="name"
							required
							minLength={2}
							maxLength={80}
						/>
					</Field>
					<Field label="Email" htmlFor="contact-email">
						<Input
							id="contact-email"
							name="email"
							type="email"
							autoComplete="email"
							required
							maxLength={160}
						/>
					</Field>
				</div>

				<Field label="Phone (optional)" htmlFor="contact-phone">
					<Input
						id="contact-phone"
						name="phone"
						type="tel"
						autoComplete="tel"
						maxLength={40}
						style={{ marginTop: "1rem" }}
					/>
				</Field>

				<Field label="Service needed" htmlFor="contact-service">
					<Select
						id="contact-service"
						name="service"
						defaultValue=""
						required
						style={{ marginTop: "1rem" }}
					>
						<option value="" disabled>
							Select a service
						</option>
						<option value="advise">Not sure — advise me</option>
						{services.map((service) => (
							<option key={service.slug} value={service.slug}>
								{service.shortTitle}
							</option>
						))}
					</Select>
				</Field>

				<Field label="Budget band" htmlFor="contact-budget">
					<Select
						id="contact-budget"
						name="budget"
						defaultValue=""
						style={{ marginTop: "1rem" }}
					>
						<option value="" disabled>
							Optional
						</option>
						<option value="under-25k">Under $25k</option>
						<option value="25-75k">$25k – $75k</option>
						<option value="75-150k">$75k – $150k</option>
						<option value="150k-plus">$150k+</option>
						<option value="unsure">Not sure yet</option>
					</Select>
				</Field>

				<Field label="Message" htmlFor="contact-message">
					<Textarea
						id="contact-message"
						name="message"
						rows={5}
						required
						minLength={10}
						maxLength={4000}
						placeholder="The goal, the bottleneck, timeline and constraints…"
						style={{ marginTop: "1rem" }}
					/>
				</Field>

				{/* Honeypot — off-screen, not display:none, so bots still fill it. */}
				<input
					type="text"
					name="company"
					tabIndex={-1}
					autoComplete="off"
					aria-hidden
					className="sr-only"
				/>

				<label className="consent">
					<input
						type="checkbox"
						name="consent"
						checked={consent}
						onChange={(event) => setConsent(event.target.checked)}
						required
					/>
					<span>
						{CONSENT_TEXT} See our <Link href="/privacy">privacy policy</Link>.
					</span>
				</label>

				<Turnstile key={turnstile.nonce} action="contact" onToken={turnstile.setToken} />

				<button
					type="submit"
					className="btn btn--gold btn--lg"
					style={{ marginTop: "1.5rem", width: "100%" }}
					disabled={busy || !consent}
				>
					{busy ? "Sending…" : "Send message"}
				</button>

				{error ? (
					<p role="alert" className="form-error">
						{error}
					</p>
				) : null}
			</Panel>
		</form>
	);
}

export function ContactExpectations() {
	return (
		<div>
			<span className="overline">What to expect</span>
			<h1 className="d2" style={{ marginTop: "0.75rem" }}>
				Tell us what&apos;s broken.
			</h1>
			<p className="lead" style={{ marginTop: "1.25rem" }}>
				A senior engineer replies with a direction — whether or not you hire us.
			</p>

			<div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
				{contactExpectations.map((item) => (
					<Check key={item.title}>
						<strong style={{ display: "block", color: "var(--text-ink)" }}>
							{item.title}
						</strong>
						<span className="body-sm">{item.body}</span>
					</Check>
				))}
			</div>

			<div style={{ marginTop: "2.5rem" }}>
				<p className="overline">Email</p>
				<p style={{ marginTop: "0.5rem" }}>
					<a href={`mailto:${site.email}`}>{site.email}</a>
				</p>
				<p className="body-sm" style={{ marginTop: "1rem" }}>
					{site.locations}
				</p>
			</div>
		</div>
	);
}

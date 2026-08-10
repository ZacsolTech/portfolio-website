"use client";

import { useId, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Turnstile, useTurnstile } from "@/components/shared/turnstile";

type State = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const emailId = useId();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const turnstile = useTurnstile();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;

    const form = e.currentTarget;
    const data = new FormData(form);

    setState("sending");
    setError("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          company: String(data.get("company") ?? ""),
          turnstileToken: turnstile.token ?? undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Something went wrong. Please try again.");
        setState("error");
        // Turnstile tokens are single-use; a retry needs a fresh one.
        turnstile.reset();
        return;
      }

      form.reset();
      setState("done");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
      turnstile.reset();
    }
  }

  if (state === "done") {
    return (
      <p className="newsletter__done" role="status">
        <span className="newsletter__check" aria-hidden>
          <Check size={14} />
        </span>
        You&apos;re on the list. The next teardown goes out when it&apos;s worth sending.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label className="sr-only" htmlFor={emailId}>
        Email address
      </label>
      <input
        id={emailId}
        type="email"
        name="email"
        placeholder="you@company.com"
        autoComplete="email"
        required
        disabled={state === "sending"}
        aria-describedby={state === "error" ? `${emailId}-error` : undefined}
        aria-invalid={state === "error" || undefined}
      />
      {/* Honeypot — off-screen, not display:none, so bots still fill it. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="sr-only"
      />
      <button type="submit" className="btn btn--gold" disabled={state === "sending"}>
        {state === "sending" ? "Subscribing…" : "Subscribe"}
      </button>
      <Turnstile
        key={turnstile.nonce}
        action="newsletter"
        className="newsletter__turnstile"
        onToken={turnstile.setToken}
      />

      {state === "error" ? (
        <p className="newsletter__error" id={`${emailId}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

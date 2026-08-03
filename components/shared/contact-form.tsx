"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { contactExpectations, services, site } from "@/lib/content";
import { zac } from "@/lib/content/zac";

export function ContactForm() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) return;
    router.push("/thank-you");
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
            <Input id="contact-name" name="name" autoComplete="name" required />
          </Field>
          <Field label="Email" htmlFor="contact-email">
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
        </div>

        <Field label="Phone (optional)" htmlFor="contact-phone">
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            style={{ marginTop: "1rem" }}
          />
        </Field>

        <Field label="Service needed" htmlFor="contact-service">
          <Select id="contact-service" name="service" defaultValue="" required style={{ marginTop: "1rem" }}>
            <option value="" disabled>
              Select a service
            </option>
            <option value="advise">Not sure — advise me</option>
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.shortTitle}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Budget band" htmlFor="contact-budget">
          <Select id="contact-budget" name="budget" defaultValue="" style={{ marginTop: "1rem" }}>
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
            placeholder="The goal, the bottleneck, timeline and constraints…"
            style={{ marginTop: "1rem" }}
          />
        </Field>

        <label
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            marginTop: "1.25rem",
            fontSize: "0.8125rem",
            lineHeight: 1.5,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            I agree to be contacted by email about this enquiry. We don&apos;t sell your
            details. See our{" "}
            <Link href="/privacy">privacy policy</Link>.
          </span>
        </label>

        <button type="submit" className="btn btn--gold btn--lg" style={{ marginTop: "1.5rem", width: "100%" }}>
          Send message
        </button>
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
            <strong style={{ display: "block", color: "var(--text-ink)" }}>{item.title}</strong>
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

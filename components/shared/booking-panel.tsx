"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Panel, Textarea } from "@/components/ui";
import { team } from "@/lib/content";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const SLOTS = ["09:30", "11:00", "13:30", "15:00", "16:30"] as const;

/** Static November 2026 calendar grid (Sun-start offset adjusted for Mon labels). */
const DAYS: { d: number; off?: boolean }[] = [
  { d: 27, off: true },
  { d: 28, off: true },
  { d: 29, off: true },
  { d: 30, off: true },
  { d: 31, off: true },
  { d: 1 },
  { d: 2 },
  { d: 3 },
  { d: 4 },
  { d: 5 },
  { d: 6 },
  { d: 7 },
  { d: 8 },
  { d: 9 },
  { d: 10 },
  { d: 11 },
  { d: 12 },
  { d: 13 },
  { d: 14 },
  { d: 15 },
  { d: 16 },
  { d: 17 },
  { d: 18 },
  { d: 19 },
  { d: 20 },
  { d: 21 },
  { d: 22 },
  { d: 23 },
  { d: 24 },
  { d: 25 },
  { d: 26 },
  { d: 27 },
  { d: 28 },
  { d: 29 },
  { d: 30 },
];

export function BookingPanel() {
  const router = useRouter();
  const host = team[0];
  const [day, setDay] = useState(6);
  const [slot, setSlot] = useState<string>("11:00");
  const [consent, setConsent] = useState(false);

  const confirmLabel = useMemo(() => {
    return `Confirm ${slot}, Fri ${day} Nov`;
  }, [day, slot]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) return;
    router.push("/thank-you");
  }

  return (
    <div
      style={{ display: "grid", gap: "2.5rem", gridTemplateColumns: "1fr" }}
      className="book-grid"
    >
      <div>
        <span className="overline">Consultation</span>
        <h1 className="d2" style={{ marginTop: "0.75rem" }}>
          Thirty minutes. <span className="em-serif">Not a sales call.</span>
        </h1>
        <p className="lead" style={{ marginTop: "1.25rem" }}>
          We cover the bottleneck, whether software is the right lever, and what a first phase would
          look like — with honest tradeoffs.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginTop: "2rem",
            padding: "1.25rem",
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--line-soft)",
            background: "var(--paper-alt)",
          }}
        >
          <div
            className="team-avatar"
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "50%",
              border: "none",
              fontSize: "1rem",
              flexShrink: 0,
            }}
            aria-hidden
          >
            {host.initials}
          </div>
          <div>
            <p className="d4" style={{ margin: 0, fontSize: "1.0625rem" }}>
              {host.name}
            </p>
            <p className="body-sm" style={{ margin: "0.25rem 0 0" }}>
              {host.role}
            </p>
          </div>
        </div>

        <ul
          style={{
            marginTop: "1.75rem",
            paddingLeft: "1.1rem",
            display: "grid",
            gap: "0.625rem",
            color: "var(--text-muted)",
            fontSize: "0.9375rem",
          }}
        >
          <li>What&apos;s actually broken vs what feels urgent</li>
          <li>Whether to build, buy or wait</li>
          <li>A rough phase plan you can challenge</li>
        </ul>
      </div>

      <Panel style={{ padding: "1.75rem" }}>
        <p className="overline">November 2026</p>
        <div
          className="cal"
          style={{ marginTop: "1rem" }}
          role="grid"
          aria-label="Select a day"
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "0.625rem",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                paddingBottom: "0.25rem",
              }}
            >
              {w}
            </div>
          ))}
          {DAYS.map((cell, i) => (
            <button
              key={`${cell.d}-${i}`}
              type="button"
              className={`cal__d${cell.off ? " cal__d--off" : ""}${
                !cell.off && cell.d === day ? " cal__d--on" : ""
              }`}
              disabled={cell.off}
              onClick={() => setDay(cell.d)}
              aria-pressed={!cell.off && cell.d === day}
            >
              {cell.d}
            </button>
          ))}
        </div>

        <p className="overline" style={{ marginTop: "1.75rem" }}>
          Time slots
        </p>
        <div className="slots" style={{ marginTop: "0.75rem" }}>
          {SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              className={`slot${slot === s ? " slot--on" : ""}`}
              onClick={() => setSlot(s)}
              aria-pressed={slot === s}
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: "1.75rem" }} noValidate>
          <div className="grid-2" style={{ gap: "1rem" }}>
            <Field label="Name" htmlFor="book-name">
              <Input id="book-name" name="name" required autoComplete="name" />
            </Field>
            <Field label="Email" htmlFor="book-email">
              <Input id="book-email" name="email" type="email" required autoComplete="email" />
            </Field>
          </div>
          <Field label="Topic" htmlFor="book-topic">
            <Textarea
              id="book-topic"
              name="topic"
              rows={3}
              placeholder="What should we focus on?"
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
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              style={{ marginTop: "0.2rem" }}
            />
            <span>
              Email me a calendar invite and reminder. See{" "}
              <Link href="/privacy">privacy</Link>.
            </span>
          </label>

          <button type="submit" className="btn btn--gold btn--lg" style={{ marginTop: "1.5rem", width: "100%" }}>
            {confirmLabel}
          </button>
        </form>
      </Panel>

      <style>{`
        @media (min-width: 960px) {
          .book-grid {
            grid-template-columns: 0.95fr 1.15fr !important;
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}

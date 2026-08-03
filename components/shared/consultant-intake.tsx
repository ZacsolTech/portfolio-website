"use client";

import Link from "next/link";
import { useState } from "react";
import { Console, ConsoleBar, ConsoleBody } from "@/components/ui";

const SEEDS = [
  "Enquiries get lost",
  "Manual data entry",
  "I have an app idea",
  "Data, no insight",
] as const;

export function ConsultantIntake() {
  const [text, setText] = useState("");

  return (
    <div
      style={{
        display: "grid",
        gap: "2rem",
        gridTemplateColumns: "1fr",
      }}
      className="consultant-layout"
    >
      <Console>
        <ConsoleBar title="AI Solution Consultant · intake" />
        <ConsoleBody>
          <div className="chat">
            <div className="msg msg--bot">
              <div className="msg__avatar">AI</div>
              <div className="msg__bubble">
                Tell me what&apos;s slowing your business down. Plain language is fine — a messy
                paragraph beats a polished feature list.
              </div>
            </div>
          </div>

          <div
            className="chips"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginTop: "1.25rem",
            }}
          >
            {SEEDS.map((seed) => (
              <button
                key={seed}
                type="button"
                className="chip"
                style={{ cursor: "pointer", border: "1px solid rgba(255,255,255,.14)" }}
                onClick={() => setText(seed)}
              >
                {seed}
              </button>
            ))}
          </div>

          <div className="composer" style={{ marginTop: "1.5rem" }}>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Orders come in on chat and we lose half of them…"
              aria-label="Describe your business problem"
            />
            <button type="button" className="btn btn--gold" disabled>
              Continue
            </button>
          </div>
          <p
            className="body-sm"
            style={{ marginTop: "1rem", color: "rgba(255,255,255,.45)", fontSize: "0.75rem" }}
          >
            Full conversational AI ships in Sprint 4. This intake shell matches the production
            console — continue will stream turns then.
          </p>
        </ConsoleBody>
      </Console>

      <aside className="consultant-aside">
        <div className="aside-card">
          <h3>What you get free</h3>
          <ul>
            <li>Recommended solution and why</li>
            <li>Feature list, stack and phased timeline</li>
            <li>Indicative investment band</li>
            <li>PDF roadmap by email — no call required</li>
          </ul>
        </div>
        <div className="aside-card">
          <h3>Answer honestly</h3>
          <p>
            The quality of the blueprint tracks the quality of the problem description. Vague in,
            generic out.
          </p>
        </div>
        <div className="aside-card aside-card--accent">
          <h3>Prefer a human?</h3>
          <p style={{ marginBottom: "1rem" }}>
            Thirty minutes with a senior engineer. Not a sales script.
          </p>
          <Link href="/book" className="btn btn--gold" style={{ width: "100%" }}>
            Book a consultation
          </Link>
        </div>
        <div className="aside-card">
          <h3>Other free tools</h3>
          <ul>
            <li>
              <Link href="/tools/estimator">Project cost estimator</Link>
            </li>
            <li>
              <Link href="/tools/readiness">AI readiness assessment</Link>
            </li>
          </ul>
        </div>
      </aside>

      <style>{`
        @media (min-width: 1100px) {
          .consultant-layout {
            grid-template-columns: 1.5fr 0.85fr !important;
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}

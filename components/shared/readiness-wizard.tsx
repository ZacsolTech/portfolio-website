"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Console, ConsoleBar, ConsoleBody } from "@/components/ui";

const PILLARS = [
  {
    id: "data",
    label: "Data",
    questions: [
      "We have a single source of truth for core entities",
      "Historical data is clean enough for analysis",
      "PII / sensitive fields are classified and access-controlled",
    ],
  },
  {
    id: "process",
    label: "Process",
    questions: [
      "The bottleneck process is documented end to end",
      "Exceptions have known owners and SLAs",
      "We can measure time or cost saved if automation works",
    ],
  },
  {
    id: "team",
    label: "Team",
    questions: [
      "Someone owns knowledge quality after launch",
      "Operators will trust and correct the system",
      "We have capacity for a discovery + first release",
    ],
  },
  {
    id: "tooling",
    label: "Tooling",
    questions: [
      "APIs or exports exist for the systems involved",
      "We can stage changes without risking production",
      "Observability and rollback are already habits",
    ],
  },
] as const;

const ALL_QUESTIONS = PILLARS.flatMap((p) =>
  p.questions.map((q) => ({ pillar: p.id, pillarLabel: p.label, q })),
);

function band(score: number) {
  if (score < 40) return "Exploring";
  if (score < 60) return "Preparing";
  if (score < 80) return "Ready";
  return "Advanced";
}

export function ReadinessWizard() {
  const [answers, setAnswers] = useState<number[]>(() => Array(12).fill(0));
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const current = ALL_QUESTIONS[index];

  const score = useMemo(() => {
    const sum = answers.reduce((a, b) => a + b, 0);
    return Math.round((sum / (12 * 5)) * 100);
  }, [answers]);

  const pillarScores = useMemo(() => {
    return PILLARS.map((p) => {
      const idxs = ALL_QUESTIONS.map((q, i) => (q.pillar === p.id ? i : -1)).filter((i) => i >= 0);
      const sum = idxs.reduce((a, i) => a + answers[i], 0);
      return { label: p.label, pct: Math.round((sum / (idxs.length * 5)) * 100) };
    });
  }, [answers]);

  const gaps = useMemo(() => {
    return [...pillarScores].sort((a, b) => a.pct - b.pct).slice(0, 3);
  }, [pillarScores]);

  function setAnswer(value: number) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function continueNext() {
    if (answers[index] === 0) return;
    if (index < 11) setIndex(index + 1);
    else setDone(true);
  }

  return (
    <Console>
      <ConsoleBar title="AI readiness assessment" />
      <ConsoleBody>
        {!done ? (
          <>
            <div className="wiz-steps" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={`wiz-step${i < index ? " wiz-step--done" : ""}${
                    i === index ? " wiz-step--now" : ""
                  }`}
                />
              ))}
            </div>
            <p className="overline overline--gold" style={{ marginTop: "1.5rem" }}>
              {current.pillarLabel} · Q{index + 1} / 12
            </p>
            <h2 className="d4" style={{ color: "#fff", marginTop: "0.75rem" }}>
              {current.q}
            </h2>
            <p className="body-sm" style={{ color: "rgba(255,255,255,.5)", marginTop: "0.75rem" }}>
              Rate 1 (strongly disagree) to 5 (strongly agree)
            </p>
            <div className="scale-row" style={{ marginTop: "1.5rem" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`scale-btn${answers[index] === n ? " scale-btn--on" : ""}`}
                  onClick={() => setAnswer(n)}
                  aria-pressed={answers[index] === n}
                >
                  {n}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem", flexWrap: "wrap" }}>
              {index > 0 ? (
                <button
                  type="button"
                  className="btn btn--outline-dark"
                  onClick={() => setIndex(index - 1)}
                >
                  Back
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--gold"
                onClick={continueNext}
                disabled={answers[index] === 0}
              >
                {index === 11 ? "See score" : "Next"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: "0.5rem" }}>
            <p className="overline overline--gold">Your score</p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3rem",
                fontWeight: 600,
                color: "#fff",
                margin: "0.5rem 0 0",
              }}
            >
              {score}
              <span style={{ fontSize: "1.25rem", color: "rgba(255,255,255,.5)" }}>/100</span>
            </p>
            <p className="d4" style={{ color: "var(--gold)", marginTop: "0.5rem" }}>
              {band(score)}
            </p>

            <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
              {pillarScores.map((p) => (
                <div key={p.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.375rem",
                      fontSize: "0.8125rem",
                      color: "rgba(255,255,255,.7)",
                    }}
                  >
                    <span>{p.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{p.pct}%</span>
                  </div>
                  <div className="pillar-bar">
                    <span style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "2rem" }}>
              <p className="overline overline--gold">Biggest gaps</p>
              <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem", color: "rgba(255,255,255,.72)" }}>
                {gaps.map((g) => (
                  <li key={g.label}>
                    {g.label} ({g.pct}%)
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <p className="overline overline--gold">90-day actions (mock)</p>
              <ol
                style={{
                  margin: "0.75rem 0 0",
                  paddingLeft: "1.1rem",
                  color: "rgba(255,255,255,.72)",
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                <li>Name an owner for the bottleneck process and the knowledge store.</li>
                <li>Instrument the current path so savings are measurable.</li>
                <li>Ship a thin vertical with escalation — not a chatbot experiment.</li>
              </ol>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.75rem" }}>
              <Link href="/consultant" className="btn btn--gold">
                Get a solution roadmap
              </Link>
              <button
                type="button"
                className="btn btn--outline-dark"
                onClick={() => {
                  setDone(false);
                  setIndex(0);
                }}
              >
                Retake
              </button>
            </div>
          </div>
        )}
      </ConsoleBody>
    </Console>
  );
}

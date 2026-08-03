"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Console, ConsoleBar, ConsoleBody, Opt } from "@/components/ui";
import { services } from "@/lib/content";

const PLATFORMS = ["Web", "Mobile", "Both", "Internal tool"] as const;
const SCOPES = ["MVP", "Full product", "Rebuild", "Add to existing"] as const;
const SCALES = [
  "Under 1k users",
  "1k–10k users",
  "10k–100k users",
  "High transaction volume",
] as const;
const TIMELINES = ["ASAP", "This quarter", "This half", "Exploring"] as const;

export function EstimatorWizard() {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(services[0]?.slug ?? "");
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [scope, setScope] = useState<string>(SCOPES[0]);
  const [scale, setScale] = useState<string>(SCALES[0]);
  const [timeline, setTimeline] = useState<string>(TIMELINES[2]);
  const [done, setDone] = useState(false);

  const progress = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      if (done || i < step) return "wiz-step wiz-step--done";
      if (i === step) return "wiz-step wiz-step--now";
      return "wiz-step";
    });
  }, [step, done]);

  function next() {
    if (step < 4) setStep(step + 1);
    else setDone(true);
  }

  function back() {
    if (done) {
      setDone(false);
      return;
    }
    if (step > 0) setStep(step - 1);
  }

  return (
    <Console>
      <ConsoleBar title="AI project cost estimator" />
      <ConsoleBody>
        <div className="wiz-steps" aria-hidden>
          {progress.map((cls, i) => (
            <div key={i} className={cls} />
          ))}
        </div>

        {!done ? (
          <>
            <p className="overline overline--gold" style={{ marginTop: "1.5rem" }}>
              Step {step + 1} of 5
            </p>

            {step === 0 && (
              <>
                <h2 className="d4" style={{ color: "#fff", marginTop: "0.75rem" }}>
                  What are you building?
                </h2>
                <div style={{ display: "grid", gap: "0.625rem", marginTop: "1.25rem" }}>
                  {services.map((s, i) => (
                    <Opt
                      key={s.slug}
                      optKey={String(i + 1)}
                      pressed={service === s.slug}
                      onClick={() => setService(s.slug)}
                    >
                      {s.shortTitle}
                    </Opt>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="d4" style={{ color: "#fff", marginTop: "0.75rem" }}>
                  Platform
                </h2>
                <div style={{ display: "grid", gap: "0.625rem", marginTop: "1.25rem" }}>
                  {PLATFORMS.map((p, i) => (
                    <Opt
                      key={p}
                      optKey={String.fromCharCode(65 + i)}
                      pressed={platform === p}
                      onClick={() => setPlatform(p)}
                    >
                      {p}
                    </Opt>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="d4" style={{ color: "#fff", marginTop: "0.75rem" }}>
                  Scope
                </h2>
                <div style={{ display: "grid", gap: "0.625rem", marginTop: "1.25rem" }}>
                  {SCOPES.map((s, i) => (
                    <Opt
                      key={s}
                      optKey={String(i + 1)}
                      pressed={scope === s}
                      onClick={() => setScope(s)}
                    >
                      {s}
                    </Opt>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="d4" style={{ color: "#fff", marginTop: "0.75rem" }}>
                  Scale
                </h2>
                <div style={{ display: "grid", gap: "0.625rem", marginTop: "1.25rem" }}>
                  {SCALES.map((s, i) => (
                    <Opt
                      key={s}
                      optKey={String(i + 1)}
                      pressed={scale === s}
                      onClick={() => setScale(s)}
                    >
                      {s}
                    </Opt>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="d4" style={{ color: "#fff", marginTop: "0.75rem" }}>
                  Timeline
                </h2>
                <div style={{ display: "grid", gap: "0.625rem", marginTop: "1.25rem" }}>
                  {TIMELINES.map((t, i) => (
                    <Opt
                      key={t}
                      optKey={String(i + 1)}
                      pressed={timeline === t}
                      onClick={() => setTimeline(t)}
                    >
                      {t}
                    </Opt>
                  ))}
                </div>
              </>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1.75rem",
                flexWrap: "wrap",
              }}
            >
              {step > 0 ? (
                <button type="button" className="btn btn--outline-dark" onClick={back}>
                  Back
                </button>
              ) : null}
              <button type="button" className="btn btn--gold" onClick={next}>
                {step === 4 ? "See estimate" : "Continue"}
              </button>
            </div>
          </>
        ) : (
          <div className="blueprint" style={{ marginTop: "1.5rem" }}>
            <div className="bp-row">
              <div className="bp-row__k">Indicative investment</div>
              <div className="bp-row__v">$45k – $95k</div>
            </div>
            <div className="bp-row">
              <div className="bp-row__k">Duration</div>
              <div className="bp-row__v">10 – 16 weeks</div>
            </div>
            <div className="bp-row">
              <div className="bp-row__k">Team shape</div>
              <div className="bp-row__v">2–3 seniors · shared design</div>
            </div>
            <div className="bp-row">
              <div className="bp-row__k">Assumptions</div>
              <div style={{ color: "rgba(255,255,255,.72)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {services.find((s) => s.slug === service)?.shortTitle ?? "Custom build"} ·{" "}
                {platform} · {scope} · {scale} · {timeline}. Single primary workflow in v1; existing
                auth/provider reuse; no regulated data residency beyond standard cloud regions.
                Confirm in discovery.
              </div>
            </div>
            <p
              className="body-sm"
              style={{ color: "rgba(255,255,255,.45)", marginTop: "0.5rem", fontSize: "0.75rem" }}
            >
              Mock result for Sprint 3 UI. Production scoring lands with the lead pipeline.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.5rem" }}>
              <Link href="/consultant" className="btn btn--gold">
                Want features and a plan? Ask the consultant
              </Link>
              <button type="button" className="btn btn--outline-dark" onClick={back}>
                Adjust answers
              </button>
            </div>
          </div>
        )}
      </ConsoleBody>
    </Console>
  );
}

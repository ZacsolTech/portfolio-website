"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Console, ConsoleBar, ConsoleBody } from "@/components/ui";
import { priceProject } from "@/lib/estimator/pricing";
import {
  DESIGN_STATES,
  REQUIRED_SLOTS,
  SCALES,
  SLOT_LABELS,
  TIMELINES,
  formatBand,
  formatUsd,
  type Estimate,
  type EstimatorSlots,
  type LeverOverrides,
  type RequiredSlotKey,
} from "@/lib/estimator/schema";
import { zac } from "@/lib/content/zac";

const SESSION_KEY = "zacsol_estimator_session";

const GREETING = zac.estimator.greeting;

const STARTERS = [
  "A booking system for my clinic",
  "A mobile app for our field team",
  "Rebuild our outdated web portal",
  "An internal tool to replace spreadsheets",
] as const;

type Phase = "chat" | "pricing" | "estimate";

type UiMsg = { id: string; who: "bot" | "user"; text: string; streaming?: boolean };

type Resolved = {
  projectType: string;
  platform: string;
  scope: string;
  timeline: string;
  scale: string;
  designState: string;
  integrations: number;
  regulated: boolean;
  assumed: string[];
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return newId();
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = newId();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return newId();
  }
}

/* ------------------------------- primitives ------------------------------- */

function Typing() {
  return (
    <div className="msg msg--bot">
      <div className="msg__avatar" aria-hidden>
        {zac.avatar}
      </div>
      <div className="msg__bubble">
        <span className="typing">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">{zac.estimator.ariaTyping}</span>
      </div>
    </div>
  );
}

function IntakeProgress({
  slots,
  progress,
}: {
  slots: EstimatorSlots;
  progress: number;
}) {
  return (
    <div className="intake" aria-label={`Intake ${progress}% complete`}>
      <div className="intake__bar">
        <span style={{ width: `${progress}%` }} />
      </div>
      <ul className="intake__slots">
        {REQUIRED_SLOTS.map((key: RequiredSlotKey) => {
          const filled = Boolean(slots[key]);
          return (
            <li key={key} className={filled ? "is-filled" : undefined}>
              <span className="intake__tick" aria-hidden>
                {filled ? "✓" : "○"}
              </span>
              {SLOT_LABELS[key]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PricingPanel() {
  return (
    <div className="consultant-generating" role="status" aria-live="polite">
      <div className="consultant-generating__orb" aria-hidden />
      <p className="overline overline--gold">Pricing</p>
      <h3 className="d4" style={{ color: "#fff", marginTop: "0.5rem" }}>
        Running the numbers…
      </h3>
      <p className="body-sm consultant-generating__note">
        Effort model, scope multipliers and a cost band you can push back on.
      </p>
      <div className="consultant-generating__bar" aria-hidden>
        <span />
      </div>
    </div>
  );
}

/* --------------------------------- levers --------------------------------- */

/**
 * The levers re-price in the browser using the very same `priceProject`
 * function the server runs, seeded with the server's blended rate — so the
 * number moves instantly without a second, drifting copy of the pricing rules.
 */
function Levers({
  resolved,
  overrides,
  onChange,
  disabled,
}: {
  resolved: Resolved;
  overrides: LeverOverrides;
  onChange: (next: LeverOverrides) => void;
  disabled: boolean;
}) {
  const set = (patch: LeverOverrides) => onChange({ ...overrides, ...patch });

  return (
    <div className="levers">
      <div className="levers__head">
        <h4 className="levers__title">Adjust the assumptions</h4>
        <p className="levers__note">
          Change anything that&apos;s wrong — the estimate updates as you go.
        </p>
      </div>

      <div className="lever">
        <label htmlFor="lever-scale">User scale</label>
        <select
          id="lever-scale"
          value={resolved.scale}
          disabled={disabled}
          onChange={(e) => set({ scale: e.target.value as LeverOverrides["scale"] })}
        >
          {SCALES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="lever">
        <label htmlFor="lever-design">Design starting point</label>
        <select
          id="lever-design"
          value={resolved.designState}
          disabled={disabled}
          onChange={(e) =>
            set({ designState: e.target.value as LeverOverrides["designState"] })
          }
        >
          {DESIGN_STATES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="lever">
        <label htmlFor="lever-timeline">Timeline</label>
        <select
          id="lever-timeline"
          value={resolved.timeline}
          disabled={disabled}
          onChange={(e) => set({ timeline: e.target.value as LeverOverrides["timeline"] })}
        >
          {TIMELINES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="lever">
        <label htmlFor="lever-integrations">
          Systems to integrate <span className="lever__value">{resolved.integrations}</span>
        </label>
        <input
          id="lever-integrations"
          type="range"
          min={0}
          max={10}
          step={1}
          value={Math.min(10, resolved.integrations)}
          disabled={disabled}
          onChange={(e) => set({ integrations: Number(e.target.value) })}
        />
      </div>

      <div className="lever lever--switch">
        <label htmlFor="lever-regulated">
          Regulated data (health, financial, payments)
        </label>
        <input
          id="lever-regulated"
          type="checkbox"
          checked={resolved.regulated}
          disabled={disabled}
          onChange={(e) => set({ regulated: e.target.checked })}
        />
      </div>
    </div>
  );
}

/* ------------------------------ estimate view ----------------------------- */

function EstimateView({
  estimate,
  resolved,
  summary,
  stale,
}: {
  estimate: Estimate;
  resolved: Resolved;
  summary: string;
  stale: boolean;
}) {
  const maxShare = Math.max(...estimate.breakdown.map((line) => line.share));

  return (
    <div className={`est${stale ? " est--stale" : ""}`}>
      <div className="est__headline">
        <p className="overline overline--gold">Indicative investment</p>
        <div className="est__band">{formatBand(estimate.lowUsd, estimate.highUsd)}</div>
        <div className="est__meta">
          <span>
            {estimate.durationWeeks[0]}–{estimate.durationWeeks[1]} weeks
          </span>
          <span>{estimate.team}</span>
          <span>{estimate.effortWeeks} person-weeks</span>
        </div>
        <div
          className="est__confidence"
          title={`Confidence ${Math.round(estimate.confidence * 100)}%`}
        >
          <span className="est__confidence-bar" aria-hidden>
            <span style={{ width: `${estimate.confidence * 100}%` }} />
          </span>
          <span className="est__confidence-label">{estimate.confidenceLabel}</span>
        </div>
      </div>

      <ul className="est__inputs" aria-label="What was priced">
        {[
          resolved.projectType,
          resolved.platform,
          resolved.scope.replace(/ —.*/, ""),
          resolved.scale,
          resolved.timeline,
          `${resolved.integrations} integration${resolved.integrations === 1 ? "" : "s"}`,
          ...(resolved.regulated ? ["Regulated data"] : []),
        ].map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>

      {estimate.narrative ? <p className="est__narrative">{estimate.narrative}</p> : null}

      <section className="est__section">
        <h4 className="est__h">Where the money goes</h4>
        <div className="est__table-wrap">
          <table className="est__table">
            <thead>
              <tr>
                <th scope="col">Workstream</th>
                <th scope="col">Effort</th>
                <th scope="col">Range</th>
              </tr>
            </thead>
            <tbody>
              {estimate.breakdown.map((line) => (
                <tr key={line.name}>
                  <th scope="row">
                    <span className="est__bar" aria-hidden>
                      <span style={{ width: `${(line.share / maxShare) * 100}%` }} />
                    </span>
                    {line.name}
                  </th>
                  <td>{line.weeks} wk</td>
                  <td>{formatBand(line.lowUsd, line.highUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {estimate.drivers.length > 0 ? (
        <section className="est__section">
          <h4 className="est__h">What moved this number</h4>
          <ul className="est__drivers">
            {estimate.drivers.map((driver) => (
              <li key={driver.label}>
                <span>{driver.label}</span>
                <span
                  className={
                    driver.effect.startsWith("-") ? "est__eff est__eff--down" : "est__eff"
                  }
                >
                  {driver.effect}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="est__cols">
        <section className="est__section">
          <h4 className="est__h">Included</h4>
          <ul className="est__list est__list--yes">
            {estimate.inclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="est__section">
          <h4 className="est__h">Not included</h4>
          <ul className="est__list est__list--no">
            {estimate.exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      {estimate.risks?.length ? (
        <section className="est__section">
          <h4 className="est__h">What could push this to the top of the range</h4>
          <ul className="est__list est__list--risk">
            {estimate.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="est__section">
        <h4 className="est__h">Assumptions</h4>
        <ul className="est__list">
          {estimate.assumptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="est__basis">
          Based on: {summary.slice(0, 180)}
          {summary.length > 180 ? "…" : ""}
        </p>
        <p className="est__fine">
          Priced by a deterministic model at {formatUsd(estimate.blendedRateUsd)} per
          person-week — the same inputs always produce the same figure. It is an estimate
          from a short conversation, not a quote; a fixed price follows discovery.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------- main widget ------------------------------ */

export function EstimatorWizard() {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const persistRef = useRef<number | null>(null);
  const booted = useRef(false);

  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const [slots, setSlots] = useState<EstimatorSlots>({});
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [overrides, setOverrides] = useState<LeverOverrides>({});
  const [error, setError] = useState<string | null>(null);

  const scrollChat = useCallback((force = false) => {
    const pane = chatRef.current;
    if (!pane) return;
    const gap = pane.scrollHeight - pane.scrollTop - pane.clientHeight;
    if (!force && gap > 140) return;
    pane.scrollTop = pane.scrollHeight;
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => scrollChat());
    return () => window.cancelAnimationFrame(id);
  }, [messages, typing, suggestions, scrollChat]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let cancelled = false;

    (async () => {
      let restored = false;
      try {
        const res = await fetch(
          `/api/estimator?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;

          if (Array.isArray(data.messages) && data.messages.length > 0) {
            restored = true;
            setMessages(
              data.messages.map((m: { role: string; content: string }) => ({
                id: newId(),
                who: m.role === "user" ? "user" : "bot",
                text: m.content,
              })),
            );
            setSlots(data.slots ?? {});
            setProgress(data.progress ?? 0);
            setComplete(Boolean(data.complete));
            setOverrides(data.overrides ?? {});
            if (data.estimate) {
              setEstimate(data.estimate);
              setResolved(data.resolved);
              setPhase("estimate");
            }
          }
        }
      } catch {
        // Offline or cold start — fall through to a fresh greeting.
      }

      if (cancelled) return;
      if (!restored) setMessages([{ id: newId(), who: "bot", text: GREETING }]);
      setRestoring(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (persistRef.current) window.clearTimeout(persistRef.current);
    },
    [],
  );

  /* ------------------------------- pricing ------------------------------- */

  const runEstimate = useCallback(async () => {
    setError(null);
    setBusy(true);
    setPhase("pricing");
    setSuggestions([]);

    try {
      const res = await fetch("/api/estimator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "estimate", sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.estimate) {
        throw new Error(data.error || "Could not price this project.");
      }

      setEstimate(data.estimate);
      setResolved(data.resolved);
      setSlots(data.slots ?? {});
      setOverrides(data.overrides ?? {});
      setPhase("estimate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not price this project.");
      setPhase("chat");
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  /**
   * Levers re-price locally for instant feedback, then persist in the
   * background so a reload keeps the adjusted figure.
   */
  const onLeverChange = useCallback(
    (next: LeverOverrides) => {
      setOverrides(next);

      const localEstimate = priceProject(slots, next, estimate?.blendedRateUsd);
      setEstimate((prev) => ({
        ...localEstimate,
        // Prose describes the project, not the exact figures — keep it.
        narrative: prev?.narrative,
        risks: prev?.risks,
        source: prev?.source ?? "engine",
      }));
      setResolved((prev) =>
        prev
          ? {
              ...prev,
              scale: next.scale ?? slots.scale ?? prev.scale,
              designState: next.designState ?? slots.designState ?? prev.designState,
              timeline: next.timeline ?? slots.timeline ?? prev.timeline,
              integrations: next.integrations ?? slots.integrations ?? prev.integrations,
              regulated: next.regulated ?? slots.regulated ?? prev.regulated,
            }
          : prev,
      );

      if (persistRef.current) window.clearTimeout(persistRef.current);
      persistRef.current = window.setTimeout(() => {
        void fetch("/api/estimator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "adjust", sessionId, overrides: next }),
        }).catch(() => {
          // Display already updated; persistence is best-effort.
        });
      }, 400);
    },
    [slots, estimate?.blendedRateUsd, sessionId],
  );

  /* --------------------------------- chat -------------------------------- */

  const sendMessage = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (content.length < 2 || busy) return;

      setError(null);
      setBusy(true);
      setText("");
      setSuggestions([]);
      setMessages((prev) => [...prev, { id: newId(), who: "user", text: content }]);
      window.requestAnimationFrame(() => scrollChat(true));
      setTyping(true);

      const controller = new AbortController();
      abortRef.current = controller;
      const botId = newId();
      let opened = false;

      try {
        const res = await fetch("/api/estimator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ action: "chat", sessionId, message: content }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "The estimator is unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done: Record<string, unknown> | null = null;

        const openBubble = () => {
          if (opened) return;
          opened = true;
          setTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: botId, who: "bot", text: "", streaming: true },
          ]);
        };
        const patch = (fn: (t: string) => string) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: fn(m.text) } : m)),
          );

        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");

            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }

            if (event.type === "delta") {
              openBubble();
              patch((t) => t + String(event.text ?? ""));
            } else if (event.type === "reset") {
              patch(() => "");
            } else if (event.type === "error") {
              throw new Error(String(event.error ?? "Stream failed"));
            } else if (event.type === "done") {
              done = event;
            }
          }
        }

        if (!done) throw new Error("The reply was cut short. Try again.");

        openBubble();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, text: String(done!.reply ?? ""), streaming: false }
              : m,
          ),
        );

        setSlots((done.slots ?? {}) as EstimatorSlots);
        setProgress(Number(done.progress ?? 0));
        setComplete(Boolean(done.complete));
        setSuggestions((done.suggestions ?? []) as string[]);

        if (done.wantsEstimate) void runEstimate();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessages((prev) => prev.filter((m) => m.id !== botId));
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setTyping(false);
        setBusy(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [busy, sessionId, scrollChat, runEstimate],
  );

  async function restart() {
    abortRef.current?.abort();
    try {
      await fetch("/api/estimator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", sessionId }),
      });
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Reload still gives a clean slate.
    }
    window.location.href = "/tools/estimator";
  }

  const showStarters = messages.length <= 1 && !typing && !busy && !restoring;
  const canSend = text.trim().length >= 2 && !busy;
  const userTurns = messages.filter((m) => m.who === "user").length;

  const barTitle =
    phase === "pricing"
      ? zac.estimator.consoleTitlePricing
      : phase === "estimate"
        ? zac.estimator.consoleTitleResult
        : zac.estimator.consoleTitleChat;

  return (
    <Console>
      <ConsoleBar title={barTitle} />
      <ConsoleBody>
        {phase === "chat" ? (
          <>
            {progress > 0 ? <IntakeProgress slots={slots} progress={progress} /> : null}

            <div
              className="chat chat--pane"
              ref={chatRef}
              role="log"
              aria-live="polite"
              aria-label={zac.estimator.ariaChat}
            >
              <div className="chat__inner">
                <div className="chat__spacer" aria-hidden />
                {messages.map((message) => (
                  <div key={message.id} className={`msg msg--${message.who}`}>
                    <div className="msg__avatar" aria-hidden>
                      {message.who === "bot" ? zac.avatar : "YOU"}
                    </div>
                    <div className="msg__bubble">
                      {message.text}
                      {message.streaming ? <span className="caret" aria-hidden /> : null}
                    </div>
                  </div>
                ))}
                {typing ? <Typing /> : null}
              </div>
            </div>

            {showStarters ? (
              <div className="replies" style={{ marginTop: "1rem" }}>
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className="reply"
                    onClick={() => void sendMessage(starter)}
                    disabled={busy}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            ) : null}

            {suggestions.length > 0 && !busy ? (
              <div className="replies" style={{ marginTop: "1rem" }}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="reply"
                    onClick={() => void sendMessage(suggestion)}
                    disabled={busy}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            {complete ? (
              <div className="consultant-cta">
                <p className="consultant-cta__note">
                  I have enough to price this. You can fine-tune the assumptions on
                  the next screen.
                </p>
                <button
                  type="button"
                  className="btn btn--gold"
                  onClick={() => void runEstimate()}
                  disabled={busy}
                >
                  Show me the numbers
                </button>
              </div>
            ) : userTurns >= 4 ? (
              <div className="consultant-cta consultant-cta--soft">
                <p className="consultant-cta__note">
                  We can keep going, or I can price it now using sensible defaults
                  you can adjust afterwards.
                </p>
                <button
                  type="button"
                  className="btn btn--outline-dark"
                  onClick={() => void runEstimate()}
                  disabled={busy}
                >
                  Price it with what you have
                </button>
              </div>
            ) : null}

            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(text);
              }}
            >
              <label className="sr-only" htmlFor="estimator-input">
                Message the estimator
              </label>
              <textarea
                id="estimator-input"
                ref={inputRef}
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(text);
                  }
                }}
                placeholder={
                  messages.length <= 1
                    ? "What do you want built?"
                    : "Type your reply…"
                }
                disabled={busy || restoring}
                maxLength={4000}
              />
              <button type="submit" className="btn btn--gold" disabled={!canSend}>
                {busy ? "…" : "Send"}
              </button>
            </form>
          </>
        ) : null}

        {phase === "pricing" ? <PricingPanel /> : null}

        {phase === "estimate" && estimate && resolved ? (
          <>
            <EstimateView
              estimate={estimate}
              resolved={resolved}
              summary={slots.summary ?? ""}
              stale={busy}
            />

            <Levers
              resolved={resolved}
              overrides={overrides}
              onChange={onLeverChange}
              disabled={busy}
            />

            <div className="btn-row est__actions">
              <Link href="/consultant" className="btn btn--gold">
                Get a full solution roadmap
              </Link>
              <Link href="/book" className="btn btn--outline-dark">
                Talk it through with an engineer
              </Link>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPhase("chat");
                  window.setTimeout(() => inputRef.current?.focus(), 60);
                }}
              >
                Add more detail
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => void restart()}>
                Start over
              </button>
            </div>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="consultant-error">
            {error}
          </p>
        ) : null}
      </ConsoleBody>
    </Console>
  );
}

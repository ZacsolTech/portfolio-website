"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_LABELS, type RunCostCategory } from "@/lib/estimator/catalog";
import { priceProject } from "@/lib/estimator/pricing";
import {
  DESIGN_STATES,
  SCALES,
  TIMELINES,
  formatBand,
  formatMonthly,
  formatUsd,
  type Estimate,
  type EstimatorSlots,
  type LeverOverrides,
  type RunCostSummary,
} from "@/lib/estimator/schema";
import { EstimateCapture } from "@/components/shared/estimate-capture";
import { ChatComposer, ChatTyping, ChatWelcome } from "@/components/zac/chat-page";
import { ZacFrame, type ZacSurface } from "@/components/zac/zac-frame";
import { zac } from "@/lib/content/zac";
import { loadSeed, readPageSeedId, type ZacSeed } from "@/lib/zac/seeds";

const SESSION_KEY = "zacsol_estimator_session";

const GREETING = zac.estimator.greeting;

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

function PricingPanel() {
  return (
    <div className="consultant-generating" role="status" aria-live="polite">
      <div className="consultant-generating__orb" aria-hidden />
      <p className="overline overline--gold">Pricing</p>
      <h3 className="d4 consultant-generating__title">
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

/**
 * The monthly bill, grouped by what each service is for.
 *
 * Split into fixed and usage columns deliberately. A subscription is a number
 * we can stand behind; a usage projection is a guess about someone else's
 * business, and showing them in one blended figure hides which half of the
 * bill is actually uncertain — which is exactly the half a client needs to
 * plan around.
 */
function RunCostTable({ run }: { run: RunCostSummary }) {
  const groups = new Map<RunCostCategory, typeof run.lines>();
  for (const line of run.lines) {
    const list = groups.get(line.category) ?? [];
    list.push(line);
    groups.set(line.category, list);
  }

  const metered = run.lines.reduce((sum, l) => sum + l.meteredUsd, 0);

  return (
    <section className="est__section">
      <h4 className="est__h">What it costs to run</h4>
      <p className="est__sub">
        Third-party services this project needs once it is live. These are billed to you
        directly by each vendor, not by us.
      </p>

      <div className="est__table-wrap">
        <table className="est__table est__table--run">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Fixed</th>
              <th scope="col">Usage</th>
              <th scope="col">Monthly</th>
            </tr>
          </thead>
          {[...groups].map(([category, lines]) => (
            <tbody key={category}>
              <tr className="est__group">
                <th scope="rowgroup" colSpan={4}>
                  {CATEGORY_LABELS[category]}
                </th>
              </tr>
              {lines.map((line) => (
                <tr key={line.key}>
                  <th scope="row">
                    <span className="est__vendor">
                      {line.vendor} <span>{line.plan}</span>
                    </span>
                    {line.why ? <span className="est__note">{line.why}</span> : null}
                    {line.meterDetail.map((detail) => (
                      <span key={detail} className="est__meter">
                        {detail}
                      </span>
                    ))}
                    {line.cheaperAlternative ? (
                      <span className="est__note est__note--alt">{line.cheaperAlternative}</span>
                    ) : null}
                  </th>
                  <td>{line.fixedUsd > 0 ? formatMonthly(line.fixedUsd) : "—"}</td>
                  <td>{line.meteredUsd > 0 ? formatMonthly(line.meteredUsd) : "—"}</td>
                  <td className="est__strong">{formatMonthly(line.monthlyUsd)}</td>
                </tr>
              ))}
            </tbody>
          ))}
          <tfoot>
            <tr>
              <th scope="row">Total per month</th>
              <td>{formatMonthly(run.lines.reduce((s, l) => s + l.fixedUsd, 0))}</td>
              <td>{formatMonthly(metered)}</td>
              <td className="est__strong">{formatMonthly(run.monthlyMidUsd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="est__fine">
        Vendor list prices checked {run.pricesAsOf}. Fixed fees are firm; usage figures are
        projections at the scale above and are the part of this bill that moves — which is
        why the monthly range runs to {formatMonthly(run.monthlyHighUsd)}.
      </p>
    </section>
  );
}

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
  const run = estimate.runCosts;

  return (
    <div className={`est${stale ? " est--stale" : ""}`}>
      <div className="est__headline">
        {/*
          Two figures, side by side, because a build price on its own has
          misled every client who ever signed one. The month is what they
          live with after we hand over.
        */}
        <div className={`est__figures${run ? " est__figures--pair" : ""}`}>
          <div className="est__figure">
            <p className="overline overline--gold">To build</p>
            <div className="est__band">{formatBand(estimate.lowUsd, estimate.highUsd)}</div>
            <p className="est__figure-sub">one-off, {estimate.durationWeeks[0]}–
              {estimate.durationWeeks[1]} weeks
            </p>
          </div>
          {run ? (
            <div className="est__figure est__figure--run">
              <p className="overline">To run</p>
              <div className="est__band est__band--run">
                {formatMonthly(run.monthlyMidUsd)}
                <span className="est__per">/mo</span>
              </div>
              <p className="est__figure-sub">
                {formatMonthly(run.monthlyLowUsd)}–{formatMonthly(run.monthlyHighUsd)} depending
                on usage
              </p>
            </div>
          ) : null}
        </div>

        {run ? (
          <p className="est__first-year">
            First year all-in, build plus twelve months of running cost:{" "}
            <strong>{formatBand(run.firstYearLowUsd, run.firstYearHighUsd)}</strong>
          </p>
        ) : null}

        <div className="est__meta">
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

      {estimate.approach ? (
        <div className="est__approach">
          <p className="overline">How we&apos;d build it</p>
          <p>{estimate.approach}</p>
        </div>
      ) : null}

      {estimate.narrative ? <p className="est__narrative">{estimate.narrative}</p> : null}

      <section className="est__section">
        <h4 className="est__h">The work</h4>
        <div className="est__table-wrap">
          <table className="est__table">
            <thead>
              <tr>
                <th scope="col">Task</th>
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
                    {line.discipline && line.discipline !== line.name ? (
                      <span className="est__tag">{line.discipline}</span>
                    ) : null}
                    {line.note ? <span className="est__note">{line.note}</span> : null}
                  </th>
                  <td>{line.weeks} wk</td>
                  <td>{formatBand(line.lowUsd, line.highUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {run ? <RunCostTable run={run} /> : null}

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
          Scoped from your conversation, then priced by a deterministic engine at{" "}
          {formatUsd(estimate.blendedRateUsd)} per person-week — the same plan always
          produces the same figure, and every third-party price comes from a maintained
          list rather than being improvised. It is an estimate from a short conversation,
          not a quote; a fixed price follows discovery.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------- main widget ------------------------------ */

export type EstimatorWizardProps = {
  /** `page` draws its own console chrome; `dock` sits inside the panel. */
  surface?: ZacSurface;
  /** False while the dock is showing the other mode — hidden, but still mounted. */
  active?: boolean;
  seed?: ZacSeed | null;
  seedToken?: number;
  onSeedConsumed?: () => void;
  onReply?: () => void;
  /** Estimator → consultant, carrying the priced inputs across. */
  onRequestRoadmap?: () => void;
};

export function EstimatorWizard({
  surface = "page",
  active = true,
  seed: seedProp = null,
  seedToken: seedTokenProp = 0,
  onSeedConsumed,
  onReply,
  onRequestRoadmap,
}: EstimatorWizardProps = {}) {
  /* See consultant-intake: read `?seed=` here so the route stays static. */
  const [urlSeed, setUrlSeed] = useState<ZacSeed | null>(null);

  useEffect(() => {
    if (surface !== "page") return;
    const id = readPageSeedId();
    if (!id) return;

    let cancelled = false;
    void loadSeed(id).then((resolved) => {
      if (cancelled || !resolved || resolved.mode !== "estimator") return;
      setUrlSeed(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [surface]);

  const seed = seedProp ?? urlSeed;
  const seedToken = seedProp ? seedTokenProp : urlSeed ? 1 : 0;

  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const persistRef = useRef<number | null>(null);
  /* See the note in consultant-intake: effects that must not re-run per token. */
  const userTurnsRef = useRef(0);
  const seedApplied = useRef(-1);

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

  /* A hidden pane has no layout — re-pin to the latest message when shown. */
  useEffect(() => {
    if (!active) return;
    const id = window.requestAnimationFrame(() => scrollChat(true));
    return () => window.cancelAnimationFrame(id);
  }, [active, scrollChat]);

  /*
    Session restore is keyed on `sessionId` alone. Do not gate this with a
    "already booted" ref — React Strict Mode runs setup → cleanup → setup, and
    a latch that survives the cleanup leaves `restoring` stuck at true, which
    permanently disables the composer (`disabled={busy || restoring}`).
  */
  useEffect(() => {
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
            userTurnsRef.current = data.messages.filter(
              (m: { role: string }) => m.role === "user",
            ).length;
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

      // Re-priced against the plan the server scoped, so a lever changes what
      // the project costs without changing what the project is.
      const localEstimate = priceProject({
        slots,
        overrides: next,
        plan: estimate?.plan,
        rate: estimate?.blendedRateUsd,
      });
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
    [slots, estimate?.blendedRateUsd, estimate?.plan, sessionId],
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
      userTurnsRef.current += 1;
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
        onReply?.();

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
    [busy, sessionId, scrollChat, runEstimate, onReply],
  );

  /* Curated seeds send themselves; visitor text only prefills. A seed arriving
     mid-conversation is ignored — see lib/zac/seeds. */
  useEffect(() => {
    if (!seed || restoring) return;
    if (seedApplied.current === seedToken) return;
    seedApplied.current = seedToken;

    if (userTurnsRef.current > 0 || phase !== "chat") {
      onSeedConsumed?.();
      return;
    }

    /*
      Deferred out of the effect body: sending is an action against the API,
      not state synchronisation, and starting a stream mid-effect would cascade
      renders through the transcript.
    */
    const frame = window.requestAnimationFrame(() => {
      if (seed.autoSend) {
        void sendMessage(seed.text);
      } else {
        setText(seed.text);
        inputRef.current?.focus();
      }
      onSeedConsumed?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [seed, seedToken, restoring, phase, sendMessage, onSeedConsumed]);

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
      // A reload still gives a clean slate.
    }

    if (surface === "page") {
      window.location.href = "/tools/estimator";
      return;
    }

    /* In the dock, rebuild in place rather than reloading the page behind it. */
    seedApplied.current = -1;
    userTurnsRef.current = 0;
    setPhase("chat");
    setMessages([]);
    setTyping(false);
    setText("");
    setBusy(false);
    setRestoring(true);
    setSlots({});
    setProgress(0);
    setComplete(false);
    setSuggestions([]);
    setEstimate(null);
    setResolved(null);
    setOverrides({});
    setError(null);
    setSessionId(getOrCreateSessionId());
  }

  const canSend = text.trim().length >= 2 && !busy;
  const userTurns = messages.filter((m) => m.who === "user").length;
  const isFresh = userTurns === 0;
  const isPage = surface === "page";

  const barTitle =
    phase === "pricing"
      ? "Running the numbers"
      : phase === "estimate"
        ? "Your cost estimate"
        : zac.estimator.name;

  const barSubtitle =
    phase === "chat"
      ? "Cost estimator · free · no email"
      : phase === "pricing"
        ? "Usually a few seconds"
        : "Adjust the levers to see what moves the number";

  const ctaBlock =
    complete ? (
      <div className={`consultant-cta${isPage ? " consultant-cta--page" : ""}`}>
        <p className="consultant-cta__note">
          I have enough to price this. You can fine-tune the assumptions on the
          next screen.
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
      <div
        className={`consultant-cta consultant-cta--soft${isPage ? " consultant-cta--page" : ""}`}
      >
        <p className="consultant-cta__note">
          We can keep going, or I can price it now using sensible defaults you can
          adjust afterwards.
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
    ) : null;

  const suggestionBlock =
    suggestions.length > 0 && !busy && userTurns >= 1 ? (
      <div className={`replies${isPage ? " replies--page" : ""}`}>
        {suggestions.slice(0, 2).map((suggestion) => (
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
    ) : null;

  const chatUI =
    phase === "chat" ? (
      <>
        <div
          className={`chat-app__thread${isPage ? "" : " chat-app__thread--dock"}`}
          ref={chatRef}
        >
          {!isPage ? (
            <div
              className="dock-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={`Intake ${progress}% complete`}
            >
              <span className="dock-progress__label">{progress}%</span>
              <span className="dock-progress__track" aria-hidden>
                <span style={{ width: `${progress}%` }} />
              </span>
            </div>
          ) : null}

          {isFresh ? (
            <ChatWelcome
              title="What will it cost?"
              body={GREETING}
              starters={zac.estimator.starters.slice(0, 2)}
              onPick={(starter) => void sendMessage(starter)}
              compact={!isPage}
            />
          ) : (
            <div
              className="chat-stream"
              role="log"
              aria-live="polite"
              aria-label={zac.estimator.ariaChat}
            >
              {messages
                .filter(
                  (message, index) =>
                    !(index === 0 && message.who === "bot" && message.text === GREETING),
                )
                .map((message) => (
                  <div key={message.id} className={`chat-msg chat-msg--${message.who}`}>
                    {message.who === "bot" ? (
                      <div className="chat-msg__avatar" aria-hidden>
                        {zac.avatar}
                      </div>
                    ) : null}
                    <div className="chat-msg__body">
                      {message.text}
                      {message.streaming ? <span className="caret" aria-hidden /> : null}
                    </div>
                  </div>
                ))}
              {typing ? <ChatTyping label={zac.estimator.ariaTyping} /> : null}
              {ctaBlock}
            </div>
          )}
        </div>

        <div className={`chat-app__dock${isPage ? "" : " chat-app__dock--panel"}`}>
          {suggestionBlock}
          <ChatComposer
            id={isPage ? "estimator-input" : "estimator-input-dock"}
            label="Message the estimator"
            value={text}
            onChange={setText}
            onSubmit={() => void sendMessage(text)}
            disabled={busy || restoring}
            canSend={canSend}
            placeholder={isFresh ? "What do you want built?" : "Reply to ZAC…"}
            inputRef={inputRef}
            hint={isPage ? undefined : ""}
          />
        </div>
      </>
    ) : null;

  const body = (
    <>
        {chatUI}

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

            <EstimateCapture sessionId={sessionId} />

            <div className="btn-row est__actions">
              {/*
                A handoff, not a link: the consultant picks up the answers this
                estimate was built from, so nobody describes the same project
                twice. Falls back to a plain navigation on the full page.
              */}
              {onRequestRoadmap ? (
                <button
                  type="button"
                  className="btn btn--gold"
                  onClick={onRequestRoadmap}
                >
                  Turn this into a full roadmap
                </button>
              ) : (
                <Link href="/consultant?from=estimator" className="btn btn--gold">
                  Turn this into a full roadmap
                </Link>
              )}
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
    </>
  );

  return (
    <ZacFrame
      surface={surface}
      title={barTitle}
      subtitle={isPage ? barSubtitle : undefined}
      phase={phase}
      progress={isPage && phase === "chat" ? progress : undefined}
      barTrailing={
        isPage ? (
          <Link href="/consultant" className="chat-app__link">
            <span className="chat-app__link-long">Switch to Consultant</span>
            <span className="chat-app__link-short">Consultant</span>
          </Link>
        ) : undefined
      }
    >
      {body}
    </ZacFrame>
  );
}

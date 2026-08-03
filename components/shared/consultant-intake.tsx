"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SLOT_KEYS,
  SLOT_LABELS,
  formatMoneyBand,
  type Blueprint,
  type ChatMessage,
  type SlotKey,
  type Slots,
} from "@/lib/ai/schema";
import { Console, ConsoleBar, ConsoleBody } from "@/components/ui";

const SESSION_KEY = "zacsol_consultant_session";

const GREETING =
  "I'm ZACSOL's solution consultant. Tell me what's slowing your business down, or the product you're trying to build — plain language is fine. I'll ask a few questions, then put together a solution blueprint with scope, timeline and cost.";

const STARTERS = [
  "Orders get lost on WhatsApp",
  "We're drowning in manual data entry",
  "I have an app idea for field techs",
  "We have data but no real insight",
] as const;

type Phase = "chat" | "generating" | "blueprint" | "captured";

type UiMsg = {
  id: string;
  who: "bot" | "user";
  text: string;
  /** Bot bubble currently receiving stream deltas. */
  streaming?: boolean;
};

type DoneEvent = {
  type: "done";
  reply: string;
  suggestions: string[];
  usedFallback: boolean;
  wantsBlueprint: boolean;
  stage: string;
  slots: Slots;
  progress: number;
  complete: boolean;
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
    // Private mode / storage disabled — a per-load session still works.
    return newId();
  }
}

/* ------------------------------- primitives ------------------------------- */

function Typing() {
  return (
    <div className="msg msg--bot">
      <div className="msg__avatar" aria-hidden>
        AI
      </div>
      <div className="msg__bubble">
        <span className="typing">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">The consultant is typing</span>
      </div>
    </div>
  );
}

function IntakeProgress({ slots, progress }: { slots: Slots; progress: number }) {
  return (
    <div className="intake" aria-label={`Intake ${progress}% complete`}>
      <div className="intake__bar">
        <span style={{ width: `${progress}%` }} />
      </div>
      <ul className="intake__slots">
        {SLOT_KEYS.map((key: SlotKey) => {
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

function GeneratingPanel() {
  return (
    <div className="consultant-generating" role="status" aria-live="polite">
      <div className="consultant-generating__orb" aria-hidden />
      <p className="overline overline--gold">Generating</p>
      <h3 className="d4" style={{ color: "#fff", marginTop: "0.5rem" }}>
        Building your solution roadmap…
      </h3>
      <p className="body-sm consultant-generating__note">
        Scoping phases, stack and an honest cost band from what you told me.
      </p>
      <div className="consultant-generating__bar" aria-hidden>
        <span />
      </div>
    </div>
  );
}

/* -------------------------------- blueprint ------------------------------- */

function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bp-row${className ? ` ${className}` : ""}`}>
      <div className="bp-row__k">{label}</div>
      {children}
    </div>
  );
}

function Pills({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <div className={`feat${muted ? " feat--muted" : ""}`}>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="bp-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Always-visible half: enough to prove the blueprint is real and specific. */
function BlueprintTeaser({ blueprint }: { blueprint: Blueprint }) {
  return (
    <div className="blueprint">
      <Row label="Recommended solution">
        <div className="bp-row__v">{blueprint.title}</div>
      </Row>
      <Row label="Why this">
        <p className="bp-why">{blueprint.why}</p>
      </Row>
      <div className="bp-row bp-meta">
        <div>
          <div className="bp-row__k">Project type</div>
          <div className="bp-row__v bp-row__v--sm">{blueprint.serviceTitle}</div>
        </div>
        <div>
          <div className="bp-row__k">Duration</div>
          <div className="bp-row__v bp-row__v--sm">
            {blueprint.durationWeeks[0]}–{blueprint.durationWeeks[1]} weeks
          </div>
        </div>
        <div>
          <div className="bp-row__k">Team</div>
          <div className="bp-row__v bp-row__v--sm">{blueprint.team}</div>
        </div>
      </div>
    </div>
  );
}

/** Gated half: the numbers and detail worth an email address. */
function BlueprintDetail({ blueprint }: { blueprint: Blueprint }) {
  // Cumulative week offsets, derived rather than accumulated — the React
  // compiler rejects mutation that outlives the render.
  const timeline = blueprint.phases.map((phase, i) => {
    const from = blueprint.phases.slice(0, i).reduce((sum, p) => sum + p.weeks, 1);
    return { ...phase, from, to: from + phase.weeks - 1, index: i };
  });

  return (
    <div className="blueprint">
      <Row label="Investment band">
        <div className="bp-row__v">
          {formatMoneyBand(blueprint.costBandUsd[0], blueprint.costBandUsd[1])}
        </div>
      </Row>
      <Row label={`What you get (${blueprint.features.length})`}>
        <Pills items={blueprint.features} />
      </Row>
      <Row label="Stack">
        <Pills items={blueprint.stack} muted />
      </Row>
      <Row label="Phased timeline">
        <div className="tl">
          {timeline.map((phase) => (
            <div className="tl__item" key={`${phase.name}-${phase.index}`}>
              <div className="tl__dot">{String(phase.index + 1).padStart(2, "0")}</div>
              <div className="tl__name">{phase.name}</div>
              <div className="tl__wk">
                wk {phase.from}–{phase.to}
              </div>
            </div>
          ))}
        </div>
      </Row>
      {blueprint.assumptions?.length ? (
        <Row label="Assumptions you can challenge">
          <Bullets items={blueprint.assumptions} />
        </Row>
      ) : null}
      {blueprint.risks?.length ? (
        <Row label="What could derail this">
          <Bullets items={blueprint.risks} />
        </Row>
      ) : null}
    </div>
  );
}

/* ------------------------------- main widget ------------------------------ */

export function ConsultantIntake() {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const booted = useRef(false);

  const [phase, setPhase] = useState<Phase>("chat");
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const [slots, setSlots] = useState<Slots>({});
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailed, setEmailed] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------ scrolling ------------------------------ */

  const scrollChat = useCallback((force = false) => {
    const pane = chatRef.current;
    if (!pane) return;
    const gap = pane.scrollHeight - pane.scrollTop - pane.clientHeight;
    // Don't yank the view away from someone reading back through history.
    if (!force && gap > 140) return;
    pane.scrollTop = pane.scrollHeight;
  }, []);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => scrollChat());
    return () => window.cancelAnimationFrame(id);
  }, [messages, typing, suggestions, scrollChat]);

  /* --------------------------- session restore --------------------------- */

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    let cancelled = false;

    (async () => {
      let restored = false;
      try {
        const res = await fetch(
          `/api/consultant?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            messages: ChatMessage[];
            blueprint: Blueprint | null;
            captured: boolean;
            slots: Slots;
            progress: number;
            complete: boolean;
          };
          if (cancelled) return;

          if (data.messages.length > 0) {
            restored = true;
            setMessages(
              data.messages.map((m) => ({
                id: newId(),
                who: m.role === "user" ? "user" : "bot",
                text: m.content,
              })),
            );
            setSlots(data.slots);
            setProgress(data.progress);
            setComplete(data.complete);

            if (data.blueprint) {
              setBlueprint(data.blueprint);
              setUsedFallback(data.blueprint.source === "rules");
              if (data.captured) {
                setPhase("captured");
                setUnlocked(true);
                setEmailed(true);
                setDoneMessage("Your roadmap is on its way.");
              } else {
                setPhase("blueprint");
                setGateOpen(true);
              }
            }
          }
        }
      } catch {
        // Offline or cold start — fall through to a fresh greeting.
      }

      if (cancelled) return;
      if (!restored) {
        setMessages([{ id: newId(), who: "bot", text: GREETING }]);
      }
      setRestoring(false);

      // Deep links like /consultant#our-orders-get-lost prefill the composer.
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash.length >= 8 && !restored) {
        setText(hash.replace(/[-+]/g, " "));
        window.setTimeout(() => inputRef.current?.focus(), 120);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* ----------------------------- blueprint ----------------------------- */

  const generateBlueprint = useCallback(async () => {
    setError(null);
    setBusy(true);
    setPhase("generating");
    setSuggestions([]);

    try {
      const res = await fetch("/api/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "blueprint", sessionId }),
      });
      const data = (await res.json()) as {
        blueprint?: Blueprint;
        usedFallback?: boolean;
        error?: string;
      };

      if (!res.ok || !data.blueprint) {
        throw new Error(data.error || "Could not build the blueprint.");
      }

      setBlueprint(data.blueprint);
      setUsedFallback(Boolean(data.usedFallback));
      setPhase("blueprint");
      // Let the document land before the gate slides over it.
      window.setTimeout(() => setGateOpen(true), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the blueprint.");
      setPhase("chat");
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  /* -------------------------------- chat -------------------------------- */

  const sendMessage = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (content.length < 2 || busy || phase !== "chat") return;

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
        const res = await fetch("/api/consultant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ action: "chat", sessionId, message: content }),
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "The consultant is unavailable right now.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done: DoneEvent | null = null;

        const openBubble = () => {
          if (opened) return;
          opened = true;
          setTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: botId, who: "bot", text: "", streaming: true },
          ]);
        };

        const patchBubble = (fn: (text: string) => string) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botId ? { ...m, text: fn(m.text) } : m)),
          );
        };

        // SSE frames are delimited by a blank line; chunks split anywhere.
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
              const chunk = String(event.text ?? "");
              patchBubble((t) => t + chunk);
            } else if (event.type === "reset") {
              patchBubble(() => "");
            } else if (event.type === "error") {
              throw new Error(String(event.error ?? "Stream failed"));
            } else if (event.type === "done") {
              done = event as unknown as DoneEvent;
            }
          }
        }

        if (!done) throw new Error("The consultant's reply was cut short. Try again.");

        openBubble();
        // Authoritative text — replaces whatever the stream assembled.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId ? { ...m, text: done!.reply, streaming: false } : m,
          ),
        );

        setSlots(done.slots);
        setProgress(done.progress);
        setComplete(done.complete);
        setSuggestions(done.suggestions ?? []);

        if (done.wantsBlueprint) {
          void generateBlueprint();
        }
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
    [busy, phase, sessionId, scrollChat, generateBlueprint],
  );

  /* -------------------------------- gate -------------------------------- */

  async function onGateSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gate",
          sessionId,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = (await res.json()) as {
        queued?: boolean;
        alreadySent?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not send your roadmap.");

      setEmailed(Boolean(data.queued || data.alreadySent));
      setDoneMessage(data.message ?? "");
      setUnlocked(true);
      setPhase("captured");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your roadmap.");
    } finally {
      setBusy(false);
    }
  }

  async function restart() {
    abortRef.current?.abort();
    try {
      await fetch("/api/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", sessionId }),
      });
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Reload still gives them a clean slate.
    }
    window.location.href = "/consultant";
  }

  /* ------------------------------ rendering ------------------------------ */

  const barTitle =
    phase === "generating"
      ? "AI Solution Consultant · generating"
      : phase === "blueprint" || phase === "captured"
        ? "AI Solution Consultant · blueprint"
        : "AI Solution Consultant · chat";

  const showStarters = messages.length <= 1 && !typing && !busy && !restoring;
  const canSend = text.trim().length >= 2 && !busy;
  const userTurns = messages.filter((m) => m.who === "user").length;

  return (
    <div className="consultant-layout">
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
                aria-atomic="false"
                aria-label="Conversation with the AI consultant"
              >
                <div className="chat__inner">
                  <div className="chat__spacer" aria-hidden />
                  {messages.map((message) => (
                    <div key={message.id} className={`msg msg--${message.who}`}>
                      <div className="msg__avatar" aria-hidden>
                        {message.who === "bot" ? "AI" : "YOU"}
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
                  <div className="consultant-cta__head">
                    <p className="consultant-cta__note">
                      Here&apos;s what I&apos;ve got. Anything wrong, just tell me
                      below — it changes the estimate.
                    </p>
                    <dl className="consultant-cta__recap">
                      {SLOT_KEYS.filter((key) => key !== "problem").map((key) => (
                        <div key={key}>
                          <dt>{SLOT_LABELS[key]}</dt>
                          <dd>{slots[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <button
                    type="button"
                    className="btn btn--gold"
                    onClick={() => void generateBlueprint()}
                    disabled={busy}
                  >
                    Build my solution blueprint
                  </button>
                </div>
              ) : userTurns >= 6 ? (
                // Escape hatch: some visitors never answer a given question, and
                // an endless loop is worse than a blueprint with an assumption.
                <div className="consultant-cta consultant-cta--soft">
                  <p className="consultant-cta__note">
                    We can keep going, or I can build the blueprint now and flag
                    what I had to assume.
                  </p>
                  <button
                    type="button"
                    className="btn btn--outline-dark"
                    onClick={() => void generateBlueprint()}
                    disabled={busy}
                  >
                    Build it with what you have
                  </button>
                </div>
              ) : null}

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(text);
                }}
              >
                <label className="sr-only" htmlFor="consultant-input">
                  Message the consultant
                </label>
                <textarea
                  id="consultant-input"
                  ref={inputRef}
                  rows={2}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(text);
                    }
                  }}
                  placeholder={
                    messages.length <= 1
                      ? "Describe the problem in your own words…"
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

          {phase === "generating" ? <GeneratingPanel /> : null}

          {(phase === "blueprint" || phase === "captured") && blueprint ? (
            <div className="gate">
              <p className={`bp-source${usedFallback ? " bp-source--fallback" : ""}`}>
                {usedFallback
                  ? "Scoped from our delivered-project patterns (AI model unavailable)"
                  : "Scoped by AI from your conversation"}
              </p>

              <BlueprintTeaser blueprint={blueprint} />

              <div className={`gate__locked${unlocked ? " is-unlocked" : ""}`}>
                {/* inert keeps the blurred detail out of tab order and a11y tree */}
                <div className={unlocked ? undefined : "gate__veiled"} inert={!unlocked}>
                  <BlueprintDetail blueprint={blueprint} />
                </div>

                {!unlocked && gateOpen ? (
                  <div className="gate__panel">
                    <span className="overline overline--gold">
                      Unlock the full roadmap
                    </span>
                    <h3 className="d4 gate__title">
                      Costs, phases and the full feature list
                    </h3>
                    <p className="body-sm gate__copy">
                      Enter your details to reveal the rest here and get the complete
                      document by email. No call required.
                    </p>
                    <form onSubmit={onGateSubmit} className="gate__form">
                      <label className="sr-only" htmlFor="gate-name">
                        Full name
                      </label>
                      <input
                        id="gate-name"
                        className="gate__field"
                        name="name"
                        autoComplete="name"
                        placeholder="Full name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                      <label className="sr-only" htmlFor="gate-email">
                        Work email
                      </label>
                      <input
                        id="gate-email"
                        className="gate__field"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Work email"
                        required
                        maxLength={160}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      <button
                        type="submit"
                        className="btn btn--gold gate__submit"
                        disabled={busy}
                      >
                        {busy ? "Sending…" : "Reveal my roadmap"}
                      </button>
                      <p className="gate__fine">
                        One email with your blueprint. No newsletter, no reselling.
                      </p>
                    </form>
                  </div>
                ) : null}

                {!unlocked && !gateOpen ? (
                  <div className="gate__panel gate__panel--waiting" role="status">
                    <span className="typing">
                      <span />
                      <span />
                      <span />
                    </span>
                    <p className="body-sm gate__copy">Preparing your document…</p>
                  </div>
                ) : null}
              </div>

              {phase === "captured" ? (
                <div className="gate__success" role="status">
                  <div className="gate__check" aria-hidden>
                    ✓
                  </div>
                  <div>
                    <h3 className="d4 gate__title">
                      {emailed ? "Roadmap sent" : "Roadmap saved"}
                    </h3>
                    <p className="body-sm gate__copy">
                      {doneMessage ||
                        "A senior engineer will follow up within one business day."}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="btn-row gate__actions">
                <Link href="/book" className="btn btn--gold">
                  Book a consultation
                </Link>
                <Link href="/portfolio" className="btn btn--outline-dark">
                  See similar projects
                </Link>
                <button type="button" className="btn btn--ghost" onClick={() => void restart()}>
                  Start over
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="consultant-error">
              {error}
            </p>
          ) : null}
        </ConsoleBody>
      </Console>

      <aside className="consultant-aside">
        <div className="aside-card">
          <h3>How it works</h3>
          <ul>
            <li>Describe the real bottleneck</li>
            <li>The consultant asks follow-ups, one at a time</li>
            <li>You get a scoped roadmap on screen</li>
            <li>Unlock costs and phases with your email</li>
          </ul>
        </div>
        <div className="aside-card">
          <h3>Answer honestly</h3>
          <p>
            The blueprint tracks the quality of the conversation. Vague in, generic out.
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
          </ul>
        </div>
      </aside>
    </div>
  );
}

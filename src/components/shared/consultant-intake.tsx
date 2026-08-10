"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SLOT_KEYS,
  SLOT_LABELS,
  formatMoneyBand,
  type Blueprint,
  type ChatMessage,
  type SlotKey,
  type Slots,
} from "@/lib/ai/schema";
import { Turnstile, useTurnstile } from "@/components/shared/turnstile";
import { ZacFrame, type ZacSurface } from "@/components/zac/zac-frame";
import { zac } from "@/lib/content/zac";
import { loadSeed, readPageHandoff, readPageSeedId, type ZacSeed } from "@/lib/zac/seeds";
import { readAttribution } from "@/lib/leads/attribution";

const SESSION_KEY = "zacsol_consultant_session";
/** The estimator writes its own id here; a handoff reads it back. */
const ESTIMATOR_SESSION_KEY = "zacsol_estimator_session";

const GREETING = zac.consultant.greeting;

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
        {zac.avatar}
      </div>
      <div className="msg__bubble">
        <span className="typing">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">{zac.consultant.ariaTyping}</span>
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
          const value = slots[key]?.trim();
          const filled = Boolean(value);
          return (
            <li key={key} className={filled ? "is-filled" : undefined}>
              <span className="intake__tick" aria-hidden>
                {filled ? "✓" : "○"}
              </span>
              <span className="intake__label">{SLOT_LABELS[key]}</span>
              {filled ? (
                <span className="intake__value" title={value}>
                  {value!.length > 36 ? `${value!.slice(0, 35).trimEnd()}…` : value}
                </span>
              ) : null}
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
      <h3 className="d4 consultant-generating__title">
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

export type ConsultantIntakeProps = {
  /** `page` draws its own console chrome and rail; `dock` sits inside the panel. */
  surface?: ZacSurface;
  /** False while the dock is showing the other mode — hidden, but still mounted. */
  active?: boolean;
  /** Curated opening message from a contextual entry point. */
  seed?: ZacSeed | null;
  /** Changes whenever a new seed is delivered, even if the text repeats. */
  seedToken?: number;
  onSeedConsumed?: () => void;
  /** Set when arriving from the estimator, so we carry its answers over. */
  handoff?: { token: number } | null;
  onHandoffConsumed?: () => void;
  /** Fired when a reply lands, so a closed dock can flag it. */
  onReply?: () => void;
};

export function ConsultantIntake({
  surface = "page",
  active = true,
  seed: seedProp = null,
  seedToken: seedTokenProp = 0,
  onSeedConsumed,
  handoff: handoffProp = null,
  onHandoffConsumed,
  onReply,
}: ConsultantIntakeProps = {}) {
  /*
    On the full page there is no provider feeding props, so the widget reads
    the same `?seed=` / `?from=` contract itself. Doing it here rather than in
    the route's `searchParams` keeps `/consultant` statically rendered.
  */
  const [urlSeed, setUrlSeed] = useState<ZacSeed | null>(null);
  const [urlHandoff, setUrlHandoff] = useState<{ token: number } | null>(null);

  useEffect(() => {
    if (surface !== "page") return;
    let cancelled = false;

    // A frame late so the URL read lands after hydration rather than during it.
    const frame = window.requestAnimationFrame(() => {
      if (readPageHandoff() === "estimator") setUrlHandoff({ token: 1 });

      const id = readPageSeedId();
      if (!id) return;

      void loadSeed(id).then((resolved) => {
        if (cancelled || !resolved || resolved.mode !== "consultant") return;
        setUrlSeed(resolved);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [surface]);

  const seed = seedProp ?? urlSeed;
  const seedToken = seedProp ? seedTokenProp : urlSeed ? 1 : 0;
  const handoff = handoffProp ?? urlHandoff;

  const [sessionId, setSessionId] = useState(getOrCreateSessionId);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /*
    Read from effects that must not re-run when the transcript grows: a seed
    arriving mid-conversation has to know whether the visitor has already
    spoken, and `messages` in the dependency list would refire on every token.
  */
  const userTurnsRef = useRef(0);
  const seedApplied = useRef(-1);
  const handoffApplied = useRef(-1);

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
  /** Honeypot — real users never fill a field they cannot see. */
  const [honeypot, setHoneypot] = useState("");
  const [emailed, setEmailed] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [roadmapUrl, setRoadmapUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Labels for what a handoff carried over, acknowledged above the chat. */
  const [carried, setCarried] = useState<string[]>([]);

  const turnstile = useTurnstile();

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

  /* A hidden pane has no layout, so its scroll position is meaningless until
     it is shown again. Re-pin to the latest message on the way back. */
  useEffect(() => {
    if (!active) return;
    const id = window.requestAnimationFrame(() => scrollChat(true));
    return () => window.cancelAnimationFrame(id);
  }, [active, scrollChat]);

  /* --------------------------- session restore --------------------------- */

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
          `/api/consultant?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            messages: ChatMessage[];
            blueprint: Blueprint | null;
            captured: boolean;
            roadmapUrl: string | null;
            slots: Slots;
            progress: number;
            complete: boolean;
          };
          if (cancelled) return;

          if (data.messages.length > 0) {
            restored = true;
            userTurnsRef.current = data.messages.filter((m) => m.role === "user").length;
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
                setRoadmapUrl(data.roadmapUrl);
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
      userTurnsRef.current += 1;
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
          throw new Error(data.error || `${zac.name} is unavailable right now.`);
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

        if (!done) throw new Error(`${zac.name}'s reply was cut short. Try again.`);

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
        onReply?.();

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
    [busy, phase, sessionId, scrollChat, generateBlueprint, onReply],
  );

  /* -------------------------- seeds and handoff -------------------------- */

  /**
   * A contextual entry point ("Ask ZAC about AI automation") delivers an
   * opening message. Curated seeds send themselves; anything the visitor typed
   * only ever prefills the composer — see lib/zac/seeds for why that line
   * matters. Either way a seed is ignored once the conversation has started:
   * a second link should bring the panel forward, not restart someone's work.
   */
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

  /**
   * Arriving from the estimator. The server maps that session's answers onto
   * this one and writes the opening message, so the visitor is not asked to
   * describe the same project twice.
   */
  useEffect(() => {
    if (!handoff || restoring) return;
    if (handoffApplied.current === handoff.token) return;
    handoffApplied.current = handoff.token;

    if (userTurnsRef.current > 0) {
      onHandoffConsumed?.();
      return;
    }

    let cancelled = false;

    (async () => {
      let fromSessionId: string | null = null;
      try {
        fromSessionId = sessionStorage.getItem(ESTIMATOR_SESSION_KEY);
      } catch {
        // Storage disabled — nothing to carry, so just start fresh.
      }
      if (!fromSessionId) {
        onHandoffConsumed?.();
        return;
      }

      try {
        const res = await fetch("/api/consultant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "handoff", sessionId, fromSessionId }),
        });
        const data = (await res.json()) as {
          applied?: boolean;
          prefill?: string;
          carried?: string[];
          slots?: Slots;
          progress?: number;
        };
        if (cancelled) return;

        if (res.ok && data.applied && data.prefill) {
          setCarried(data.carried ?? []);
          setSlots(data.slots ?? {});
          setProgress(data.progress ?? 0);
          void sendMessage(data.prefill);
        }
      } catch {
        // An expired estimate is not an error worth surfacing — the greeting
        // is already on screen and the visitor can just type.
      } finally {
        if (!cancelled) onHandoffConsumed?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handoff, restoring, sessionId, sendMessage, onHandoffConsumed]);

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
          company: honeypot,
          utm: readAttribution(),
          turnstileToken: turnstile.token ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        queued?: boolean;
        alreadySent?: boolean;
        roadmapUrl?: string | null;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not send your roadmap.");

      setEmailed(Boolean(data.queued || data.alreadySent));
      setRoadmapUrl(data.roadmapUrl ?? null);
      setDoneMessage(data.message ?? "");
      setUnlocked(true);
      setPhase("captured");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your roadmap.");
      // Turnstile tokens are single-use; a retry needs a fresh one.
      turnstile.reset();
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
      // A reload still gives them a clean slate.
    }

    if (surface === "page") {
      window.location.href = "/consultant";
      return;
    }

    /*
      In the dock a reload would throw away the page the visitor is reading —
      the one thing this surface exists to protect. Rebuild in place instead:
      a fresh id re-runs the restore effect, which re-greets.
    */
    seedApplied.current = -1;
    handoffApplied.current = -1;
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
    setBlueprint(null);
    setUsedFallback(false);
    setGateOpen(false);
    setUnlocked(false);
    setName("");
    setEmail("");
    setEmailed(false);
    setDoneMessage("");
    setRoadmapUrl(null);
    setError(null);
    setCarried([]);
    setSessionId(getOrCreateSessionId());
  }

  /* ------------------------------ rendering ------------------------------ */

  const barTitle =
    phase === "generating"
      ? `${zac.consultant.consoleTitle} · generating`
      : phase === "blueprint" || phase === "captured"
        ? `${zac.consultant.consoleTitle} · blueprint`
        : `${zac.consultant.consoleTitle} · chat`;

  const canSend = text.trim().length >= 2 && !busy;
  const userTurns = messages.filter((m) => m.who === "user").length;

  const body = (
    <>
          {carried.length > 0 ? (
            <p className="zac-carried" role="status">
              Carried over from your estimate: {carried.join(" · ")}
            </p>
          ) : null}

          {phase === "chat" ? (
            <>
              <div
                className={surface === "dock" ? "zac-pane__thread" : "zac-pane__thread--page"}
                ref={surface === "dock" ? chatRef : undefined}
              >
              <IntakeProgress slots={slots} progress={progress} />

              <div
                className="chat chat--pane"
                ref={surface === "dock" ? undefined : chatRef}
                role="log"
                aria-live="polite"
                aria-atomic="false"
                aria-label={zac.consultant.ariaChat}
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

              {suggestions.length > 0 && !busy && userTurns >= 1 ? (
                <div className="replies" style={{ marginTop: "1rem" }}>
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
              </div>

              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(text);
                }}
              >
                <label className="sr-only" htmlFor="consultant-input">
                  Message {zac.name}
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
                  ? "Scoped from our delivered-project patterns (model unavailable)"
                  : "Scoped by ZAC from your conversation"}
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
                      {/* Off-screen, not display:none, so bots still fill it. */}
                      <input
                        type="text"
                        name="company"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden
                        className="sr-only"
                        value={honeypot}
                        onChange={(event) => setHoneypot(event.target.value)}
                      />
                      <Turnstile
                        key={turnstile.nonce}
                        action="consultant-gate"
                        onToken={turnstile.setToken}
                      />
                      <button
                        type="submit"
                        className="btn btn--gold gate__submit"
                        disabled={busy}
                      >
                        {busy ? "Sending…" : "Reveal my roadmap"}
                      </button>
                      <p className="gate__fine">
                        One email with your blueprint, plus a short follow-up sequence you
                        can stop at any time. No reselling.
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
                    {roadmapUrl ? (
                      <p className="body-sm gate__copy" style={{ marginTop: "0.5rem" }}>
                        Your document also lives at{" "}
                        <a href={roadmapUrl} className="link-u">
                          a shareable link
                        </a>{" "}
                        — forward it, or print it to PDF.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="btn-row gate__actions">
                {roadmapUrl ? (
                  <a href={roadmapUrl} className="btn btn--gold">
                    Open your roadmap
                  </a>
                ) : null}
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
    </>
  );

  if (surface === "dock") {
    return (
      <ZacFrame surface="dock" title={barTitle} phase={phase}>
        {body}
      </ZacFrame>
    );
  }

  return (
    <div className="consultant-layout">
      <ZacFrame surface="page" title={barTitle} phase={phase}>
        {body}
      </ZacFrame>

      <aside className="consultant-aside">
        <div className="aside-card">
          <h3>How it works</h3>
          <ul>
            <li>Describe the real bottleneck</li>
            <li>{zac.consultant.name} asks follow-ups, one at a time</li>
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
              <Link href="/tools/estimator">{zac.estimator.name}</Link>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

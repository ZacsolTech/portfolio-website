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
import { PrototypeView } from "@/components/prototype/prototype-view";
import type { Prototype } from "@/lib/ai/prototype-schema";
import { Turnstile, useTurnstile } from "@/components/shared/turnstile";
import { ChatComposer, ChatTyping, ChatWelcome } from "@/components/zac/chat-page";
import { ZacFrame, type ZacSurface } from "@/components/zac/zac-frame";
import { zac } from "@/lib/content/zac";
import { loadSeed, readPageHandoff, readPageSeedId, type ZacSeed } from "@/lib/zac/seeds";
import { readAttribution } from "@/lib/leads/attribution";

const SESSION_KEY = "zacsol_consultant_session";
/** The estimator writes its own id here; a handoff reads it back. */
const ESTIMATOR_SESSION_KEY = "zacsol_estimator_session";
/** Survives refresh when the server session store drops the lead. */
const unlockKey = (sessionId: string) => `zacsol_consultant_unlock:${sessionId}`;

type UnlockPersist = {
  roadmapUrl: string | null;
  emailed: boolean;
  message: string;
};

function readUnlock(sessionId: string): UnlockPersist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(unlockKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnlockPersist;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeUnlock(sessionId: string, data: UnlockPersist) {
  try {
    sessionStorage.setItem(unlockKey(sessionId), JSON.stringify(data));
  } catch {
    // Private mode — server restore still handles Redis/DB recovery.
  }
}

function clearUnlock(sessionId: string) {
  try {
    sessionStorage.removeItem(unlockKey(sessionId));
  } catch {
    // ignore
  }
}

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

/**
 * Gated half: the numbers and detail worth an email address.
 *
 * The visual prototype stays sharp above the gate — that is the trust proof.
 * What sits behind the email is cost, features, stack and phases.
 */
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
  const [prototype, setPrototype] = useState<Prototype | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  /** Honeypot — real users never fill a field they cannot see. */
  const [honeypot, setHoneypot] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
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
            prototype: Prototype | null;
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
              setPrototype(data.prototype ?? null);
              setUsedFallback(data.blueprint.source === "rules");
              const localUnlock = readUnlock(sessionId);
              if (data.captured || localUnlock) {
                setPhase("captured");
                setUnlocked(true);
                setEmailed(data.captured || Boolean(localUnlock?.emailed));
                setRoadmapUrl(data.roadmapUrl ?? localUnlock?.roadmapUrl ?? null);
                setDoneMessage(
                  localUnlock?.message ||
                    (data.captured
                      ? "Your roadmap is ready."
                      : "Your roadmap is on its way."),
                );
                if (data.captured && data.roadmapUrl) {
                  writeUnlock(sessionId, {
                    roadmapUrl: data.roadmapUrl,
                    emailed: true,
                    message: "Your roadmap is ready.",
                  });
                }
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
        prototype?: Prototype | null;
        usedFallback?: boolean;
        error?: string;
      };

      if (!res.ok || !data.blueprint) {
        throw new Error(data.error || "Could not build the blueprint.");
      }

      setBlueprint(data.blueprint);
      setPrototype(data.prototype ?? null);
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
      // Prefer the live DOM value — autofill can fill inputs without React state.
      const hpValue = (honeypotRef.current?.value ?? honeypot).trim();

      const res = await fetch("/api/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gate",
          sessionId,
          name: name.trim(),
          email: email.trim(),
          hp: hpValue || undefined,
          utm: readAttribution(),
          turnstileToken: turnstile.token ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        queued?: boolean;
        alreadySent?: boolean;
        roadmapUrl?: string | null;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not send your roadmap.");

      // Prefer explicit unlock signals. `ok: true` alone is not enough — an
      // older honeypot path returned bare ok and left the panel locked.
      const unlockedNow = Boolean(data.queued || data.alreadySent || data.roadmapUrl);
      if (!unlockedNow) {
        throw new Error(
          data.error ||
            "Could not unlock your roadmap. Please try again — if this keeps happening, refresh the page.",
        );
      }

      const roadmap = data.roadmapUrl ?? null;
      const message = data.message ?? "";
      setEmailed(Boolean(data.queued || data.alreadySent));
      setRoadmapUrl(roadmap);
      setDoneMessage(message);
      setUnlocked(true);
      setPhase("captured");
      writeUnlock(sessionId, {
        roadmapUrl: roadmap,
        emailed: Boolean(data.queued || data.alreadySent),
        message,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your roadmap.");
      // Turnstile tokens are single-use; a retry needs a fresh one.
      turnstile.reset();
      if (honeypotRef.current) honeypotRef.current.value = "";
      setHoneypot("");
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
      clearUnlock(sessionId);
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
    setPrototype(null);
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
      ? "Building your roadmap"
      : phase === "blueprint" || phase === "captured"
        ? "Your solution blueprint"
        : zac.consultant.name;

  const barSubtitle =
    phase === "chat"
      ? "Solution consultant · free"
      : phase === "generating"
        ? "Usually under a minute"
        : "Scoped from your conversation";

  const canSend = text.trim().length >= 2 && !busy;
  const userTurns = messages.filter((m) => m.who === "user").length;
  const isFresh = userTurns === 0;
  const isPage = surface === "page";

  const ctaBlock =
    complete ? (
      <div className={`consultant-cta${isPage ? " consultant-cta--page" : ""}`}>
        <div className="consultant-cta__head">
          <p className="consultant-cta__note">
            Here&apos;s what I&apos;ve got. Anything wrong, just tell me below — it
            changes the estimate.
          </p>
          <dl className="consultant-cta__recap">
            {SLOT_KEYS.filter((key) => key !== "outcome").map((key) => (
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
      <div
        className={`consultant-cta consultant-cta--soft${isPage ? " consultant-cta--page" : ""}`}
      >
        <p className="consultant-cta__note">
          We can keep going, or I can build the blueprint now and flag what I had
          to assume.
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

          {carried.length > 0 ? (
            <p className="zac-carried" role="status">
              Carried over from your estimate: {carried.join(" · ")}
            </p>
          ) : null}

          {isFresh ? (
            <ChatWelcome
              title="What should we solve?"
              body={GREETING}
              starters={zac.consultant.starters.slice(0, 2)}
              onPick={(starter) => void sendMessage(starter)}
              compact={!isPage}
            />
          ) : (
            <div
              className="chat-stream"
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-label={zac.consultant.ariaChat}
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
              {typing ? <ChatTyping label={zac.consultant.ariaTyping} /> : null}
              {ctaBlock}
            </div>
          )}
        </div>

        <div className={`chat-app__dock${isPage ? "" : " chat-app__dock--panel"}`}>
          {suggestionBlock}
          <ChatComposer
            id={isPage ? "consultant-input" : "consultant-input-dock"}
            label={`Message ${zac.name}`}
            value={text}
            onChange={setText}
            onSubmit={() => void sendMessage(text)}
            disabled={busy || restoring}
            canSend={canSend}
            placeholder={
              isFresh ? "Describe the goal in your own words…" : "Reply to ZAC…"
            }
            inputRef={inputRef}
            hint={isPage ? undefined : ""}
          />
        </div>
      </>
    ) : null;

  const body = (
    <>
          {chatUI}

          {phase === "generating" ? <GeneratingPanel /> : null}

          {(phase === "blueprint" || phase === "captured") && blueprint ? (
            <div className="gate">
              <p className={`bp-source${usedFallback ? " bp-source--fallback" : ""}`}>
                {usedFallback
                  ? "Scoped from our delivered-project patterns (model unavailable)"
                  : "Scoped by ZAC from your conversation"}
              </p>

              <BlueprintTeaser blueprint={blueprint} />

              {/*
                The prototype is the conversion proof — show it sharp before
                asking for email. Cost and phases stay behind the gate.
              */}
              {prototype ? (
                <div className="bp-row bp-row--proto bp-row--proto-open">
                  <div className="bp-row__k">A first look at what we would build</div>
                  <div className="bp-row__body">
                    <PrototypeView prototype={prototype} />
                  </div>
                </div>
              ) : null}

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
                      You’ve seen the concept above. Enter your details to reveal
                      investment, phases and stack — and get the complete document by
                      email. No call required.
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
                      {/*
                        Honeypot: nonsense name + new-password autocomplete so
                        managers/autofill leave it alone. Server logs fills but
                        no longer blocks unlock on them alone.
                      */}
                      <input
                        ref={honeypotRef}
                        type="text"
                        name="zac_website_url"
                        tabIndex={-1}
                        autoComplete="new-password"
                        aria-hidden
                        className="sr-only"
                        defaultValue=""
                        onChange={(event) => setHoneypot(event.target.value)}
                      />
                      <Turnstile
                        key={turnstile.nonce}
                        action="consultant-gate"
                        onToken={turnstile.setToken}
                      />
                      {error ? (
                        <p role="alert" className="consultant-error" style={{ marginTop: 0 }}>
                          {error}
                        </p>
                      ) : null}
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
                        <a href={roadmapUrl} className="link-u" target="_blank" rel="noreferrer">
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
    <ZacFrame
      surface="page"
      title={barTitle}
      subtitle={barSubtitle}
      phase={phase}
      progress={phase === "chat" ? progress : undefined}
      barTrailing={
        <Link href="/tools/estimator" className="chat-app__link">
          <span className="chat-app__link-long">Switch to Estimator</span>
          <span className="chat-app__link-short">Estimator</span>
        </Link>
      }
    >
      {body}
    </ZacFrame>
  );
}

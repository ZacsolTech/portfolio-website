"use client";

import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  RefObject,
} from "react";

/** Up-arrow send control — ChatGPT / Claude pattern. */
export function ChatSendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatWelcome({
  title,
  body,
  starters,
  onPick,
  compact = false,
}: {
  title: string;
  body: string;
  starters: readonly string[];
  onPick: (starter: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`chat-welcome${compact ? " chat-welcome--compact" : ""}`}>
      <h2 className="chat-welcome__title">{title}</h2>
      <p className="chat-welcome__body">{body}</p>
      <div className="chat-welcome__starters">
        {starters.map((starter) => (
          <button
            key={starter}
            type="button"
            className="chat-welcome__starter"
            onClick={() => onPick(starter)}
          >
            <span className="chat-welcome__starter-text">{starter}</span>
            <span className="chat-welcome__starter-go" aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatComposer({
  id,
  label,
  value,
  onChange,
  onSubmit,
  disabled,
  canSend,
  placeholder,
  inputRef,
  hint = "Enter to send · Shift+Enter for a new line",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  canSend: boolean;
  placeholder: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** Pass empty string to hide the hint (dock). */
  hint?: string;
}) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <div className="chat-composer__shell">
        <label className="sr-only" htmlFor={id}>
          {label}
        </label>
        <textarea
          id={id}
          ref={inputRef}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={4000}
        />
        <button
          type="submit"
          className="chat-composer__send"
          disabled={!canSend}
          aria-label="Send message"
        >
          <ChatSendIcon />
        </button>
      </div>
      {hint ? <p className="chat-composer__hint">{hint}</p> : null}
    </form>
  );
}

export function ChatTyping({ label }: { label: string }) {
  return (
    <div className="chat-msg chat-msg--bot">
      <div className="chat-msg__avatar" aria-hidden>
        ZAC
      </div>
      <div className="chat-msg__body">
        <span className="chat-typing" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

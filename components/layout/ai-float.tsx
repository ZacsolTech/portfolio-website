import Link from "next/link";

export function AiFloat() {
  return (
    <Link href="/consultant" className="ai-float" aria-label="Ask the AI consultant">
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4Z" />
      </svg>
      <span>Ask AI</span>
    </Link>
  );
}

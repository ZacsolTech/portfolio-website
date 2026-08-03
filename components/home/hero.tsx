"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge, Console, ConsoleBar, ConsoleBody, LiveDot } from "@/components/ui";
import { Reveal } from "@/components/motion/reveal";
import { heroStats } from "@/lib/content";

const QUICK_REPLIES = [
  {
    label: "Enquiries get lost",
    seed: "We lose customer enquiries because everything is on chat and paper.",
  },
  {
    label: "Manual data entry",
    seed: "My team spends hours every day on manual data entry between systems.",
  },
  {
    label: "I have an app idea",
    seed: "I have an app idea and need to know what it costs and how long it takes.",
  },
  {
    label: "Data, no insight",
    seed: "We have a lot of data but no reporting or forecasting.",
  },
] as const;

function goToConsultant(router: ReturnType<typeof useRouter>, seed: string) {
  const trimmed = seed.trim();
  if (!trimmed) {
    router.push("/consultant");
    return;
  }
  router.push(`/consultant#${encodeURIComponent(trimmed)}`);
}

export function Hero() {
  const router = useRouter();
  const [seed, setSeed] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    goToConsultant(router, seed);
  }

  return (
    <header className="hero on-dark">
      <div
        className="blob blob--gold"
        style={{ width: "26rem", height: "26rem", top: "-6rem", right: "-8rem" }}
      />
      <div
        className="blob blob--mist"
        style={{ width: "22rem", height: "22rem", bottom: "2rem", left: "-6rem" }}
      />
      <div className="container">
        <div className="grid-a grid-a--hero">
          <Reveal>
            <Badge variant="dark">
              <span className="dot" /> AI consultant · live now
            </Badge>
            <h1 className="d1" style={{ marginTop: "1.75rem" }}>
              Describe your business problem.
              <span className="em-serif em-serif--block text-accent">
                Get the software answer
              </span>
              before you spend a rupee.
            </h1>
            <p className="lead" style={{ marginTop: "1.75rem" }}>
              ZACSOL builds web, mobile, AI automation and custom software. Start with our AI
              consultant — it asks a few questions, then returns a recommended solution, the
              features it needs, a timeline and a cost range. Free, and in about three minutes.
            </p>
            <div className="btn-row">
              <Link href="/consultant" className="btn btn--gold">
                Start with the AI consultant
                <ArrowRight aria-hidden />
              </Link>
              <Link href="/book" className="btn btn--outline-dark">
                Book a consultation
              </Link>
            </div>
            <p className="trust-line">
              No sales call to get your roadmap · Reply within one business day · NDA on request
            </p>
          </Reveal>

          <Reveal index={1}>
            <Console>
              <ConsoleBar>
                <LiveDot />
                <span className="console__title">ZACSOL AI Consultant</span>
                <span style={{ marginLeft: "auto" }}>
                  <Badge variant="dark">Free</Badge>
                </span>
              </ConsoleBar>
              <ConsoleBody>
                <div className="chat">
                  <div className="msg msg--bot">
                    <div className="msg__avatar">AI</div>
                    <div className="msg__bubble">
                      Tell me what&apos;s slowing your business down — or the product you want to
                      build. I&apos;ll map it to a solution, features, timeline and budget range.
                    </div>
                  </div>
                  <div className="replies">
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply.label}
                        type="button"
                        className="reply"
                        onClick={() => goToConsultant(router, reply.seed)}
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>
                </div>
                <form className="composer" onSubmit={onSubmit}>
                  <textarea
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="e.g. We get 200 orders a day on chat and track them in a notebook…"
                    aria-label="Describe your business problem"
                  />
                  <button className="btn btn--gold" type="submit" aria-label="Send">
                    <ArrowRight size={18} aria-hidden />
                  </button>
                </form>
              </ConsoleBody>
            </Console>
          </Reveal>
        </div>

        <Reveal index={2} className="hero-stats">
          {heroStats.map((stat) => (
            <div key={stat.label}>
              <div className="stat__value">{stat.value}</div>
              <div className="stat__label">{stat.label}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </header>
  );
}

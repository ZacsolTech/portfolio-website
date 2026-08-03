import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Badge, Field, Input, Panel, Select, Textarea } from "@/components/ui";
import { services, site } from "@/lib/content";

const BUDGETS = [
  "Under $10k",
  "$10k – $30k",
  "$30k – $75k",
  "$75k+",
  "Not sure yet",
] as const;

const CAL_DAYS = [
  { label: "M", off: true },
  { label: "T", off: true },
  { label: "W", off: true },
  { label: "T", off: true },
  { label: "F", off: true },
  { label: "S", off: true },
  { label: "S", off: true },
  { label: "3", off: true },
  { label: "4", off: false },
  { label: "5", off: false },
  { label: "6", off: false, on: true },
  { label: "7", off: false },
  { label: "8", off: true },
  { label: "9", off: true },
  { label: "10", off: false },
  { label: "11", off: false },
  { label: "12", off: false },
  { label: "13", off: false },
  { label: "14", off: false },
  { label: "15", off: true },
  { label: "16", off: true },
] as const;

const SLOTS = [
  { time: "09:30", on: false },
  { time: "11:00", on: true },
  { time: "14:00", on: false },
  { time: "16:30", on: false },
] as const;

export function Contact() {
  return (
    <section className="section section--paper-alt" id="contact">
      <div className="container">
        <div className="grid-a grid-a--even">
          <Reveal id="booking">
            <span className="overline">Book a consultation</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Thirty minutes with <span className="em-serif text-accent">a senior engineer</span>.
            </h2>
            <p className="lead" style={{ marginTop: "1.25rem" }}>
              Not a sales call. Bring the problem, the constraints and the deadline — you&apos;ll
              leave with a direction whether or not you work with us.
            </p>

            <Panel className="booking-panel" style={{ marginTop: "2rem", padding: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <span className="overline">November 2026</span>
                <Badge>30 min · Free</Badge>
              </div>
              <div className="cal" style={{ marginBottom: "1.25rem" }}>
                {CAL_DAYS.map((day, i) => (
                  <div
                    key={`${day.label}-${i}`}
                    className={[
                      "cal__d",
                      day.off ? "cal__d--off" : "",
                      "on" in day && day.on ? "cal__d--on" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
              <span className="overline" style={{ display: "block", marginBottom: "0.75rem" }}>
                Available — Fri 6 Nov
              </span>
              <div className="slots">
                {SLOTS.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={slot.on ? "slot slot--on" : "slot"}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
              <Link href="/book" className="btn btn--ink" style={{ width: "100%", marginTop: "1.25rem" }}>
                Confirm 11:00, Fri 6 Nov
              </Link>
            </Panel>

            <p
              style={{
                marginTop: "1.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
              }}
            >
              {site.email}
            </p>
          </Reveal>

          <Reveal index={1} className="contact-panel">
            <span className="overline">Or send a brief</span>
            <h3 className="d4" style={{ marginTop: "0.75rem", marginBottom: "1.5rem" }}>
              A senior team member replies within one business day.
            </h3>
            <form>
              <div className="field-2">
                <Field label="Full name">
                  <Input type="text" name="name" placeholder="Jane Cooper" autoComplete="name" />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    name="email"
                    placeholder="jane@company.com"
                    autoComplete="email"
                    required
                  />
                </Field>
              </div>
              <div className="field-2">
                <Field label="Company">
                  <Input
                    type="text"
                    name="company"
                    placeholder="Acme Ltd"
                    autoComplete="organization"
                  />
                </Field>
                <Field label="Service needed">
                  <Select name="service" defaultValue="not-sure">
                    <option value="not-sure">Not sure — advise me</option>
                    {services.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Budget range">
                <Select name="budget" defaultValue={BUDGETS[0]}>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="What's the problem?">
                <Textarea
                  name="message"
                  placeholder="Goal, timeline, and the bottleneck you need solved."
                />
              </Field>
              <label
                style={{
                  display: "flex",
                  gap: "0.625rem",
                  alignItems: "flex-start",
                  margin: "0.5rem 0 1.5rem",
                }}
              >
                <input type="checkbox" name="consent" required style={{ marginTop: "0.25rem" }} />
                <span className="body-sm">
                  I agree to ZACSOL storing this information to respond to my enquiry by email.
                </span>
              </label>
              <button className="btn btn--gold btn--lg" type="submit" style={{ width: "100%" }}>
                Send project brief
                <ArrowRight aria-hidden />
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

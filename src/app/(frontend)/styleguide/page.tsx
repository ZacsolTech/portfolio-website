import type { Metadata } from "next";
import {
  Badge,
  BodySm,
  Button,
  Card,
  CardBody,
  CardMedia,
  CardNum,
  CardTop,
  Check,
  Chip,
  Console,
  ConsoleBar,
  ConsoleBody,
  Display,
  EmSerif,
  Field,
  IconTile,
  IconTileNum,
  Input,
  Lead,
  LiveDot,
  Opt,
  Overline,
  Panel,
  PanelRow,
  Select,
  Stat,
  Textarea,
} from "@/components/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Styleguide",
  description: "ZACSOL UI primitives — buttons, badges, chips, cards, panels, fields, console and type.",
  path: "/styleguide",
  noIndex: true,
});

function Label({ children }: { children: string }) {
  return <p className="styleguide-label">{children}</p>;
}

export default function StyleguidePage() {
  return (
    <>
      <header className="page-hero on-dark section--persist">
        <div className="container">
          <Overline gold>Sprint 1 · styleguide</Overline>
          <Display size="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
            Every primitive, <EmSerif>both themes</EmSerif>
          </Display>
          <Lead style={{ marginTop: "1.25rem", color: "var(--text-on-dark-body)" }}>
            Use the theme toggle in the nav to flip light/dark. Surfaces and ink track{" "}
            <code className="chip">data-theme</code>.
          </Lead>
        </div>
      </header>

      <section className="section section--paper">
        <div className="container" style={{ display: "grid", gap: "3.5rem" }}>
          <div>
            <Label>Buttons</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
              <Button variant="gold">Gold</Button>
              <Button variant="ink">Ink</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline-dark">Outline dark</Button>
              <Button variant="gold" size="sm">
                Small
              </Button>
              <Button variant="gold" size="lg">
                Large
              </Button>
              <Button variant="gold" href="/consultant">
                As link
              </Button>
            </div>
          </div>

          <div>
            <Label>Badges & chips</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              <Badge>Default</Badge>
              <Badge variant="gold">Gold</Badge>
              <Badge variant="dark">Dark</Badge>
              <Chip>Next.js</Chip>
              <Chip>TypeScript</Chip>
              <Chip>Gemini</Chip>
            </div>
          </div>

          <div>
            <Label>Overlines & typography</Label>
            <Overline>Overline default</Overline>
            <Overline gold style={{ marginTop: "0.5rem" }}>
              Overline gold
            </Overline>
            <Display size="d1" style={{ marginTop: "1rem" }}>
              Display d1
            </Display>
            <Display size="d2" style={{ marginTop: "0.5rem" }}>
              Display d2 with <EmSerif>serif emphasis</EmSerif>
            </Display>
            <Display size="d3" style={{ marginTop: "0.5rem" }}>
              Display d3
            </Display>
            <Display size="d4" style={{ marginTop: "0.5rem" }}>
              Display d4
            </Display>
            <Lead style={{ marginTop: "1rem" }}>
              Lead — supporting sentence under a headline, capped for measure.
            </Lead>
            <BodySm style={{ marginTop: "0.75rem" }}>
              Body sm — secondary copy, captions and card blurbs.
            </BodySm>
          </div>

          <div>
            <Label>Icon tiles</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <IconTile>
                <span aria-hidden>◇</span>
              </IconTile>
              <IconTile size="sm">
                <span aria-hidden>◇</span>
              </IconTile>
              <IconTile variant="gold">
                <span aria-hidden>◇</span>
              </IconTile>
              <IconTile>
                <IconTileNum>01</IconTileNum>
              </IconTile>
            </div>
          </div>

          <div>
            <Label>Checks & stats</Label>
            <div className="grid-2" style={{ gap: "1rem", marginBottom: "1.5rem" }}>
              <Check>Senior-only teams on your budget</Check>
              <Check>Weekly deployables, not status decks</Check>
            </div>
            <div className="grid-4">
              <Stat value="50+" label="Projects" />
              <Stat value="<1 day" label="Response" />
              <Stat value="8" label="Service lines" />
              <Stat value="12" label="Industries" />
            </div>
          </div>

          <div>
            <Label>Cards</Label>
            <div className="grid-3">
              <Card>
                <CardTop>
                  <Badge variant="gold">Accent</Badge>
                  <CardNum>01</CardNum>
                </CardTop>
                <Display size="d4" style={{ marginTop: "1rem" }}>
                  Default card
                </Display>
                <BodySm style={{ marginTop: "0.5rem" }}>
                  Padding, radius and border from tokens. No extra shadow stack.
                </BodySm>
              </Card>
              <Card variant="dark">
                <Display size="d4" style={{ color: "#fff" }}>
                  Dark card
                </Display>
                <BodySm style={{ marginTop: "0.5rem", color: "rgba(255,255,255,.65)" }}>
                  For navy bands and toolkit tiles.
                </BodySm>
              </Card>
              <Card variant="media">
                <CardMedia>
                  <div className="thumb thumb--b" data-label="Media" />
                </CardMedia>
                <CardBody>
                  <Badge>Project</Badge>
                  <Display size="d4" style={{ marginTop: "0.75rem" }}>
                    Media card
                  </Display>
                  <BodySm style={{ marginTop: "0.5rem" }}>CSS thumb — no image asset required.</BodySm>
                </CardBody>
              </Card>
            </div>
          </div>

          <div>
            <Label>Panels</Label>
            <Panel>
              <PanelRow>
                <Display size="d4" style={{ margin: 0 }}>
                  Panel row one
                </Display>
              </PanelRow>
              <PanelRow>
                <Display size="d4" style={{ margin: 0 }}>
                  Panel row two
                </Display>
              </PanelRow>
            </Panel>
            <Panel variant="dark" style={{ marginTop: "1rem", padding: "1.5rem" }}>
              <Overline gold>Dark panel</Overline>
              <Lead style={{ marginTop: "0.75rem", color: "var(--text-on-dark-body)" }}>
                Used for mid-page navy consultant bands and tool shells.
              </Lead>
            </Panel>
          </div>

          <div>
            <Label>Fields</Label>
            <div className="grid-2" style={{ gap: "1rem", maxWidth: "36rem" }}>
              <Field label="Name" htmlFor="sg-name">
                <Input id="sg-name" placeholder="Ada Lovelace" />
              </Field>
              <Field label="Service" htmlFor="sg-svc">
                <Select id="sg-svc" defaultValue="web">
                  <option value="web">Web</option>
                  <option value="ai">AI</option>
                </Select>
              </Field>
              <Field label="Message" htmlFor="sg-msg" className="col-span">
                <Textarea id="sg-msg" rows={3} placeholder="What's broken?" />
              </Field>
            </div>
          </div>

          <div>
            <Label>Opt tiles (wizard)</Label>
            <div style={{ display: "grid", gap: "0.5rem", maxWidth: "28rem" }}>
              <Opt optKey="1" pressed>
                Selected option
              </Opt>
              <Opt optKey="2">Idle option</Opt>
            </div>
            <p className="body-sm" style={{ marginTop: "0.75rem" }}>
              Opt tiles are designed for navy consoles — toggle theme to dark for the intended look,
              or see the console below.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--ink section--persist on-dark">
        <div className="container">
          <Label>Console</Label>
          <Console>
            <ConsoleBar>
              <LiveDot />
              <span className="console__title">Live console preview</span>
            </ConsoleBar>
            <ConsoleBody>
              <div className="chat">
                <div className="msg msg--bot">
                  <div className="msg__avatar">ZAC</div>
                  <div className="msg__bubble">
                    Tell me what&apos;s slowing your business down.
                  </div>
                </div>
                <div className="msg msg--user">
                  <div className="msg__avatar">YOU</div>
                  <div className="msg__bubble">Enquiries get lost between chat and CRM.</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: "0.5rem", marginTop: "1.25rem" }}>
                <Opt optKey="A" pressed>
                  Retail & e-commerce
                </Opt>
                <Opt optKey="B">Healthcare</Opt>
              </div>
              <div className="composer" style={{ marginTop: "1.25rem" }}>
                <textarea rows={2} placeholder="Type a reply…" readOnly />
                <button type="button" className="btn btn--gold">
                  Send
                </button>
              </div>
            </ConsoleBody>
          </Console>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <Label>Theme note</Label>
          <Lead>
            The floating pill nav includes the theme toggle. Flip it and re-check buttons, cards,
            panels and fields — ink and paper tokens invert; gold stays action-only.
          </Lead>
        </div>
      </section>
    </>
  );
}

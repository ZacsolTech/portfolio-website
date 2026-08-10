import { z } from "zod";
import { getClientIp, limitSubscribe } from "@/lib/ai/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const runtime = "nodejs";

/**
 * Insights list sign-up.
 *
 * Deliberately small: validate, rate limit, persist. Re-submitting an address
 * that already exists is a success, not an error — telling an anonymous caller
 * "that address is already on the list" turns the endpoint into a membership
 * oracle, and it is not a failure from the visitor's point of view either.
 */

const Body = z.object({
  email: z.string().trim().email().max(160).toLowerCase(),
  /**
   * Honeypot — real users never fill a field they cannot see. Accepted by the
   * schema on purpose: rejecting it here would return a 400 that tells a bot
   * exactly which field to stop filling. It is checked below instead.
   */
  company: z.string().max(200).optional(),
  turnstileToken: z.string().max(4000).optional(),
});

async function payloadClient() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  return getPayload({ config });
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Silent success: a bot that filled the honeypot gets no signal to tune against.
  if (parsed.company) return Response.json({ ok: true });

  const ip = getClientIp(request);

  const human = await verifyTurnstile({
    token: parsed.turnstileToken,
    ip,
    action: "newsletter",
  });
  if (!human.ok) return Response.json({ error: human.error }, { status: 403 });

  const allowed = await limitSubscribe(ip);
  if (!allowed) {
    return Response.json(
      { error: "Too many sign-ups from this network. Try again later." },
      { status: 429 },
    );
  }

  try {
    const payload = await payloadClient();

    const existing = await payload.find({
      collection: "subscribers",
      where: { email: { equals: parsed.email } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const current = existing.docs[0];
      if (current.status !== "subscribed") {
        await payload.update({
          collection: "subscribers",
          id: current.id,
          overrideAccess: true,
          data: { status: "subscribed" },
        });
      }
      return Response.json({ ok: true });
    }

    await payload.create({
      collection: "subscribers",
      overrideAccess: true,
      data: { email: parsed.email, status: "subscribed", source: "footer" },
    });

    return Response.json({ ok: true });
  } catch (err) {
    // Log the address so a storage outage doesn't silently cost the sign-up.
    console.error("[subscribe] failed to store", parsed.email, err);
    return Response.json(
      { error: "Couldn't save that just now. Please try again." },
      { status: 500 },
    );
  }
}

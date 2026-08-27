import React from "react";
import type { ServerProps } from "payload";

export function Welcome({ user }: ServerProps) {
  const name =
    (typeof user?.name === "string" && user.name) ||
    (typeof user?.email === "string" && user.email) ||
    "there";
  const role = typeof user?.role === "string" ? user.role : "staff";

  return (
    <section className="zacsol-dash">
      <p className="zacsol-dash__kicker">ZACSOL Admin</p>
      <h1 className="zacsol-dash__title">Sales, blog and operations</h1>
      <p className="zacsol-dash__lede">
        Signed in as {name}
        <span className="zacsol-dash__role">{role}</span>
      </p>
      <p className="zacsol-dash__note">
        Posts are drafted and published here. Upload photos under Media, then
        pick one as the Featured image on a post. Only Published posts appear
        on /blog. Leads, bookings and roadmaps are created by the public site,
        not from here. Do not paste manage or unsubscribe tokens into chat.
      </p>
    </section>
  );
}

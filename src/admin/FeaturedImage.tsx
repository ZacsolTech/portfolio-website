"use client";

import React from "react";
import { useField } from "@payloadcms/ui";

export function FeaturedImage() {
  const { value } = useField<string>({ path: "cover.src" });
  const src = typeof value === "string" ? value.trim() : "";

  if (!src) {
    return (
      <p className="zacsol-featured__empty">No image yet. Add a URL below.</p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="zacsol-featured__img" src={src} alt="" />
  );
}

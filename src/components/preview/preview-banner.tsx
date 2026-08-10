import { draftMode } from "next/headers";
import Link from "next/link";
import { RefreshRouteOnSave } from "./refresh-route-on-save";

/** Visible only while Next.js Draft Mode is on (CMS preview). */
export async function PreviewBanner() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  return (
    <>
      <RefreshRouteOnSave />
      <div
        role="status"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          flexWrap: "wrap",
          padding: "0.625rem 1rem",
          background: "var(--gold)",
          color: "var(--gold-on)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <span>Draft preview — unpublished changes visible</span>
        <Link
          href="/api/exit-preview"
          style={{
            color: "inherit",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            fontWeight: 600,
          }}
        >
          Exit preview
        </Link>
      </div>
    </>
  );
}

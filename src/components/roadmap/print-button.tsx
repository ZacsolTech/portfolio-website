"use client";

import { Download } from "lucide-react";

/**
 * "Download PDF" via the browser's own print-to-PDF.
 *
 * The alternative — rendering server-side with a headless browser or
 * `@react-pdf/renderer` — means maintaining a second layout that will drift
 * from this one, plus a heavyweight dependency on a serverless function. The
 * page is already print-styled to be the deliverable, so the browser's
 * export of it *is* the PDF, and it stays correct for free whenever the
 * document changes.
 */
export function PrintButton() {
	return (
		<button
			type="button"
			className="btn btn--ghost btn--sm doc__print"
			onClick={() => window.print()}
		>
			<Download size={15} aria-hidden />
			Download PDF
		</button>
	);
}

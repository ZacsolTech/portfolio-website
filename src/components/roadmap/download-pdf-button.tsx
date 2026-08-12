"use client";

import { Download } from "lucide-react";
import { useState } from "react";

/**
 * Real PDF download of the on-screen roadmap document.
 *
 * Captures `#roadmap-doc` so the PDF stays in sync with the live layout.
 * Uses `html2canvas-pro` (not html2canvas) because the site theme emits modern
 * CSS color functions (`color()`, `oklch`) that the original library rejects.
 */

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 72);
}

export function DownloadPdfButton({ title }: { title: string }) {
	const [busy, setBusy] = useState(false);

	async function onDownload() {
		const root = document.getElementById("roadmap-doc");
		if (!root || busy) return;

		setBusy(true);
		document.body.classList.add("is-pdf-exporting");

		try {
			const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
				import("html2canvas-pro"),
				import("jspdf"),
			]);

			const canvas = await html2canvas(root, {
				scale: Math.min(2, window.devicePixelRatio || 2),
				useCORS: true,
				allowTaint: true,
				backgroundColor: "#ffffff",
				logging: false,
				scrollX: 0,
				scrollY: 0,
				windowWidth: root.scrollWidth,
				onclone(clonedDoc) {
					const clonedRoot = clonedDoc.getElementById("roadmap-doc");
					if (!clonedRoot) return;
					clonedRoot.querySelectorAll<HTMLElement>(".doc__actions, .doc-cta__actions").forEach((el) => {
						el.style.display = "none";
					});
					// Next/Image often leaves lazy placeholders that confuse capture.
					clonedRoot.querySelectorAll("img").forEach((img) => {
						img.style.maxWidth = "100%";
						img.loading = "eager";
						img.decoding = "sync";
					});
				},
			});

			if (!canvas.width || !canvas.height) {
				throw new Error("PDF capture produced an empty canvas.");
			}

			const imgData = canvas.toDataURL("image/jpeg", 0.92);
			const pdf = new jsPDF({
				orientation: "portrait",
				unit: "mm",
				format: "a4",
				compress: true,
			});

			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = pageWidth;
			const imgHeight = (canvas.height * imgWidth) / canvas.width;

			let heightLeft = imgHeight;
			let position = 0;

			pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
			heightLeft -= pageHeight;

			while (heightLeft > 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
				heightLeft -= pageHeight;
			}

			const filename = `${slugify(title) || "solution-roadmap"}.pdf`;
			pdf.save(filename);
		} catch (err) {
			console.error("[roadmap] PDF export failed:", err);
			window.alert("Could not generate the PDF. Please try again.");
		} finally {
			document.body.classList.remove("is-pdf-exporting");
			setBusy(false);
		}
	}

	return (
		<button
			type="button"
			className="btn btn--ghost btn--sm doc__print"
			onClick={() => void onDownload()}
			disabled={busy}
			aria-busy={busy}
		>
			<Download size={15} aria-hidden />
			{busy ? "Preparing PDF…" : "Download PDF"}
		</button>
	);
}

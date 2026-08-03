/** Breakpoint strategy (locked Sprint 1)
 * sm  640px  — single→2 col, full-bleed console ends
 * md  768px  — 3-up grids, 4-up stats
 * lg 1024px  — nav links visible, asymmetric section grids
 * xl 1280px  — sticky TOC, container max
 */
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

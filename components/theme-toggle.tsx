"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

/**
 * "Are we past hydration?" as an external store.
 *
 * The store never changes, so it never notifies: the value flips once, when
 * React stops using the server snapshot after hydration. That is the same
 * signal the usual `useState(false)` + `useEffect(() => setMounted(true))`
 * pattern produces, without setting state inside an effect — which the React
 * compiler rejects because it forces a second render pass on every mount.
 */
const subscribe = () => () => {};
const isHydrated = () => true;
const isServerRender = () => false;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // The resolved theme is only knowable in the browser, so anything derived
  // from it has to match the server's markup until hydration completes.
  const mounted = useSyncExternalStore(subscribe, isHydrated, isServerRender);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-toggle
      aria-pressed={mounted ? isDark : undefined}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle color theme"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun className="theme-toggle__sun" aria-hidden />
      <Moon className="theme-toggle__moon" aria-hidden />
    </button>
  );
}

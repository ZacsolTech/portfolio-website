"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

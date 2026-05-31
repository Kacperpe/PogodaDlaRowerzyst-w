"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
      title={isDark ? "Przelacz na jasny motyw" : "Przelacz na ciemny motyw"}
    >
      {isDark ? "Jasny" : "Ciemny"}
    </button>
  );
}

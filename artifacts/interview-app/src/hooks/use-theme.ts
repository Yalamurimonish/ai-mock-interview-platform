import { useCallback, useEffect } from "react";
import { useTheme as useNextTheme } from "next-themes";

export type AppTheme = "dark" | "light" | "system";

const THEME_CYCLE: AppTheme[] = ["light", "dark", "system"];

export { useTheme } from "next-themes";
export { ThemeProvider } from "@/components/theme-provider";

export function useAppTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  const appTheme = (theme ?? "system") as AppTheme;

  const cycleTheme = useCallback(() => {
    const index = THEME_CYCLE.indexOf(appTheme);
    const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
    setTheme(next);
  }, [appTheme, setTheme]);

  const setAppTheme = useCallback(
    (value: AppTheme) => {
      setTheme(value);
    },
    [setTheme]
  );

  return {
    theme: appTheme,
    setTheme: setAppTheme,
    resolvedTheme: resolvedTheme as "dark" | "light" | undefined,
    systemTheme: systemTheme as "dark" | "light" | undefined,
    cycleTheme,
  };
}

/** Cycles light → dark → system with Ctrl+Shift+L */
export function useThemeKeyboardShortcut(enabled = true) {
  const { cycleTheme } = useAppTheme();

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !(event.ctrlKey || event.metaKey) ||
        !event.shiftKey
      ) {
        return;
      }

      if (event.key.toLowerCase() !== "l") return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      event.preventDefault();
      cycleTheme();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cycleTheme, enabled]);
}

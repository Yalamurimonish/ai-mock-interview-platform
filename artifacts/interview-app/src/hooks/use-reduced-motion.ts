import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "reduce-motion";

function getSystemPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readStoredPreference(): boolean | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return null;
}

function applyReduceMotionPreference(enabled: boolean, followsSystem: boolean) {
  document.documentElement.classList.toggle("reduce-motion", enabled);
  document.documentElement.classList.toggle(
    "allow-motion",
    !followsSystem && !enabled
  );
}

export function useReducedMotion() {
  const [reduceMotion, setReduceMotionState] = useState(() => {
    const stored = readStoredPreference();
    if (stored !== null) return stored;
    return getSystemPrefersReducedMotion();
  });

  const [followsSystem, setFollowsSystem] = useState(
    () => readStoredPreference() === null
  );

  useEffect(() => {
    applyReduceMotionPreference(reduceMotion, followsSystem);
  }, [reduceMotion, followsSystem]);

  useEffect(() => {
    if (!followsSystem) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotionState(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [followsSystem]);

  const setReduceMotion = useCallback((enabled: boolean, options?: { system?: boolean }) => {
    if (options?.system) {
      localStorage.removeItem(STORAGE_KEY);
      setFollowsSystem(true);
      setReduceMotionState(getSystemPrefersReducedMotion());
      return;
    }

    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    setFollowsSystem(false);
    setReduceMotionState(enabled);
  }, []);

  return { reduceMotion, followsSystem, setReduceMotion };
}

/** Applies stored / system reduce-motion before React hydrates */
export function initReducedMotion() {
  const stored = readStoredPreference();
  const followsSystem = stored === null;
  const enabled = stored ?? getSystemPrefersReducedMotion();
  applyReduceMotionPreference(enabled, followsSystem);
}

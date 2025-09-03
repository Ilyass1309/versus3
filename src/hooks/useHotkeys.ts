"use client";
import { useEffect, type DependencyList } from "react";

type Handler = (e: KeyboardEvent) => void;

export function useHotkeys(map: Record<string, Handler>, deps: DependencyList = []) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const fn = map[k];
      if (fn) fn(e);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
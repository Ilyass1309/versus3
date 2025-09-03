"use client";
import { useEffect, useState } from "react";

export function PressAnyKey({ onStart }: { onStart: () => void }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    function go(e: KeyboardEvent) {
      e.preventDefault();
      onStart();
    }
    function click() {
      onStart();
    }
    window.addEventListener("keydown", go, { once: true });
    window.addEventListener("pointerdown", click, { once: true });
    const t = setInterval(() => setPulse(p => !p), 1000);
    return () => {
      window.removeEventListener("keydown", go);
      window.removeEventListener("pointerdown", click);
      clearInterval(t);
    };
  }, [onStart]);

  return (
    <button
      onClick={onStart}
      role="button"
      className={`mt-10 text-sm tracking-widest uppercase font-semibold px-6 py-3 rounded-full border border-white/20 backdrop-blur bg-white/5 hover:bg-white/10 transition focus:outline-none focus-visible:ring ring-violet-400/60 ${
        pulse ? "opacity-100" : "opacity-55"
      }`}
      aria-label="Start"
    >
      Press any key to start
    </button>
  );
}
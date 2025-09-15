"use client";
import { useEffect, useState } from "react";

type Props = {
  visible: boolean;
  seconds?: number; // start value, default 3
  onFinished?: () => void;
};

export default function StartCountdownModal({ visible, seconds = 3, onFinished }: Props) {
  const [count, setCount] = useState<number>(seconds);

  useEffect(() => {
    let t: number | undefined;
    if (visible) {
      setCount(seconds);
      // tick every 1s until 0
      t = window.setInterval(() => {
        setCount((c) => Math.max(0, c - 1));
      }, 1000);
    }
    return () => {
      if (t !== undefined) window.clearInterval(t);
    };
  }, [visible, seconds]);

  // call finished when count reaches 0
  useEffect(() => {
    let timeoutId: number | undefined;
    if (visible && count === 0) {
      // slight delay so UI shows 0 briefly
      timeoutId = window.setTimeout(() => {
        onFinished?.();
      }, 300);
    }
    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [count, visible, onFinished]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md mx-4 rounded-xl border border-white/10 bg-slate-900/90 p-6 backdrop-blur shadow-xl text-center">
        <div className="text-2xl font-semibold text-slate-100 mb-2">La partie va commencer</div>
        <div className="text-6xl font-bold text-amber-400 tabular-nums">{count}</div>
      </div>
    </div>
  );
}

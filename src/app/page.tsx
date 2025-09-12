"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const handledRef = useRef(false);

  const goToAuth = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    router.push("/nickname");
  }, [router]);

  useEffect(() => {
    const onAnyKey = () => goToAuth();
    const onTouch = () => goToAuth();

    window.addEventListener("keydown", onAnyKey, { once: true });
    window.addEventListener("touchstart", onTouch, { once: true });
    window.addEventListener("pointerdown", onTouch, { once: true });

    return () => {
      window.removeEventListener("keydown", onAnyKey);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("pointerdown", onTouch);
    };
  }, [goToAuth]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white px-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div
          role="img"
          aria-label="VERSUS III logo"
          className="mx-auto w-36 h-36 rounded-xl flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-fuchsia-500 shadow-2xl"
        >
          {/* simple SVG mark */}
          <svg viewBox="0 0 200 200" className="w-24 h-24" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="200" height="200" rx="24" fill="none" />
            <g transform="translate(20,30)">
              <text x="0" y="70" fontSize="72" fontWeight="700" fill="url(#g)" fontFamily="system-ui,Segoe UI,Roboto">
                V3
              </text>
            </g>
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-wider">VERSUS III</h1>

        {/* Subtitle / CTA */}
        <div>
          <p className="text-sm text-slate-300 mb-4">A minimal tactical duel — local & online</p>

          <button
            type="button"
            onClick={goToAuth}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-white/8 hover:bg-white/12 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Go to login"
          >
            <span className="text-[13px] font-medium">Enter</span>
          </button>

          <div
            className="mt-6 text-xs text-slate-200 opacity-90"
            style={{ pointerEvents: "none" }}
          >
            <span className="inline-block animate-pulse">press any key • touch to continue</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-6">
          Already have an account? The login screen will let you sign in or create one.
        </p>
      </div>
    </main>
  );
}
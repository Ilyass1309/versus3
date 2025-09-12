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
    <main
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070617] via-[#0b1021] to-[#071026] text-white px-6"
      onClick={goToAuth}
    >
      <div className="max-w-3xl w-full text-center space-y-8 select-none">
        <div className="relative mx-auto w-44 h-44">
          <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20 bg-gradient-to-tr from-indigo-600 via-fuchsia-500 to-cyan-400 animate-blob"></div>

          <div
            role="img"
            aria-label="VERSUS III logo"
            className="relative z-10 w-44 h-44 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-black/40 to-black/20 border border-white/5 shadow-xl"
          >
            {/* nouveau logo SVG */}
            <svg viewBox="0 0 120 120" className="w-28 h-28" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <defs>
                <linearGradient id="lg1" x1="0" x2="1">
                  <stop offset="0" stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
                <radialGradient id="rg1" cx="30%" cy="20%" r="80%">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* background emblem */}
              <rect x="6" y="6" width="108" height="108" rx="18" fill="url(#lg1)" opacity="0.14" />
              <rect x="10" y="10" width="100" height="100" rx="16" fill="black" opacity="0.18" />

              {/* subtle shine */}
              <circle cx="34" cy="28" r="28" fill="url(#rg1)" opacity="0.16" />

              {/* stylized V */}
              <g transform="translate(10,6)" fill="none" stroke="url(#lg1)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#soft)">
                <path d="M12 74 L34 24 L56 74" strokeLinecap="round" />
              </g>

              {/* III bars */}
              <g transform="translate(68,22)" fill="url(#lg1)">
                <rect x="0" y="10" width="6" height="48" rx="2" />
                <rect x="10" y="10" width="6" height="48" rx="2" />
                <rect x="20" y="10" width="6" height="48" rx="2" />
              </g>

              {/* small tag text VERSUS (accessory) */}
              <text x="60" y="106" fontSize="8" textAnchor="middle" fill="#cbd5e1" fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto">
                VERSUS
              </text>
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-fuchsia-300">
            VERSUS III
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-sm md:text-base text-slate-300">
          Minimal tactical duels — local & online. Fast matches, deep decisions.
        </p>

        <div className="mt-4">
          <div
            className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/6 backdrop-blur-sm border border-white/6 text-sm text-slate-100 cursor-pointer hover:scale-[1.02] transition-transform"
            aria-hidden
          >
            <svg className="w-4 h-4 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="animate-pulse">press any key • touch to continue</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-2">
          By continuing you will be taken to the login / nickname screen.
        </p>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(8px, -12px) scale(1.05);
          }
          66% {
            transform: translate(-6px, 6px) scale(0.95);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 6s infinite;
        }
      `}</style>
    </main>
  );
}
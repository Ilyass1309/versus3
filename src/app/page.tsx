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
      className="min-h-screen flex items-center justify-center text-white px-6"
      onClick={goToAuth}
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,6,23,0.6), rgba(3,6,23,0.6)), url('/versus-hero.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="w-full max-w-4xl text-center select-none">
        <div className="mx-auto mb-6 w-full max-w-md">
          {/* subtle frame over the background to help text legibility */}
          <div className="rounded-2xl p-6 backdrop-blur-sm bg-black/30 border border-white/6 shadow-2xl">
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-none mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-fuchsia-300">
                VERSUS III
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-200/90 max-w-xl mx-auto">
              Minimal tactical duels — local & online. Fast matches, deep decisions.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl p-8 backdrop-blur-lg bg-gradient-to-t from-black/40 to-black/20 border border-white/6 shadow-xl">
            <div className="flex flex-col items-center gap-6">
              {/* Decorative small logo (keeps page light) */}
              <svg viewBox="0 0 120 120" className="w-20 h-20" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <defs>
                  <linearGradient id="lg1" x1="0" x2="1">
                    <stop offset="0" stopColor="#7c3aed" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                  <radialGradient id="rg1" cx="30%" cy="20%" r="80%">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect x="6" y="6" width="108" height="108" rx="18" fill="url(#lg1)" opacity="0.12" />
                <rect x="10" y="10" width="100" height="100" rx="14" fill="black" opacity="0.18" />
                <circle cx="34" cy="28" r="20" fill="url(#rg1)" opacity="0.14" />
                <g transform="translate(10,8)" fill="none" stroke="url(#lg1)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 66 L32 20 L52 66" />
                </g>
                <g transform="translate(68,24)" fill="url(#lg1)">
                  <rect x="0" y="10" width="5" height="44" rx="2" />
                  <rect x="10" y="10" width="5" height="44" rx="2" />
                  <rect x="20" y="10" width="5" height="44" rx="2" />
                </g>
              </svg>

              <div className="text-center">
                <p className="text-xs md:text-sm text-slate-300 mb-2">
                  Touch the screen or press any key to continue
                </p>

                <div className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/6 border border-white/6 text-sm text-slate-100">
                  <span className="animate-pulse">» press any key • touch</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Click or tap anywhere to continue — you will be taken to the nickname / login screen.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-pulse {
          animation: pulse 1.6s ease-in-out infinite;
        }
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          50% {
            opacity: 0.5;
            transform: translateY(3px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const handledRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let x = 0.5,
        y = 0.5;
      if (e instanceof TouchEvent && e.touches && e.touches[0]) {
        x = (e.touches[0].clientX - rect.left) / rect.width;
        y = (e.touches[0].clientY - rect.top) / rect.height;
      } else if (e instanceof MouseEvent) {
        x = (e.clientX - rect.left) / rect.width;
        y = (e.clientY - rect.top) / rect.height;
      }
      // clamp
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));
      el.style.setProperty("--px", String(x));
      el.style.setProperty("--py", String(y));
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
    };
  }, []);

  return (
    <main
      ref={containerRef}
      className="min-h-screen flex items-center justify-center text-white px-6 overflow-hidden"
      onClick={goToAuth}
      style={{
        backgroundImage:
          "linear-gradient(rgba(3,6,23,0.55), rgba(3,6,23,0.55)), url('/versus-hero.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        // css variables used by animations
        // --px / --py updated on pointer move
      }}
      aria-label="Landing page VERSUS III"
    >
      <div className="absolute inset-0 pointer-events-none">
        {/* moving gradient overlay */}
        <div className="absolute inset-0 animated-gradient" />
        {/* neon diagonal rays layer */}
        <div className="absolute inset-0 neon-rays" />
        {/* subtle vignette */}
        <div className="absolute inset-0 vignette" />
        {/* floating particles */}
        <div className="absolute inset-0 particles" />
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center select-none px-4 py-12">
        <div className="mx-auto mb-6 w-full max-w-2xl">
          <div className="rounded-3xl p-8 backdrop-blur-md bg-black/30 border border-white/6 shadow-2xl">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-fuchsia-300">
                VERSUS III
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-200/90 max-w-2xl mx-auto">
              Minimal tactical duels — local & online. Fast matches, deep decisions.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl p-6 backdrop-blur-sm bg-black/25 border border-white/6 shadow-lg">
            <div className="flex flex-col items-center gap-4">
              <svg viewBox="0 0 120 120" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <defs>
                  <linearGradient id="lg2" x1="0" x2="1">
                    <stop offset="0" stopColor="#06b6d4" />
                    <stop offset="1" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <rect x="10" y="10" width="100" height="100" rx="16" fill="black" opacity="0.18" />
                <g transform="translate(12,8)" fill="none" stroke="url(#lg2)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 68 L30 18 L50 68" />
                </g>
                <g transform="translate(72,24)" fill="url(#lg2)">
                  <rect x="0" y="10" width="4.5" height="44" rx="2" />
                  <rect x="9" y="10" width="4.5" height="44" rx="2" />
                  <rect x="18" y="10" width="4.5" height="44" rx="2" />
                </g>
              </svg>

              <div className="text-center">
                <p className="text-xs md:text-sm text-slate-300 mb-1">Touch the screen or press any key to continue</p>
                <div className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/6 border border-white/6 text-sm text-slate-100">
                  <span className="pulse">» press any key • touch</span>
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
        :root {
          --px: 0.5;
          --py: 0.5;
        }

        /* animated gradient overlay moves subtly with time and pointer */
        .animated-gradient {
          background: radial-gradient(1200px 600px at calc(var(--px) * 100%) calc(var(--py) * 100%), rgba(124,58,237,0.14), transparent 10%),
                      radial-gradient(900px 400px at calc((1 - var(--px)) * 100%) calc((1 - var(--py)) * 100%), rgba(236,72,153,0.10), transparent 12%);
          mix-blend-mode: overlay;
          animation: floatGrad 10s ease-in-out infinite;
          opacity: 0.95;
          transform: translateZ(0);
        }
        @keyframes floatGrad {
          0% { filter: hue-rotate(0deg) saturate(1); transform: translateY(0); }
          50% { filter: hue-rotate(12deg) saturate(1.05); transform: translateY(-8px); }
          100% { filter: hue-rotate(0deg) saturate(1); transform: translateY(0); }
        }

        /* neon diagonal rays: subtle motion across the screen */
        .neon-rays {
          background-image:
            linear-gradient(120deg, rgba(255,0,120,0.06) 0 2px, rgba(0,0,0,0) 2px 12px),
            linear-gradient(60deg, rgba(0,200,255,0.06) 0 2px, rgba(0,0,0,0) 2px 12px);
          background-size: 120% 120%;
          opacity: 0.9;
          mix-blend-mode: screen;
          animation: raysMove 8s linear infinite;
          transform: translateZ(0);
        }
        @keyframes raysMove {
          0% { background-position: 0% 0%; }
          100% { background-position: -40% 60%; }
        }

        /* vignette to focus center */
        .vignette {
          background: radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%);
          pointer-events: none;
        }

        /* particles layer - animated floating dots using CSS gradients */
        .particles {
          background-image:
            radial-gradient(circle at 10% 20%, rgba(255,255,255,0.06) 0 2px, transparent 3px),
            radial-gradient(circle at 80% 10%, rgba(255,255,255,0.04) 0 1.5px, transparent 3px),
            radial-gradient(circle at 40% 70%, rgba(255,255,255,0.03) 0 2px, transparent 3px),
            radial-gradient(circle at 70% 80%, rgba(255,255,255,0.02) 0 1.5px, transparent 3px);
          animation: particlesDrift 18s linear infinite;
          opacity: 0.9;
          mix-blend-mode: screen;
        }
        @keyframes particlesDrift {
          0% { transform: translateY(0) scale(1); opacity: 0.85; }
          50% { transform: translateY(-20px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 0.85; }
        }

        /* small pulsing text */
        .pulse {
          display: inline-block;
          animation: pulseText 1.6s ease-in-out infinite;
        }
        @keyframes pulseText {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(3px); opacity: 0.5; }
          100% { transform: translateY(0); opacity: 1; }
        }

        /* subtle blur/glow around the central card */
        .rounded-3xl {
          box-shadow: 0 8px 40px rgba(2,6,23,0.6), 0 2px 8px rgba(124,58,237,0.06);
        }

        /* performance note: keep animations GPU friendly */
        .animated-gradient,
        .neon-rays,
        .particles {
          will-change: transform, background-position, opacity;
          backface-visibility: hidden;
        }

        /* responsive tweaks */
        @media (max-width: 640px) {
          h1 { font-size: 2.25rem; }
        }
      `}</style>
    </main>
  );
}
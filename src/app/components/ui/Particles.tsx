"use client";
import { useEffect, useRef } from "react";

export function Particles() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!; // non-null assertion
    let w = (c.width = window.innerWidth);
    let h = (c.height = window.innerHeight);

    interface Dot {
      x: number; y: number; r: number; vx: number; vy: number;
    }
    const dots: Dot[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2,
      vx: -0.2 + Math.random() * 0.4,
      vy: -0.2 + Math.random() * 0.4,
    }));
    let run = true;

    function loop() {
      if (!run) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      dots.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = w;
        else if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        else if (d.y > h) d.y = 0;
        ctx.globalAlpha = 0.25 + Math.random() * 0.75;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(loop);
    }
    loop();

    const onResize = () => {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      run = false;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 opacity-40 mix-blend-screen"
      aria-hidden="true"
    />
  );
}
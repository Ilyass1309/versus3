"use client";
export function Logo({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      aria-label="Game Logo"
      role="img"
    >
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#g)" stroke="#fff4" strokeWidth="4" />
      <path
        d="M48 85V35l24 12-18 10 20 10-26 18z"
        fill="#fff"
        fillOpacity=".9"
      />
    </svg>
  );
}
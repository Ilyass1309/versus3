"use client";
import clsx from "clsx";

export function Badge({ children, color = "indigo" }: { children: React.ReactNode; color?: "indigo" | "red" | "green" | "gray" }) {
  const map: Record<string,string> = {
    indigo: "bg-indigo-600/80 text-indigo-50",
    red: "bg-red-600/80 text-red-50",
    green: "bg-emerald-600/80 text-emerald-50",
    gray: "bg-slate-600/80 text-slate-100",
  };
  return (
    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium tracking-wide", map[color])}>
      {children}
    </span>
  );
}
"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

export function StatsCard({
  title,
  value,
  icon,
  footer,
  className = "",
}: {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border border-white/10 bg-white/5 dark:bg-slate-900/40 backdrop-blur px-5 py-4 shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">{title}</p>
          <div className="text-xl font-semibold text-slate-100">{value}</div>
        </div>
        {icon && <div className="text-slate-300">{icon}</div>}
      </div>
      {footer && <div className="mt-3 text-[11px] text-slate-400">{footer}</div>}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5" />
    </motion.div>
  );
}
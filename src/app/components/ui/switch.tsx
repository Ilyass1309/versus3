"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";

export function Switch({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange(v: boolean): void; label?: string; }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      {label && <span>{label}</span>}
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 bg-slate-600 data-[state=checked]:bg-indigo-600 transition focus-visible:outline-none focus-visible:ring-2 ring-indigo-400"
      >
        <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-[22px]" />
      </SwitchPrimitive.Root>
    </label>
  );
}
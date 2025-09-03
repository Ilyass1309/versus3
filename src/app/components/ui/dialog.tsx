"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 w-[min(95vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-slate-800/90 p-6 shadow-2xl focus:outline-none">
        <div className="flex items-start justify-between mb-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <DialogPrimitive.Close
            aria-label="Fermer"
            className="p-1 rounded hover:bg-white/10 text-slate-300"
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
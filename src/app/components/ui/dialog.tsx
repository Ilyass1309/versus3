"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import React from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  /** Id base facultatif si plusieurs descriptions dynamiques */
  idBase?: string;
  className?: string;
}

export function DialogContent({
  children,
  title,
  description,
  idBase = "dialog",
  className = "",
}: DialogContentProps) {
  const descId = description ? `${idBase}-desc` : undefined;
  return (
    <DialogPortal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
      <DialogPrimitive.Content
        aria-describedby={descId}
        className={`fixed left-1/2 top-1/2 w-[min(95vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-slate-800/90 p-6 shadow-2xl focus:outline-none ${className}`}
      >
        <div className="flex items-start justify-between mb-4">
          {title ? (
            <DialogPrimitive.Title className="text-lg font-semibold">
              {title}
            </DialogPrimitive.Title>
          ) : (
            <VisuallyHidden>
              <DialogPrimitive.Title>Dialogue</DialogPrimitive.Title>
            </VisuallyHidden>
          )}
          <DialogPrimitive.Close
            aria-label="Fermer"
            className="p-1 rounded hover:bg-white/10 text-slate-300"
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </div>
        {description && (
          <p id={descId} className="sr-only">
            {description}
          </p>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
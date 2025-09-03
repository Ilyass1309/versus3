"use client";
import * as SliderPrimitive from "@radix-ui/react-slider";

export function Slider({ value, onValueChange, min = 0, max = 1, step = 0.01 }: {
  value: number[];
  onValueChange: (v: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <SliderPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      className="relative flex h-5 w-full touch-none select-none items-center"
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/15">
        <SliderPrimitive.Range className="absolute h-full bg-indigo-500" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="slider-thumb"
        className="block h-4 w-4 rounded-full bg-indigo-400 ring-2 ring-white/30 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
    </SliderPrimitive.Root>
  );
}
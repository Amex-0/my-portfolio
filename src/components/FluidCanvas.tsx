"use client";

import { useRef } from "react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import { useFluidSimulation } from "@/hooks/useFluidSimulation";

export default function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useFluidSimulation(canvasRef);
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 block h-full w-full"
      aria-hidden
    />
  );
}

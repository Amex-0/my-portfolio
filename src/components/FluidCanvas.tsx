"use client";

import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import { useFluidSimulation } from "@/hooks/useFluidSimulation";

export default function FluidCanvas() {
  const canvasRef = useFluidSimulation();
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

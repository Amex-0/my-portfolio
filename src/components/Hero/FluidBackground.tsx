"use client";

import FluidCanvas from "@/components/FluidCanvas";
import { FLUID_BACKGROUND } from "@/hooks/useFluidSimulation";

export default function FluidBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: FLUID_BACKGROUND.base }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% -10%, ${FLUID_BACKGROUND.accent}, transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 95%, rgba(70, 45, 110, 0.08), transparent 45%),
            radial-gradient(circle at center, transparent 28%, ${FLUID_BACKGROUND.vignette} 100%)
          `,
        }}
      />
      <FluidCanvas />
    </div>
  );
}

"use client";

import FluidCanvas from "@/components/FluidCanvas";

const FLUID_BACKGROUND = {
  base: "#040507",
  vignette: "#07110d",
  emerald: "rgba(16, 185, 129, 0.16)",
  mint: "rgba(110, 231, 183, 0.1)",
  halo: "rgba(6, 78, 59, 0.14)",
} as const;

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
            radial-gradient(ellipse 90% 60% at 50% -10%, ${FLUID_BACKGROUND.emerald}, transparent 55%),
            radial-gradient(ellipse 68% 50% at 84% 94%, ${FLUID_BACKGROUND.mint}, transparent 46%),
            radial-gradient(ellipse 72% 46% at 14% 96%, ${FLUID_BACKGROUND.halo}, transparent 48%),
            radial-gradient(circle at center, transparent 28%, ${FLUID_BACKGROUND.vignette} 100%)
          `,
        }}
      />
      <FluidCanvas />
    </div>
  );
}

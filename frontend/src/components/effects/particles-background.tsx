"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export function ParticlesBackground() {
  return (
    <ParticlesProvider init={loadSlim}>
      <Particles
        id="background-particles"
        className="pointer-events-none absolute inset-0"
        options={{
          fullScreen: { enable: false },
          background: { color: "transparent" },
          particles: {
            number: { value: 40 },
            size: { value: 2 },
            opacity: { value: 0.25 },
            color: { value: "#888888" },
            links: { enable: true, opacity: 0.15, color: "#888888" },
            move: { enable: true, speed: 0.6 },
          },
        }}
      />
    </ParticlesProvider>
  );
}

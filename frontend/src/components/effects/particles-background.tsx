"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

export function ParticlesBackground() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Media preferences are browser-only; keep the server and first render identical.
  if (!mounted || reduceMotion) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40">
      <ParticlesProvider init={loadSlim}>
        <Particles
          id="background-particles"
          className="pointer-events-none absolute inset-0"
          options={{
            fpsLimit: 30,
            fullScreen: { enable: false },
            background: { color: "transparent" },
            particles: {
              number: { value: 16 },
              size: { value: 1.5 },
              opacity: { value: 0.2 },
              color: { value: "#5d9385" },
              links: { enable: true, opacity: 0.08, color: "#5d9385" },
              move: { enable: true, speed: 0.25 },
            },
          }}
        />
      </ParticlesProvider>
    </div>
  );
}

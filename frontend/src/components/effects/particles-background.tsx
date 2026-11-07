"use client";

import type { ISourceOptions } from "@tsparticles/engine";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { StageKey } from "@/lib/stages";

export type BackdropVariant = StageKey | "home" | "dashboard" | "guide" | "new";

const COLORS = {
  saffron: "#f2b05e",
  ocean: "#5fb3e4",
  orchid: "#b79cf2",
  coral: "#f2836b",
  mint: "#7fd8b9",
  paypal: "#6f9dff",
};

interface Look {
  glow: string;
  options: ISourceOptions;
}

const base = (count: number): ISourceOptions => ({
  fpsLimit: 40,
  fullScreen: { enable: false },
  background: { color: "transparent" },
  detectRetina: true,
  particles: { number: { value: count, density: { enable: true } } },
});

function merge(count: number, particles: Record<string, unknown>): ISourceOptions {
  const start = base(count);
  return { ...start, particles: { ...(start.particles as object), ...particles } };
}

const LOOKS: Record<BackdropVariant, Look> = {
  home: {
    glow: COLORS.ocean,
    options: merge(46, {
      color: { value: [COLORS.saffron, COLORS.ocean, COLORS.mint] },
      size: { value: { min: 1, max: 2.6 } },
      opacity: { value: { min: 0.25, max: 0.7 } },
      links: { enable: true, distance: 140, opacity: 0.16, color: COLORS.ocean },
      move: { enable: true, speed: 0.5, direction: "right", outModes: { default: "out" } },
    }),
  },
  guide: {
    glow: COLORS.saffron,
    options: merge(30, {
      color: { value: [COLORS.saffron, COLORS.orchid, COLORS.ocean, COLORS.mint] },
      size: { value: { min: 2, max: 5 } },
      opacity: { value: { min: 0.08, max: 0.35 }, animation: { enable: true, speed: 0.4 } },
      move: { enable: true, speed: 0.35, direction: "top", outModes: { default: "out" } },
    }),
  },
  dashboard: {
    glow: COLORS.mint,
    options: merge(40, {
      color: { value: [COLORS.mint, COLORS.ocean] },
      size: { value: { min: 1, max: 2 } },
      opacity: { value: 0.45 },
      links: { enable: true, distance: 120, opacity: 0.14, color: COLORS.mint },
      move: { enable: true, speed: 0.3 },
    }),
  },
  new: {
    glow: COLORS.orchid,
    options: merge(36, {
      color: { value: [COLORS.orchid, COLORS.saffron] },
      size: { value: { min: 1, max: 2.4 } },
      opacity: { value: 0.5 },
      links: { enable: true, distance: 130, opacity: 0.18, color: COLORS.orchid },
      move: { enable: true, speed: 0.45 },
    }),
  },
  negotiate: {
    glow: COLORS.orchid,
    options: merge(36, {
      color: { value: [COLORS.orchid, COLORS.saffron] },
      size: { value: { min: 1, max: 2.4 } },
      opacity: { value: 0.5 },
      links: { enable: true, distance: 130, opacity: 0.18, color: COLORS.orchid },
      move: { enable: true, speed: 0.45 },
    }),
  },
  approve: {
    glow: COLORS.saffron,
    options: merge(34, {
      color: { value: [COLORS.saffron, "#ffe2b3"] },
      shape: { type: "star" },
      size: { value: { min: 1.5, max: 3.5 } },
      opacity: { value: { min: 0.1, max: 0.8 }, animation: { enable: true, speed: 0.8 } },
      move: { enable: true, speed: 0.15 },
    }),
  },
  deposit: {
    glow: COLORS.paypal,
    options: merge(26, {
      color: { value: [COLORS.paypal, "#a9c4ff"] },
      shape: { type: "circle" },
      size: { value: { min: 3, max: 7 } },
      opacity: { value: { min: 0.15, max: 0.45 } },
      stroke: { width: 1, color: { value: "#cfdcff" } },
      move: { enable: true, speed: 0.8, direction: "top", outModes: { default: "out" } },
    }),
  },
  ship: {
    glow: COLORS.saffron,
    options: merge(24, {
      color: { value: [COLORS.saffron, "#c98b3d"] },
      shape: { type: "square" },
      size: { value: { min: 3, max: 7 } },
      opacity: { value: { min: 0.15, max: 0.4 } },
      rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 3 } },
      move: { enable: true, speed: 0.6, direction: "right", outModes: { default: "out" } },
    }),
  },
  balance: {
    glow: COLORS.paypal,
    options: merge(26, {
      color: { value: [COLORS.paypal, COLORS.mint] },
      shape: { type: "circle" },
      size: { value: { min: 3, max: 7 } },
      opacity: { value: { min: 0.15, max: 0.45 } },
      stroke: { width: 1, color: { value: "#cfdcff" } },
      move: { enable: true, speed: 0.8, direction: "top", outModes: { default: "out" } },
    }),
  },
  track: {
    glow: COLORS.ocean,
    options: merge(60, {
      color: { value: [COLORS.ocean, "#9fd5f5"] },
      size: { value: { min: 0.8, max: 2 } },
      opacity: { value: { min: 0.2, max: 0.6 } },
      move: { enable: true, speed: 1.4, direction: "right", straight: true, outModes: { default: "out" } },
    }),
  },
  inspect: {
    glow: COLORS.coral,
    options: merge(30, {
      color: { value: [COLORS.coral, COLORS.saffron] },
      size: { value: { min: 1, max: 3 } },
      opacity: { value: { min: 0.15, max: 0.6 }, animation: { enable: true, speed: 0.6 } },
      links: { enable: true, distance: 110, opacity: 0.12, color: COLORS.coral },
      move: { enable: true, speed: 0.25 },
    }),
  },
  settled: {
    glow: COLORS.mint,
    options: merge(40, {
      color: { value: [COLORS.mint, COLORS.saffron, COLORS.ocean, COLORS.orchid, COLORS.paypal] },
      shape: { type: ["square", "circle", "star"] },
      size: { value: { min: 2, max: 4.5 } },
      opacity: { value: { min: 0.3, max: 0.75 } },
      rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 6 } },
      move: { enable: true, speed: 0.9, direction: "bottom", outModes: { default: "out" } },
    }),
  },
  no_deal: {
    glow: COLORS.coral,
    options: merge(20, {
      color: { value: COLORS.coral },
      size: { value: { min: 1, max: 2 } },
      opacity: { value: 0.3 },
      move: { enable: true, speed: 0.15 },
    }),
  },
};

/** Fixed, decorative background for a page or deal stage. Hidden with reduced motion. */
export function ParticlesBackground({ variant = "home" }: { variant?: BackdropVariant }) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [small, setSmall] = useState(false);
  useEffect(() => {
    setMounted(true);
    setSmall(window.innerWidth < 640);
  }, []);

  const look = LOOKS[variant];
  const options = useMemo<ISourceOptions>(() => {
    if (!small) return look.options;
    const particles = look.options.particles as { number: { value: number } };
    return {
      ...look.options,
      particles: { ...particles, number: { ...particles.number, value: Math.ceil(particles.number.value / 2) } },
    };
  }, [look, small]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{
          background: `radial-gradient(55rem 32rem at 90% -10%, ${look.glow}26, transparent 70%), radial-gradient(40rem 28rem at -5% 105%, ${look.glow}1a, transparent 70%)`,
        }}
      />
      {mounted && !reduceMotion && (
        <ParticlesProvider init={loadSlim}>
          <Particles
            key={`${variant}-${small}`}
            id="background-particles"
            className="absolute inset-0"
            options={options}
          />
        </ParticlesProvider>
      )}
    </div>
  );
}

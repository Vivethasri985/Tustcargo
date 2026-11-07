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

interface Network {
  nodes: string[];
  link: string;
  count?: number;
  distance?: number;
  speed?: number;
  direction?: "none" | "top" | "right" | "bottom";
  triangles?: boolean;
  linkOpacity?: number;
}

/** A drifting web of nodes and links, like a neural network. */
function network({
  nodes,
  link,
  count = 70,
  distance = 150,
  speed = 0.5,
  direction = "none",
  triangles = false,
  linkOpacity = 0.28,
}: Network): ISourceOptions {
  return {
    fpsLimit: 50,
    fullScreen: { enable: false },
    background: { color: "transparent" },
    detectRetina: true,
    interactivity: {
      detectsOn: "window",
      events: { onHover: { enable: true, mode: "grab" }, resize: { enable: true } },
      modes: { grab: { distance: 190, links: { opacity: 0.65, color: link } } },
    },
    particles: {
      number: { value: count, density: { enable: true } },
      color: { value: nodes },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 3.2 }, animation: { enable: true, speed: 1.5, sync: false } },
      opacity: { value: { min: 0.35, max: 0.9 }, animation: { enable: true, speed: 0.7, sync: false } },
      links: {
        enable: true,
        distance,
        color: link,
        opacity: linkOpacity,
        width: 1,
        triangles: { enable: triangles, color: link, opacity: 0.035 },
      },
      move: {
        enable: true,
        speed,
        direction,
        random: direction === "none",
        straight: false,
        outModes: { default: direction === "none" ? "bounce" : "out" },
      },
    },
  };
}

const LOOKS: Record<BackdropVariant, Look> = {
  home: {
    glow: COLORS.ocean,
    options: network({ nodes: [COLORS.saffron, COLORS.ocean, COLORS.mint, COLORS.orchid], link: COLORS.ocean, count: 80, triangles: true }),
  },
  guide: {
    glow: COLORS.saffron,
    options: network({ nodes: [COLORS.saffron, COLORS.orchid, COLORS.ocean], link: COLORS.saffron, count: 60, speed: 0.35 }),
  },
  dashboard: {
    glow: COLORS.mint,
    options: network({ nodes: [COLORS.mint, COLORS.ocean], link: COLORS.mint, count: 65, speed: 0.35 }),
  },
  new: {
    glow: COLORS.orchid,
    options: network({ nodes: [COLORS.orchid, COLORS.saffron, COLORS.ocean], link: COLORS.orchid, count: 70, triangles: true }),
  },
  negotiate: {
    glow: COLORS.orchid,
    options: network({ nodes: [COLORS.orchid, COLORS.saffron, COLORS.ocean], link: COLORS.orchid, count: 70, triangles: true }),
  },
  approve: {
    glow: COLORS.saffron,
    options: network({ nodes: [COLORS.saffron, "#ffe2b3"], link: COLORS.saffron, count: 55, speed: 0.3, distance: 170 }),
  },
  deposit: {
    glow: COLORS.paypal,
    options: network({ nodes: [COLORS.paypal, "#a9c4ff"], link: COLORS.paypal, count: 65, speed: 0.6, direction: "top" }),
  },
  ship: {
    glow: COLORS.saffron,
    options: network({ nodes: [COLORS.saffron, COLORS.ocean], link: COLORS.saffron, count: 60, speed: 0.6, direction: "right" }),
  },
  balance: {
    glow: COLORS.paypal,
    options: network({ nodes: [COLORS.paypal, COLORS.mint], link: COLORS.paypal, count: 65, speed: 0.6, direction: "top" }),
  },
  track: {
    glow: COLORS.ocean,
    options: network({ nodes: [COLORS.ocean, "#9fd5f5"], link: COLORS.ocean, count: 80, speed: 1.1, direction: "right", distance: 130 }),
  },
  inspect: {
    glow: COLORS.coral,
    options: network({ nodes: [COLORS.coral, COLORS.saffron], link: COLORS.coral, count: 55, speed: 0.3, distance: 160 }),
  },
  settled: {
    glow: COLORS.mint,
    options: network({ nodes: [COLORS.mint, COLORS.saffron, COLORS.ocean, COLORS.orchid, COLORS.paypal], link: COLORS.mint, count: 75, triangles: true, speed: 0.4 }),
  },
  no_deal: {
    glow: COLORS.coral,
    options: network({ nodes: [COLORS.coral], link: COLORS.coral, count: 35, speed: 0.2, linkOpacity: 0.18 }),
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

import { useEffect, useMemo, useRef } from "react";
import type { MemoryEdge, MemoryNode } from "@/lib/aduf-types";
import { cn } from "@/lib/utils";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Placed {
  node: MemoryNode;
  base: Vec3; // unit-sphere position in object space (nucleus = origin)
  isCore: boolean;
}

interface ScreenPos {
  x: number;
  y: number;
  scale: number;
  z: number;
}

// How strongly perspective bends near/far points — higher = flatter, lower = fisheye.
const PERSPECTIVE = 2.4;
// Fixed 3/4 tilt so the globe never reads as a flat spinning disc.
const TILT = 0.36;
const AUTO_ROTATE_SPEED = 0.16; // rad/s
const RING_SEGMENTS = 40;

const GROUP_COLOR: Record<MemoryNode["group"], string> = {
  core: "oklch(1 0 0 / 95%)",
  customers: "var(--chart-2)",
  products: "var(--chart-3)",
  revenue: "var(--chart-1)",
  traffic: "var(--chart-4)",
};

function rotateY(p: Vec3, a: number): Vec3 {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return { x: p.x * c + p.z * s, y: p.y, z: p.z * c - p.x * s };
}

function rotateX(p: Vec3, a: number): Vec3 {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

/** Deterministic (SSR-safe) even distribution of `total` points on a unit sphere. */
function fibonacciPoint(index: number, total: number): Vec3 {
  if (total <= 1) return { x: 1, y: 0, z: 0 };
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * index;
  return { x: Math.cos(theta) * radiusAtY, y, z: Math.sin(theta) * radiusAtY };
}

function latitudeRing(deg: number): Vec3[] {
  const phi = (deg * Math.PI) / 180;
  const r = Math.cos(phi);
  const y = Math.sin(phi);
  const pts: Vec3[] = [];
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const t = (i / RING_SEGMENTS) * Math.PI * 2;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r });
  }
  return pts;
}

function longitudeRing(deg: number): Vec3[] {
  const theta = (deg * Math.PI) / 180;
  const pts: Vec3[] = [];
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const t = (i / RING_SEGMENTS) * Math.PI * 2;
    pts.push({
      x: Math.cos(t) * Math.cos(theta),
      y: Math.sin(t),
      z: Math.cos(t) * Math.sin(theta),
    });
  }
  return pts;
}

const LAT_RINGS = [-60, -30, 0, 30, 60].map(latitudeRing);
const LON_RINGS = [0, 30, 60, 90, 120, 150].map(longitudeRing);

/**
 * A rotating 3D wireframe globe: memory nodes sit on (or, for the core
 * node, at the center of) a sphere, joined by glowing "bond" lines. Pure
 * CSS/SVG + rAF — no 3D library. Auto-rotates and responds to drag.
 */
export function MemoryGlobe({
  nodes,
  edges,
  focus,
  onFocus,
}: {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  focus: string | null;
  onFocus: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
  const edgeRefs = useRef(new Map<string, SVGLineElement>());
  const edgeGlowRefs = useRef(new Map<string, SVGLineElement>());
  const latRefs = useRef<SVGPathElement[]>([]);
  const lonRefs = useRef<SVGPathElement[]>([]);

  const placed = useMemo<Placed[]>(() => {
    const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const nucleus = sorted.find((n) => n.group === "core") ?? null;
    const satellites = sorted.filter((n) => n !== nucleus);
    const out: Placed[] = [];
    if (nucleus) out.push({ node: nucleus, base: { x: 0, y: 0, z: 0 }, isCore: true });
    satellites.forEach((node, i) => {
      out.push({ node, base: fibonacciPoint(i, satellites.length), isCore: false });
    });
    return out;
  }, [nodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();
    let autoYaw = 0;
    let manualYaw = 0;
    let dragging = false;
    let dragStartX = 0;
    let dragYawStart = 0;
    const posById = new Map<string, ScreenPos>();

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging && !prefersReduced) autoYaw += dt * AUTO_ROTATE_SPEED;
      const yaw = autoYaw + manualYaw;

      const rect = container!.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const minDim = Math.min(rect.width, rect.height);
      const maxScale = PERSPECTIVE / (PERSPECTIVE - 1);
      const margin = 48; // reserves room for chip half-width + glow so nothing clips the frame
      const pxPerUnit = Math.max(30, Math.min(190, (minDim / 2 - margin) / maxScale));

      posById.clear();

      for (const p of placed) {
        let sx: number;
        let sy: number;
        let scale: number;
        let z: number;
        if (p.isCore) {
          sx = cx;
          sy = cy;
          scale = 1;
          z = 0;
        } else {
          let v = rotateY(p.base, yaw);
          v = rotateX(v, TILT);
          scale = PERSPECTIVE / (PERSPECTIVE - v.z);
          sx = cx + v.x * pxPerUnit * scale;
          sy = cy - v.y * pxPerUnit * scale;
          z = v.z;
        }
        posById.set(p.node.id, { x: sx, y: sy, scale, z });
        const el = nodeRefs.current.get(p.node.id);
        if (el) {
          el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${scale})`;
          el.style.opacity = p.isCore ? "1" : String(0.4 + 0.6 * ((z + 1) / 2));
          el.style.zIndex = String(Math.round(scale * 1000));
        }
      }

      for (const edge of edges) {
        const a = posById.get(edge.from);
        const b = posById.get(edge.to);
        const line = edgeRefs.current.get(`${edge.from}-${edge.to}`);
        const glow = edgeGlowRefs.current.get(`${edge.from}-${edge.to}`);
        if (!a || !b) continue;
        const depth = (a.z + b.z) / 2; // -1 (far) .. 1 (near)
        const opacity = 0.28 + 0.55 * ((depth + 1) / 2);
        for (const el of [line, glow]) {
          if (!el) continue;
          el.setAttribute("x1", String(a.x));
          el.setAttribute("y1", String(a.y));
          el.setAttribute("x2", String(b.x));
          el.setAttribute("y2", String(b.y));
        }
        if (line) line.setAttribute("stroke-opacity", String(opacity));
        if (glow) glow.setAttribute("stroke-opacity", String(opacity * 0.35));
      }

      const projectRing = (ring: Vec3[]) => {
        let d = "";
        for (let i = 0; i < ring.length; i++) {
          const point = ring[i];
          if (!point) continue;
          let v = rotateY(point, yaw);
          v = rotateX(v, TILT);
          const scale = PERSPECTIVE / (PERSPECTIVE - v.z);
          const sx = cx + v.x * pxPerUnit * scale;
          const sy = cy - v.y * pxPerUnit * scale;
          d += `${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)} `;
        }
        return d;
      };

      latRefs.current.forEach((el, i) => {
        const ring = LAT_RINGS[i];
        if (ring) el.setAttribute("d", projectRing(ring));
      });
      lonRefs.current.forEach((el, i) => {
        const ring = LON_RINGS[i];
        if (ring) el.setAttribute("d", projectRing(ring));
      });

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    function onPointerDown(ev: PointerEvent) {
      if ((ev.target as HTMLElement).closest("[data-globe-node]")) return;
      dragging = true;
      dragStartX = ev.clientX;
      dragYawStart = manualYaw;
      container!.setPointerCapture(ev.pointerId);
    }
    function onPointerMove(ev: PointerEvent) {
      if (!dragging) return;
      manualYaw = dragYawStart + (ev.clientX - dragStartX) * 0.008;
    }
    function onPointerUp(ev: PointerEvent) {
      dragging = false;
      try {
        container!.releasePointerCapture(ev.pointerId);
      } catch {
        // pointer capture may already be released — safe to ignore
      }
    }

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [placed, edges]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full touch-none overflow-hidden rounded-2xl sm:aspect-[4/3]"
    >
      {/* Ambient volumetric glow behind the sphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(closest-side, oklch(1 0 0 / 8%), transparent 72%)",
        }}
      />
      {/* Hologram projector base */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] bottom-[6%] h-6 rounded-[50%] opacity-30 blur-md"
        style={{ background: "radial-gradient(ellipse, var(--cyan), transparent 70%)" }}
      />

      <svg ref={svgRef} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <filter id="globe-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        {/* wireframe sphere */}
        <g stroke="var(--cyan)" fill="none" strokeWidth={0.6}>
          {LAT_RINGS.map((_, i) => (
            <path
              key={`lat-${i}`}
              ref={(el) => {
                if (el) latRefs.current[i] = el;
              }}
              strokeOpacity={0.16}
            />
          ))}
          {LON_RINGS.map((_, i) => (
            <path
              key={`lon-${i}`}
              ref={(el) => {
                if (el) lonRefs.current[i] = el;
              }}
              strokeOpacity={0.16}
            />
          ))}
        </g>

        {/* atomic bonds */}
        <g strokeLinecap="round">
          {edges.map((e) => {
            const key = `${e.from}-${e.to}`;
            return (
              <line
                key={`glow-${key}`}
                ref={(el) => {
                  if (el) edgeGlowRefs.current.set(key, el);
                }}
                stroke="var(--cyan)"
                strokeWidth={4}
                filter="url(#globe-blur)"
              />
            );
          })}
          {edges.map((e) => {
            const key = `${e.from}-${e.to}`;
            return (
              <line
                key={key}
                ref={(el) => {
                  if (el) edgeRefs.current.set(key, el);
                }}
                stroke="oklch(1 0 0 / 90%)"
                strokeWidth={1}
              />
            );
          })}
        </g>
      </svg>

      {placed.map((p) => {
        const size = p.isCore ? 100 : 58;
        const color = GROUP_COLOR[p.node.group];
        return (
          <button
            key={p.node.id}
            type="button"
            data-globe-node
            ref={(el) => {
              if (el) nodeRefs.current.set(p.node.id, el);
              else nodeRefs.current.delete(p.node.id);
            }}
            onClick={() => onFocus(p.node.id)}
            className={cn(
              "glass absolute left-0 top-0 grid place-items-center rounded-full px-2 text-center transition-opacity duration-300",
              p.isCore && "animate-nucleus-pulse",
            )}
            style={{
              width: size,
              height: size,
              opacity: 0,
              boxShadow:
                focus === p.node.id
                  ? "var(--shadow-glass), var(--glow-cyan)"
                  : `var(--shadow-glass), 0 0 0 1px color-mix(in oklab, ${color} 55%, transparent) inset`,
            }}
          >
            <span className="block truncate font-display text-[11px] font-semibold">
              {p.node.label}
            </span>
            <span className="block text-[10px] text-muted-foreground">
              {p.node.facts.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

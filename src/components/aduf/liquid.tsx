import { motion } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Builds a seamless, tileable wave path: alternating up/down bezier bumps
 *  that return to `baseline` every half period, so the shape can be laid
 *  side-by-side with a copy of itself with no visible seam. */
function wavePath(
  width: number,
  height: number,
  baseline: number,
  amplitude: number,
  period: number,
) {
  const half = period / 2;
  let d = `M0,${baseline}`;
  let x = 0;
  let crestUp = true;
  while (x < width) {
    const next = x + half;
    const c1 = x + half * 0.33;
    const c2 = x + half * 0.67;
    const y = crestUp ? baseline - amplitude : baseline + amplitude;
    d += ` C${c1},${y} ${c2},${y} ${next},${baseline}`;
    x = next;
    crestUp = !crestUp;
  }
  return `${d} L${width},${height} L0,${height} Z`;
}

const WAVE_W = 1440;
const WAVE_H = 260;
const backPath = wavePath(WAVE_W, WAVE_H, 150, 26, 480);
const midPath = wavePath(WAVE_W, WAVE_H, 130, 20, 360);
const frontPath = wavePath(WAVE_W, WAVE_H, 110, 14, 288);

/** One flowing layer: the wave tiled twice inside a 200%-wide track that
 *  scrolls a full tile-width (-50%) on a linear loop, so the motion never
 *  stutters or resets visibly. */
function RiverLayer({
  path,
  className,
  fill,
  reverse = false,
  duration,
}: {
  path: string;
  className?: string;
  fill: string;
  reverse?: boolean;
  duration?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 flex w-[200%]",
        reverse ? "animate-river-slow" : "animate-river",
        className,
      )}
      style={duration ? { animationDuration: duration } : undefined}
    >
      {[0, 1].map((i) => (
        <svg
          key={i}
          viewBox={`0 0 ${WAVE_W} ${WAVE_H}`}
          preserveAspectRatio="none"
          className="h-full w-1/2 shrink-0"
        >
          <path d={path} fill={fill} />
        </svg>
      ))}
    </div>
  );
}

/** Deterministic (SSR-safe — no Math.random) spray kicked up along the crest. */
const SPLASHES = [
  { left: "6%", delay: "0s", duration: "2.1s" },
  { left: "17%", delay: "1.3s", duration: "2.6s" },
  { left: "29%", delay: "0.6s", duration: "2.3s" },
  { left: "41%", delay: "1.9s", duration: "2.5s" },
  { left: "53%", delay: "0.2s", duration: "2.2s" },
  { left: "64%", delay: "1.1s", duration: "2.7s" },
  { left: "76%", delay: "0.8s", duration: "2.4s" },
  { left: "87%", delay: "1.6s", duration: "2.3s" },
  { left: "95%", delay: "0.4s", duration: "2.6s" },
] as const;

/** Animated ambience: a liquid glass "river" that never stops moving,
 *  layered waves crossing at different speeds plus flecks of spray off the
 *  crest. Pure CSS transforms — cheap and 60fps. */
export function LiquidBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div
        className="animate-drift absolute -left-40 top-[-10%] h-[70vh] w-[70vh] rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--cyan), transparent 65%)" }}
      />
      <div
        className="animate-drift absolute -right-32 top-[10%] h-[55vh] w-[55vh] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--violet), transparent 65%)",
          animationDelay: "-6s",
        }}
      />

      {/* River band, pinned to the bottom edge, fading into the background above. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38vh] min-h-[220px] overflow-hidden"
        style={{ maskImage: "linear-gradient(180deg, transparent, black 45%)" }}
      >
        <RiverLayer
          path={backPath}
          fill="color-mix(in oklab, var(--violet) 30%, transparent)"
          reverse
          duration="26s"
          className="opacity-40 blur-[1px]"
        />
        <RiverLayer
          path={midPath}
          fill="color-mix(in oklab, var(--cyan) 34%, transparent)"
          duration="18s"
          className="opacity-45"
        />
        <RiverLayer
          path={frontPath}
          fill="var(--gradient-water)"
          duration="12s"
          className="opacity-80"
        />

        {/* Spray off the crest */}
        <div className="absolute inset-x-0 top-[38%] h-0">
          {SPLASHES.map((s, i) => (
            <span
              key={i}
              className="animate-splash absolute h-1.5 w-1.5 rounded-full bg-cyan/80 blur-[0.5px]"
              style={{ left: s.left, animationDelay: s.delay, animationDuration: s.duration }}
            />
          ))}
        </div>
      </div>

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 22px, oklch(1 0 0 / 40%) 22px 23px)",
          maskImage: "radial-gradient(ellipse at 50% 40%, black, transparent 75%)",
        }}
      />
    </div>
  );
}

export function GlassCard({
  children,
  className,
  hover = true,
  delay = 0,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn("glass relative overflow-hidden p-5", hover && "glass-hover", className)}
      onClick={onClick}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
      />
      {children}
    </motion.div>
  );
}

/** Water-fill progress bar — the only loading/progress primitive in the app. */
export function WaterBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="tabular-nums text-foreground">{Math.round(value)}%</span>
        </div>
      ) : null}
      <div className="relative h-2.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="water-surface absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="animate-wave absolute inset-y-0 -right-4 w-8 bg-cyan/60 blur-sm" />
        </motion.div>
      </div>
    </div>
  );
}

/** Liquid skeleton — replaces spinners. */
export function LiquidSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-secondary", className)}>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--cyan) 35%, transparent), transparent)",
        }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/** Glass orb/bubble filled with water to `fill`%. Floats gently. */
export function WaterOrb({
  fill,
  size = 168,
  children,
  float = true,
  burst = false,
}: {
  fill: number;
  size?: number;
  children?: ReactNode;
  float?: boolean;
  burst?: boolean;
}) {
  const level = Math.min(100, Math.max(0, fill));
  return (
    <div
      className={cn("relative shrink-0", float && "animate-float")}
      style={{ width: size, height: size }}
    >
      <div className="glass relative h-full w-full overflow-hidden rounded-full">
        <motion.div
          className="absolute inset-x-0 bottom-0"
          initial={{ height: 0 }}
          animate={{ height: `${level}%` }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="water-surface absolute inset-0 opacity-80" />
          <div className="animate-wave absolute -top-2 left-0 h-4 w-[200%] rounded-full bg-cyan/50 blur-[2px]" />
        </motion.div>
        <div
          aria-hidden
          className="absolute left-[18%] top-[12%] h-[22%] w-[30%] rounded-full bg-white/25 blur-md"
        />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-3 text-center">
          {children}
        </div>
      </div>
      {burst ? (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan"
              animate={{
                x: Math.cos((i / 12) * Math.PI * 2) * size * 0.7,
                y: Math.sin((i / 12) * Math.PI * 2) * size * 0.7,
                opacity: [1, 0],
              }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.06 }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Slim circular progress ring — compact metric display for banners/dashboards,
 *  distinct from WaterOrb (which is the big hero liquid-fill primitive). */
export function ProgressRing({
  value,
  label,
  sublabel,
  size = 92,
  color = "var(--cyan)",
  dashed = false,
}: {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
  color?: string;
  dashed?: boolean;
}) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={dashed ? "3 5" : undefined}
          />
          {dashed ? null : (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
              transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center px-2 text-center">
          <span className="font-display text-sm font-semibold leading-none">{label}</span>
        </div>
      </div>
      {sublabel ? (
        <span className="max-w-[104px] truncate text-center text-[10px] text-muted-foreground">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

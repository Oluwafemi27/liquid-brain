import { motion } from "framer-motion";

/** A small, deterministic (no Math.random — stays identical between server
 *  and client render) revenue-trend line used purely for the looping demo
 *  animation below. Not real data — this is a marketing visual, not a
 *  dashboard, so it's intentionally never labelled as live numbers. */
const TREND = [18, 24, 21, 30, 27, 38, 34, 46, 42, 56, 51, 64];
const CHART_W = 560;
const CHART_H = 180;
const PAD = 16;

function pointsFor(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = (CHART_W - PAD * 2) / (values.length - 1);
  return values.map((v, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (1 - (v - min) / span) * (CHART_H - PAD * 2);
    return { x, y };
  });
}

const POINTS = pointsFor(TREND);
const LINE_PATH = POINTS.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
const AREA_PATH = `${LINE_PATH} L${POINTS[POINTS.length - 1]!.x},${CHART_H - PAD} L${POINTS[0]!.x},${CHART_H - PAD} Z`;

const LOOP_DURATION = 3.4;
const LOOP_PAUSE = 1.2;
const CYCLE = LOOP_DURATION + LOOP_PAUSE;

/** The 6 automation-grid channels, animated as bars that fill in while the
 *  line chart draws — same loop, so the whole card reads as one replaying
 *  clip of "a day in ADUF's automations" rather than two unrelated
 *  animations running side by side. */
const CHANNEL_BARS = [
  { label: "Web", height: 0.62 },
  { label: "WA", height: 0.88 },
  { label: "CRM", height: 0.45 },
  { label: "Pay", height: 0.95 },
  { label: "Ads", height: 0.58 },
  { label: "Mail", height: 0.72 },
];

/** A looping "replay" of the Analytics + Automation Grid in miniature —
 *  the line draws itself in, the playhead dot rides the tip, channel bars
 *  fill in sync, then the whole thing quietly resets and plays again. Pure
 *  SVG + framer-motion keyframes (no timers, no client-only state), so it
 *  renders identically on the server and never causes a hydration
 *  mismatch. */
export function AnimatedAnalyticsReplay() {
  return (
    <div className="glass relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--gradient-accent)", opacity: 0.5 }}
      />
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <motion.span
            className="absolute inset-0 rounded-full bg-cyan"
            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative h-2 w-2 rounded-full bg-cyan" />
        </span>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Analytics &amp; Automation — live preview
        </p>
      </div>

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Animated preview of a revenue trend climbing over time"
      >
        <defs>
          <linearGradient id="replay-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={CHART_W - PAD}
            y1={PAD + f * (CHART_H - PAD * 2)}
            y2={PAD + f * (CHART_H - PAD * 2)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}

        <motion.path
          d={AREA_PATH}
          fill="url(#replay-area)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0.9, 0.9, 0] }}
          transition={{
            duration: CYCLE,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.02, 0.55, 0.92, 1],
          }}
        />

        <motion.path
          d={LINE_PATH}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{
            duration: CYCLE,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.55, 0.92, 1],
          }}
        />

        {/* Playhead — rides the tip of the line as it draws, then fades for the reset. */}
        <motion.circle
          r={4.5}
          fill="var(--cyan)"
          animate={{
            cx: POINTS.map((p) => p.x),
            cy: POINTS.map((p) => p.y),
            opacity: [1, 1, 1, 0, 0],
          }}
          transition={{
            duration: CYCLE,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.55, 0.7, 0.75, 1],
          }}
        />
      </svg>

      {/* Channel activity bars — the Automation Grid side of the replay. */}
      <div className="mt-4 flex items-end gap-2.5 border-t border-border pt-4">
        {CHANNEL_BARS.map((bar, i) => (
          <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative h-16 w-full overflow-hidden rounded-md bg-white/6">
              <motion.div
                className="absolute inset-x-0 bottom-0 rounded-md"
                style={{
                  transformOrigin: "bottom",
                  background: "var(--gradient-accent)",
                  height: `${bar.height * 100}%`,
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: [0, 0, 1, 1, 0] }}
                transition={{
                  duration: CYCLE,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.08,
                  times: [0, 0.02, 0.5, 0.92, 1],
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

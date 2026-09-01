import { a as __toESM } from "../_runtime.mjs";
import { r as performance_default } from "../_libs/framer-motion+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as require_jsx_dev_runtime } from "../_libs/react.mjs";
import { T as Network, b as Plus, z as Database } from "../_libs/lucide-react.mjs";
import { _ as cn, b as useAduf, c as PageHeader, o as GlassCard, t as AppShell } from "./app-shell-CaedC11b.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/memory-CismZ05G.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_dev_runtime = require_jsx_dev_runtime();
var _jsxFileName$1 = "/root/app/code/src/components/aduf/memory-globe.tsx";
var PERSPECTIVE = 2.4;
var TILT = .36;
var AUTO_ROTATE_SPEED = .16;
var RING_SEGMENTS = 40;
var GROUP_COLOR = {
	core: "oklch(1 0 0 / 95%)",
	customers: "var(--chart-2)",
	products: "var(--chart-3)",
	revenue: "var(--chart-1)",
	traffic: "var(--chart-4)"
};
function rotateY(p, a) {
	const s = Math.sin(a);
	const c = Math.cos(a);
	return {
		x: p.x * c + p.z * s,
		y: p.y,
		z: p.z * c - p.x * s
	};
}
function rotateX(p, a) {
	const s = Math.sin(a);
	const c = Math.cos(a);
	return {
		x: p.x,
		y: p.y * c - p.z * s,
		z: p.y * s + p.z * c
	};
}
/** Deterministic (SSR-safe) even distribution of `total` points on a unit sphere. */
function fibonacciPoint(index, total) {
	if (total <= 1) return {
		x: 1,
		y: 0,
		z: 0
	};
	const golden = Math.PI * (3 - Math.sqrt(5));
	const y = 1 - index / (total - 1) * 2;
	const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
	const theta = golden * index;
	return {
		x: Math.cos(theta) * radiusAtY,
		y,
		z: Math.sin(theta) * radiusAtY
	};
}
function latitudeRing(deg) {
	const phi = deg * Math.PI / 180;
	const r = Math.cos(phi);
	const y = Math.sin(phi);
	const pts = [];
	for (let i = 0; i <= RING_SEGMENTS; i++) {
		const t = i / RING_SEGMENTS * Math.PI * 2;
		pts.push({
			x: Math.cos(t) * r,
			y,
			z: Math.sin(t) * r
		});
	}
	return pts;
}
function longitudeRing(deg) {
	const theta = deg * Math.PI / 180;
	const pts = [];
	for (let i = 0; i <= RING_SEGMENTS; i++) {
		const t = i / RING_SEGMENTS * Math.PI * 2;
		pts.push({
			x: Math.cos(t) * Math.cos(theta),
			y: Math.sin(t),
			z: Math.cos(t) * Math.sin(theta)
		});
	}
	return pts;
}
var LAT_RINGS = [
	-60,
	-30,
	0,
	30,
	60
].map(latitudeRing);
var LON_RINGS = [
	0,
	30,
	60,
	90,
	120,
	150
].map(longitudeRing);
var ORBIT_RINGS = [
	{
		width: 1.3,
		height: .52,
		phase: 0,
		direction: 1
	},
	{
		width: 1.2,
		height: .48,
		phase: Math.PI / 3,
		direction: -1
	},
	{
		width: 1.35,
		height: .4,
		phase: Math.PI * 2 / 3,
		direction: 1
	}
];
/**
* A rotating 3D wireframe globe: memory nodes sit on (or, for the core
* node, at the center of) a sphere, joined by glowing "bond" lines. Pure
* CSS/SVG + rAF — no 3D library. Auto-rotates and responds to drag.
*/
function MemoryGlobe({ nodes, edges, focus, onFocus }) {
	const containerRef = (0, import_react.useRef)(null);
	const svgRef = (0, import_react.useRef)(null);
	const nodeRefs = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const orbitRefs = (0, import_react.useRef)([]);
	const latRefs = (0, import_react.useRef)([]);
	const lonRefs = (0, import_react.useRef)([]);
	const placed = (0, import_react.useMemo)(() => {
		const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
		const nucleus = sorted.find((n) => n.group === "core") ?? null;
		const satellites = sorted.filter((n) => n !== nucleus);
		const out = [];
		if (nucleus) out.push({
			node: nucleus,
			base: {
				x: 0,
				y: 0,
				z: 0
			},
			isCore: true
		});
		satellites.forEach((node, i) => {
			out.push({
				node,
				base: fibonacciPoint(i, satellites.length),
				isCore: false
			});
		});
		return out;
	}, [nodes]);
	(0, import_react.useEffect)(() => {
		const container = containerRef.current;
		if (!container) return;
		const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		let raf = 0;
		let last = performance_default.now();
		let autoYaw = 0;
		let manualYaw = 0;
		let dragging = false;
		let dragStartX = 0;
		let dragYawStart = 0;
		const posById = /* @__PURE__ */ new Map();
		function frame(now) {
			const dt = Math.min(.05, (now - last) / 1e3);
			last = now;
			if (!dragging && !prefersReduced) autoYaw += dt * AUTO_ROTATE_SPEED;
			const yaw = autoYaw + manualYaw;
			const rect = container.getBoundingClientRect();
			const cx = rect.width / 2;
			const cy = rect.height / 2;
			const minDim = Math.min(rect.width, rect.height);
			const maxScale = PERSPECTIVE / (PERSPECTIVE - 1);
			const pxPerUnit = Math.max(30, Math.min(300, (minDim / 2 - 10) / maxScale));
			posById.clear();
			for (const p of placed) {
				let sx;
				let sy;
				let scale;
				let z;
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
				posById.set(p.node.id, {
					x: sx,
					y: sy,
					scale,
					z
				});
				const el = nodeRefs.current.get(p.node.id);
				if (el) {
					el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${scale})`;
					el.style.opacity = p.isCore ? "1" : String(.4 + .6 * ((z + 1) / 2));
					el.style.zIndex = String(Math.round(scale * 1e3));
				}
			}
			const projectOrbit = (width, height, rotation) => {
				let d = "";
				const sin = Math.sin(rotation);
				const cos = Math.cos(rotation);
				for (let i = 0; i <= RING_SEGMENTS; i++) {
					const t = i / RING_SEGMENTS * Math.PI * 2;
					const x = Math.cos(t) * width * pxPerUnit;
					const y = Math.sin(t) * height * pxPerUnit;
					const sx = cx + x * cos - y * sin;
					const sy = cy + x * sin + y * cos;
					d += `${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)} `;
				}
				return d;
			};
			orbitRefs.current.forEach((el, i) => {
				const orbit = ORBIT_RINGS[i];
				if (orbit) el.setAttribute("d", projectOrbit(orbit.width, orbit.height, orbit.phase + yaw * .35 * orbit.direction));
			});
			const projectGlobeRing = (ring) => {
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
				if (ring) el.setAttribute("d", projectGlobeRing(ring));
			});
			lonRefs.current.forEach((el, i) => {
				const ring = LON_RINGS[i];
				if (ring) el.setAttribute("d", projectGlobeRing(ring));
			});
			raf = requestAnimationFrame(frame);
		}
		raf = requestAnimationFrame(frame);
		function onPointerDown(ev) {
			if (ev.target.closest("[data-globe-node]")) return;
			dragging = true;
			dragStartX = ev.clientX;
			dragYawStart = manualYaw;
			container.setPointerCapture(ev.pointerId);
		}
		function onPointerMove(ev) {
			if (!dragging) return;
			manualYaw = dragYawStart + (ev.clientX - dragStartX) * .008;
		}
		function onPointerUp(ev) {
			dragging = false;
			try {
				container.releasePointerCapture(ev.pointerId);
			} catch {}
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
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		ref: containerRef,
		className: "relative aspect-square w-full touch-none overflow-hidden rounded-2xl sm:aspect-[4/3]",
		children: [
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				"aria-hidden": true,
				className: "pointer-events-none absolute inset-0",
				style: { background: "radial-gradient(closest-side, oklch(1 0 0 / 8%), transparent 72%)" }
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 309,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("img", {
				src: "https://cdn.builder.io/api/v1/image/assets%2F383f2020b40d46f681094fb49674d747%2F7bab7b0c417349c4b1f1e4a5d1501c09?format=webp&width=800&height=1200",
				alt: "",
				"aria-hidden": "true",
				className: "pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[min(92%,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover opacity-60 mix-blend-screen",
				style: {
					maskImage: "radial-gradient(circle, black 58%, transparent 73%)",
					WebkitMaskImage: "radial-gradient(circle, black 58%, transparent 73%)"
				}
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 316,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				"aria-hidden": true,
				className: "pointer-events-none absolute inset-x-[12%] bottom-[6%] h-6 rounded-[50%] opacity-30 blur-md",
				style: { background: "radial-gradient(ellipse, var(--cyan), transparent 70%)" }
			}, void 0, false, {
				fileName: _jsxFileName$1,
				lineNumber: 327,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("svg", {
				ref: svgRef,
				className: "absolute inset-0 h-full w-full",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("defs", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("filter", {
						id: "globe-blur",
						x: "-50%",
						y: "-50%",
						width: "200%",
						height: "200%",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("feGaussianBlur", { stdDeviation: "2.4" }, void 0, false, {
							fileName: _jsxFileName$1,
							lineNumber: 336,
							columnNumber: 13
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 335,
						columnNumber: 11
					}, this) }, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 334,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("g", {
						stroke: "var(--cyan)",
						fill: "none",
						strokeWidth: 2.2,
						strokeLinecap: "round",
						children: ORBIT_RINGS.map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
							ref: (el) => {
								if (el) orbitRefs.current[i] = el;
							},
							strokeOpacity: .7
						}, `orbit-${i}`, false, {
							fileName: _jsxFileName$1,
							lineNumber: 343,
							columnNumber: 13
						}, this))
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 341,
						columnNumber: 9
					}, this),
					/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("g", {
						stroke: "var(--cyan)",
						fill: "none",
						strokeWidth: 1.8,
						children: [LAT_RINGS.map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
							ref: (el) => {
								if (el) latRefs.current[i] = el;
							},
							strokeOpacity: .42
						}, `lat-${i}`, false, {
							fileName: _jsxFileName$1,
							lineNumber: 356,
							columnNumber: 13
						}, this)), LON_RINGS.map((_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("path", {
							ref: (el) => {
								if (el) lonRefs.current[i] = el;
							},
							strokeOpacity: .42
						}, `lon-${i}`, false, {
							fileName: _jsxFileName$1,
							lineNumber: 365,
							columnNumber: 13
						}, this))]
					}, void 0, true, {
						fileName: _jsxFileName$1,
						lineNumber: 354,
						columnNumber: 9
					}, this)
				]
			}, void 0, true, {
				fileName: _jsxFileName$1,
				lineNumber: 333,
				columnNumber: 7
			}, this),
			placed.map((p) => {
				const size = p.isCore ? 62 : 34;
				const color = GROUP_COLOR[p.node.group];
				return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
					type: "button",
					"data-globe-node": true,
					ref: (el) => {
						if (el) nodeRefs.current.set(p.node.id, el);
						else nodeRefs.current.delete(p.node.id);
					},
					onClick: () => onFocus(p.node.id),
					className: cn("glass absolute left-0 top-0 grid place-items-center rounded-full px-2 text-center transition-opacity duration-300", p.isCore && "animate-nucleus-pulse"),
					style: {
						width: size,
						height: size,
						opacity: 0,
						background: "oklch(0.12 0.03 220 / 0.94)",
						border: `1px solid color-mix(in oklab, ${color} 78%, white 12%)`,
						boxShadow: focus === p.node.id ? "var(--shadow-glass), var(--glow-cyan), 0 0 18px color-mix(in oklab, var(--cyan) 55%, transparent)" : `var(--shadow-glass), 0 0 12px color-mix(in oklab, ${color} 22%, transparent)`
					},
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "block truncate font-display text-[11px] font-semibold",
						children: p.node.label
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 405,
						columnNumber: 13
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
						className: "block text-[10px] text-muted-foreground",
						children: p.node.facts.toLocaleString()
					}, void 0, false, {
						fileName: _jsxFileName$1,
						lineNumber: 408,
						columnNumber: 13
					}, this)]
				}, p.node.id, true, {
					fileName: _jsxFileName$1,
					lineNumber: 380,
					columnNumber: 11
				}, this);
			})
		]
	}, void 0, true, {
		fileName: _jsxFileName$1,
		lineNumber: 304,
		columnNumber: 5
	}, this);
}
var _jsxFileName = "/root/app/code/src/routes/memory.tsx?tsr-split=component";
function MemoryPage() {
	const { sources, connectSource, memoryNodes, memoryEdges } = useAduf();
	const [focus, setFocus] = (0, import_react.useState)(null);
	const nodes = memoryNodes;
	const active = nodes.find((n) => n.id === focus) ?? null;
	return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
		className: "mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8",
		children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PageHeader, {
			eyebrow: "Business Memory",
			title: "What ADUF knows",
			children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
				className: "flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium text-background transition-transform hover:scale-[1.03]",
				style: { background: "var(--gradient-accent)" },
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Plus, { className: "h-4 w-4" }, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 23,
					columnNumber: 13
				}, this), " Connect New Data Source"]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 20,
				columnNumber: 11
			}, this)
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 19,
			columnNumber: 9
		}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
			className: "grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]",
			children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
				hover: false,
				className: "min-w-0 p-4 sm:p-6",
				children: [nodes.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
					className: "flex aspect-square w-full flex-col items-center justify-center gap-3 text-center sm:aspect-[4/3]",
					children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
						className: "grid h-12 w-12 place-items-center rounded-full bg-white/8",
						children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Network, { className: "h-5 w-5 text-muted-foreground" }, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 31,
							columnNumber: 19
						}, this)
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 30,
						columnNumber: 17
					}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
						className: "max-w-xs text-sm text-muted-foreground",
						children: "No memory yet. Connect a data source and ADUF will start building a knowledge graph of your customers, products, revenue and traffic here."
					}, void 0, false, {
						fileName: _jsxFileName,
						lineNumber: 33,
						columnNumber: 17
					}, this)]
				}, void 0, true, {
					fileName: _jsxFileName,
					lineNumber: 29,
					columnNumber: 35
				}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(MemoryGlobe, {
					nodes,
					edges: memoryEdges,
					focus,
					onFocus: setFocus
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 37,
					columnNumber: 24
				}, this), nodes.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
					className: "mt-3 text-center text-xs text-muted-foreground",
					children: active ? `${active.label} — ${active.facts.toLocaleString()} facts learned, linked to ${memoryEdges.filter((e) => e.from === active.id || e.to === active.id).length} clusters` : "Tap any node to inspect the cluster"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 38,
					columnNumber: 33
				}, this) : null]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 28,
				columnNumber: 11
			}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", {
					className: "text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground",
					children: "Data Sources"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 44,
					columnNumber: 13
				}, this), sources.map((s, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(GlassCard, {
					delay: i * .05,
					className: "flex items-center gap-3 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10",
							children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Database, { className: "h-4.5 w-4.5" }, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 49,
								columnNumber: 19
							}, this)
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 48,
							columnNumber: 17
						}, this),
						/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "truncate text-sm font-medium",
								children: s.name
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 52,
								columnNumber: 19
							}, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", {
								className: "text-[11px] text-muted-foreground",
								children: s.category
							}, void 0, false, {
								fileName: _jsxFileName,
								lineNumber: 53,
								columnNumber: 19
							}, this)]
						}, void 0, true, {
							fileName: _jsxFileName,
							lineNumber: 51,
							columnNumber: 17
						}, this),
						s.connected ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", {
							className: "shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[11px]",
							children: "Synced"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 55,
							columnNumber: 32
						}, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", {
							onClick: () => connectSource(s.id),
							className: "shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-background",
							style: { background: "var(--gradient-accent)" },
							children: "Connect"
						}, void 0, false, {
							fileName: _jsxFileName,
							lineNumber: 57,
							columnNumber: 29
						}, this)
					]
				}, s.id, true, {
					fileName: _jsxFileName,
					lineNumber: 47,
					columnNumber: 36
				}, this))]
			}, void 0, true, {
				fileName: _jsxFileName,
				lineNumber: 43,
				columnNumber: 11
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 27,
			columnNumber: 9
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 18,
		columnNumber: 7
	}, this) }, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 17,
		columnNumber: 10
	}, this);
}
//#endregion
export { MemoryPage as component };

import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { GlassCard } from "@/components/aduf/liquid";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchSupplierBoard,
  placeSupplierOrderFn,
  updateSupplierOrderFn,
  type SupplierBoard,
  type SupplierOrderView,
  type WaitingStoreOrder,
} from "@/lib/supplier-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";
import type { SupplierStatus } from "@/skills/skill-dropship/supplier/state";

export const Route = createFileRoute("/supplier-orders")({
  head: () => ({
    meta: [
      { title: "Supplier orders · ADUF AI" },
      {
        name: "description",
        content: "Buy stock for paid orders and follow each parcel until it is delivered.",
      },
    ],
  }),
  component: SupplierOrdersPage,
});

// ---------------------------------------------------------------- presentation helpers

const STATUS_LABEL: Record<SupplierStatus, string> = {
  to_place: "To place",
  placed: "Placed",
  shipped: "Shipped",
  delivered: "Delivered",
  issue: "Problem",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const TONE = {
  neutral: "border-white/15 bg-white/8 text-foreground",
  info: "border-[oklch(0.8_0.09_230/45%)] bg-[oklch(0.8_0.09_230/14%)] text-[oklch(0.88_0.07_230)]",
  warn: "border-[oklch(0.82_0.12_85/50%)] bg-[oklch(0.82_0.12_85/14%)] text-[oklch(0.9_0.1_85)]",
  bad: "border-[oklch(0.68_0.14_30/55%)] bg-[oklch(0.68_0.14_30/16%)] text-[oklch(0.82_0.11_30)]",
  good: "border-[oklch(0.8_0.13_155/45%)] bg-[oklch(0.8_0.13_155/14%)] text-[oklch(0.88_0.1_155)]",
  muted: "border-white/10 bg-white/4 text-muted-foreground",
} as const;

const STATUS_TONE: Record<SupplierStatus, keyof typeof TONE> = {
  to_place: "warn",
  placed: "info",
  shipped: "info",
  delivered: "good",
  issue: "bad",
  cancelled: "muted",
  refunded: "muted",
};

function Pill({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONE;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function money(n: number | null, currency: string | null): string {
  if (n === null || n === undefined) return "No cost on file";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency ?? "usd").toUpperCase(),
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${(currency ?? "").toUpperCase()}`;
  }
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function ago(iso: string): string {
  const h = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 3_600_000));
  if (h < 1) return "just now";
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const worst = (o: SupplierOrderView): "urgent" | "warn" | null =>
  o.flags.some((f) => f.severity === "urgent") ? "urgent" : o.flags.length ? "warn" : null;

const itemsLabel = (o: SupplierOrderView) => {
  const first = o.items[0];
  if (!first) return "No items";
  const rest = o.items.length - 1;
  return `${first.quantity} × ${first.title}${rest > 0 ? ` +${rest} more` : ""}`;
};

type Lane = "all" | "attention" | SupplierStatus;
const LIVE: SupplierStatus[] = ["to_place", "placed", "shipped", "issue"];

// ---------------------------------------------------------------- page

function SupplierOrdersPage() {
  const { accessToken, user } = useAuth();
  const [board, setBoard] = useState<SupplierBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setBoard(await fetchSupplierBoard({ data: { accessToken } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load supplier orders.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  return (
    <AppShell>
      <BoardView board={board} loading={loading} error={error} reload={() => void load()} />
    </AppShell>
  );
}

export function BoardView({
  board,
  loading,
  error,
  reload,
}: {
  board: SupplierBoard | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}) {
  const [lane, setLane] = useState<Lane>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const orders = board?.orders ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);
  const attention = useMemo(
    () => orders.filter((o) => LIVE.includes(o.status) && worst(o)),
    [orders],
  );
  const urgentCount = attention.filter((o) => worst(o) === "urgent").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (
        lane === "attention"
          ? !(LIVE.includes(o.status) && worst(o))
          : lane !== "all" && o.status !== lane
      )
        return false;
      if (!q) return true;
      return [o.storeOrderDisplay, o.supplierRef, o.trackingNumber, ...o.items.map((i) => i.title)]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [orders, lane, query]);

  const open = orders.find((o) => o.id === openId) ?? null;

  const report = (r: { ok: boolean; message: string }) => {
    setToast({ ok: r.ok, text: r.message });
    if (r.ok) reload();
  };

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-6">
        <PageHeader eyebrow="Fulfilment" title="Supplier orders">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="glass inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </PageHeader>

        {error ? (
          <GlassCard className="p-5">
            <p className="text-sm font-medium">Couldn't load supplier orders</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 rounded-full bg-white/12 px-4 py-1.5 text-xs hover:bg-white/18"
            >
              Try again
            </button>
          </GlassCard>
        ) : !board && loading ? (
          <LoadingState />
        ) : !board ? (
          <GlassCard className="p-6 text-sm text-muted-foreground">
            Sign in to see your supplier orders.
          </GlassCard>
        ) : (
          <div className="space-y-6">
            <Pipeline
              counts={counts}
              lane={lane}
              setLane={setLane}
              urgent={urgentCount}
              attention={attention.length}
            />

            <WaitingQueue board={board} onResult={report} />

            <section aria-label="Supplier orders">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter orders">
                  {(
                    [
                      ["all", "All"],
                      [
                        "attention",
                        `Needs attention${attention.length ? ` (${attention.length})` : ""}`,
                      ],
                      ["delivered", "Delivered"],
                      ["cancelled", "Cancelled"],
                      ["refunded", "Refunded"],
                    ] as [Lane, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={lane === id}
                      onClick={() => setLane(id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                        lane === id
                          ? "border-white/30 bg-white/14 text-foreground"
                          : "border-white/10 text-muted-foreground hover:bg-white/8",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="glass relative ml-auto flex h-9 w-full items-center gap-2 rounded-full px-3 sm:w-64">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search order, product or tracking"
                    aria-label="Search supplier orders"
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                </label>
              </div>

              {visible.length === 0 ? (
                <EmptyOrders total={orders.length} filtered={lane !== "all" || query !== ""} />
              ) : (
                <>
                  <div className="glass hidden overflow-hidden rounded-3xl md:block">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Store order</th>
                          <th className="px-3 py-3 font-medium">Items</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Delivery</th>
                          <th className="px-3 py-3 text-right font-medium">Cost</th>
                          <th className="w-8 px-2 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((o) => (
                          <tr
                            key={o.id}
                            className="group cursor-pointer border-b border-white/6 last:border-0 hover:bg-white/6 focus-within:bg-white/6"
                            onClick={() => setOpenId(o.id)}
                          >
                            <td className="px-4 py-3.5">
                              <button
                                type="button"
                                onClick={() => setOpenId(o.id)}
                                className="text-left font-medium outline-none focus-visible:underline"
                              >
                                #{o.storeOrderDisplay ?? o.storeOrderId.slice(-6)}
                              </button>
                              <p className="text-[11px] text-muted-foreground">
                                {ago(o.createdAt)} · {o.supplier === "cj" ? "CJ" : "Manual"}
                              </p>
                            </td>
                            <td className="max-w-[16rem] truncate px-3 py-3.5 text-muted-foreground">
                              {itemsLabel(o)}
                            </td>
                            <td className="px-3 py-3.5">
                              <StatusCell o={o} />
                            </td>
                            <td className="px-3 py-3.5 text-muted-foreground">
                              {o.status === "delivered"
                                ? fmtDate(o.deliveredAt)
                                : o.expectedDelivery
                                  ? fmtDate(o.expectedDelivery)
                                  : o.trackingNumber
                                    ? "Tracking added"
                                    : "—"}
                            </td>
                            <td className="px-3 py-3.5 text-right tabular-nums">
                              {money(o.totalCost, o.currency)}
                            </td>
                            <td className="px-2 py-3.5 text-muted-foreground">
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="space-y-3 md:hidden">
                    {visible.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setOpenId(o.id)}
                          className="glass block w-full rounded-3xl p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">
                                #{o.storeOrderDisplay ?? o.storeOrderId.slice(-6)}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {itemsLabel(o)}
                              </p>
                            </div>
                            <StatusCell o={o} compact />
                          </div>
                          {LIVE.includes(o.status) && o.flags[0] ? (
                            <p
                              className={cn(
                                "mt-2 text-xs",
                                worst(o) === "urgent"
                                  ? "text-[oklch(0.82_0.11_30)]"
                                  : "text-[oklch(0.9_0.1_85)]",
                              )}
                            >
                              {o.flags[0].message}
                            </p>
                          ) : null}
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {o.expectedDelivery
                                ? `Due ${fmtDate(o.expectedDelivery)}`
                                : ago(o.createdAt)}
                            </span>
                            <span className="tabular-nums">{money(o.totalCost, o.currency)}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      <Sheet open={open !== null} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {open ? <OrderDetail key={open.id} order={open} onResult={report} /> : null}
        </SheetContent>
      </Sheet>

      {toast ? (
        <div
          role="status"
          className={cn(
            "fixed bottom-24 left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl lg:bottom-8",
            toast.ok ? TONE.good : TONE.bad,
          )}
        >
          {toast.text}
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- pipeline

function Pipeline({
  counts,
  lane,
  setLane,
  urgent,
  attention,
}: {
  counts: Record<string, number>;
  lane: Lane;
  setLane: (l: Lane) => void;
  urgent: number;
  attention: number;
}) {
  const stages: { id: SupplierStatus; label: string; hint: string; icon: typeof Truck }[] = [
    { id: "to_place", label: "To place", hint: "Paid, not bought yet", icon: PackageOpen },
    { id: "placed", label: "Placed", hint: "Waiting for tracking", icon: Check },
    { id: "shipped", label: "Shipped", hint: "On its way", icon: Truck },
    { id: "delivered", label: "Delivered", hint: "At the customer", icon: PackageCheck },
  ];
  const total = stages.reduce((s, x) => s + (counts[x.id] ?? 0), 0);
  return (
    <GlassCard className="p-2 sm:p-3">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {stages.map((s, i) => {
          const n = counts[s.id] ?? 0;
          const active = lane === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setLane(active ? "all" : s.id)}
              aria-pressed={active}
              className={cn(
                "relative rounded-2xl px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan",
                active ? "bg-white/14" : "hover:bg-white/7",
              )}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums leading-none">
                {n}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{s.hint}</p>
              {i < stages.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute right-0 top-1/2 hidden h-8 w-px -translate-y-1/2 bg-white/10 sm:block"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        className="mx-2 mb-1 mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/8"
        aria-hidden
      >
        {stages.map((s, i) => (
          <div
            key={s.id}
            style={{ width: total ? `${((counts[s.id] ?? 0) / total) * 100}%` : "0%" }}
            className={
              i === 0
                ? "bg-[oklch(0.82_0.12_85)]"
                : i === 3
                  ? "bg-[oklch(0.8_0.13_155)]"
                  : "bg-[oklch(0.8_0.09_230)]"
            }
          />
        ))}
      </div>
      {attention > 0 ? (
        <button
          type="button"
          onClick={() => setLane("attention")}
          className={cn(
            "mx-2 mb-1 mt-3 flex w-[calc(100%-1rem)] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs",
            urgent ? TONE.bad : TONE.warn,
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {attention} {attention === 1 ? "order needs" : "orders need"} attention
            {urgent ? `, ${urgent} urgent` : ""}. Show them.
          </span>
        </button>
      ) : null}
    </GlassCard>
  );
}

function StatusCell({ o, compact = false }: { o: SupplierOrderView; compact?: boolean }) {
  const w = worst(LIVE.includes(o.status) ? o : { ...o, flags: [] });
  return (
    <div className="flex shrink-0 flex-col items-start gap-1 md:items-start">
      <Pill tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Pill>
      {w && !compact ? (
        <span
          className={cn(
            "text-[11px]",
            w === "urgent" ? "text-[oklch(0.82_0.11_30)]" : "text-[oklch(0.9_0.1_85)]",
          )}
        >
          {o.flags[0]?.message.replace(/\.$/, "")}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- waiting queue

function WaitingQueue({
  board,
  onResult,
}: {
  board: SupplierBoard;
  onResult: (r: { ok: boolean; message: string }) => void;
}) {
  const { accessToken } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [cjFor, setCjFor] = useState<string | null>(null);
  const [logistic, setLogistic] = useState("");

  if (!board.storeConnected) {
    return (
      <GlassCard className="p-5">
        <p className="text-sm font-medium">Connect your store to see orders waiting for you</p>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          ADUF reads paid orders from your Medusa store and lists the ones you haven't bought from
          the supplier yet. Set MEDUSA_BACKEND_URL and MEDUSA_ADMIN_TOKEN on the server to turn this
          on. Supplier orders you already track still work below.
        </p>
      </GlassCard>
    );
  }
  if (board.waitingError) {
    return (
      <GlassCard className="p-5">
        <p className="text-sm font-medium">Couldn't read your store orders</p>
        <p className="mt-1 text-sm text-muted-foreground">{board.waitingError}</p>
      </GlassCard>
    );
  }
  const list = board.waiting ?? [];

  const add = async (w: WaitingStoreOrder, supplier: "manual" | "cj") => {
    setBusy(w.id);
    try {
      const r = await placeSupplierOrderFn({
        data: {
          accessToken,
          storeOrderId: w.id,
          supplier,
          ...(supplier === "cj" && logistic ? { logisticName: logistic } : {}),
        },
      });
      onResult(r);
      if (r.ok) setCjFor(null);
    } catch (e) {
      onResult({ ok: false, message: e instanceof Error ? e.message : "Couldn't add the order." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassCard className="p-0">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <div>
          <h2 className="text-sm font-semibold">Waiting for you to buy</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Paid in the last 30 days, no supplier order yet. Oldest first.
          </p>
        </div>
        {list.length ? (
          <Pill tone={list.some((w) => w.hoursWaiting > 72) ? "bad" : "warn"}>
            {list.length} waiting
          </Pill>
        ) : (
          <Pill tone="good">All caught up</Pill>
        )}
      </div>
      {list.length ? (
        <ul className="mt-3 divide-y divide-white/8 border-t border-white/8">
          {list.map((w) => (
            <li key={w.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 basis-40 flex-1">
                  <p className="text-sm font-medium">#{w.displayId ?? w.id.slice(-6)}</p>
                  <p
                    className={cn(
                      "text-xs",
                      w.hoursWaiting > 72 ? "text-[oklch(0.82_0.11_30)]" : "text-muted-foreground",
                    )}
                  >
                    Paid{" "}
                    {w.hoursWaiting < 48
                      ? `${w.hoursWaiting}h`
                      : `${Math.floor(w.hoursWaiting / 24)}d`}{" "}
                    ago · {money(w.total, w.currency)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === w.id}
                    onClick={() => void add(w, "manual")}
                    className="rounded-full bg-white/14 px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60"
                  >
                    {busy === w.id ? "Adding" : "Add to my to-do"}
                  </button>
                  {board.cjEnabled ? (
                    <button
                      type="button"
                      onClick={() => setCjFor(cjFor === w.id ? null : w.id)}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-xs transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                    >
                      Order at CJ
                    </button>
                  ) : null}
                </div>
              </div>
              {cjFor === w.id ? (
                <div className="mt-3 rounded-2xl bg-white/6 p-3">
                  <label className="text-xs text-muted-foreground" htmlFor={`cj-${w.id}`}>
                    CJ shipping method
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id={`cj-${w.id}`}
                      value={logistic}
                      onChange={(e) => setLogistic(e.target.value)}
                      placeholder="e.g. CJPacket Ordinary"
                      className="min-w-0 flex-1 rounded-xl border border-white/12 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-white/35"
                    />
                    <button
                      type="button"
                      disabled={!logistic.trim() || busy === w.id}
                      onClick={() => void add(w, "cj")}
                      className="rounded-xl bg-white/16 px-3 py-1.5 text-xs font-medium hover:bg-white/22 disabled:opacity-50"
                    >
                      Create order
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    This creates the order at CJ as unpaid. Nothing is charged until you pay it
                    inside CJ.
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-5 pt-3 text-sm text-muted-foreground">
          Every paid order from the last 30 days has a supplier order.
        </p>
      )}
    </GlassCard>
  );
}

// ---------------------------------------------------------------- detail panel

function Field({
  id,
  label,
  ...rest
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className="mt-1 w-full rounded-xl border border-white/12 bg-white/4 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-white/35"
      />
    </div>
  );
}

function OrderDetail({
  order: o,
  onResult,
}: {
  order: SupplierOrderView;
  onResult: (r: { ok: boolean; message: string }) => void;
}) {
  const { accessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState(o.supplierRef ?? "");
  const [tracking, setTracking] = useState(o.trackingNumber ?? "");
  const [carrier, setCarrier] = useState(o.carrier ?? "");
  const [expected, setExpected] = useState(o.expectedDelivery ?? "");
  const [note, setNote] = useState("");

  const send = async (patch: {
    status?: SupplierStatus;
    supplierRef?: string;
    trackingNumber?: string;
    carrier?: string;
    expectedDelivery?: string;
    note?: string;
  }) => {
    setBusy(true);
    try {
      const r = await updateSupplierOrderFn({ data: { accessToken, orderId: o.id, ...patch } });
      onResult(r);
      if (r.ok) setNote("");
    } catch (e) {
      onResult({
        ok: false,
        message: e instanceof Error ? e.message : "Couldn't save the change.",
      });
    } finally {
      setBusy(false);
    }
  };

  const withNote = note.trim() ? { note: note.trim() } : {};
  const trackingPatch = {
    ...(tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
    ...(carrier.trim() ? { carrier: carrier.trim() } : {}),
    ...(expected ? { expectedDelivery: expected } : {}),
  };
  const final = o.status === "cancelled" || o.status === "refunded";
  const btn =
    "rounded-full px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-50";
  const primary = cn(btn, "bg-white/90 text-background hover:bg-white");
  const secondary = cn(btn, "border border-white/15 hover:bg-white/8");

  return (
    <div className="flex flex-col gap-5 pb-6">
      <SheetHeader className="text-left">
        <div className="flex items-center gap-2">
          <SheetTitle className="font-display text-xl">
            Order #{o.storeOrderDisplay ?? o.storeOrderId.slice(-6)}
          </SheetTitle>
          <Pill tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Pill>
        </div>
        <SheetDescription>
          {o.supplier === "cj" ? "Ordered through CJ" : "Bought by you on the supplier's site"} ·
          added {fmtDate(o.createdAt)}
        </SheetDescription>
      </SheetHeader>

      {LIVE.includes(o.status) && o.flags.length ? (
        <div
          className={cn(
            "space-y-1 rounded-2xl border px-4 py-3 text-sm",
            worst(o) === "urgent" ? TONE.bad : TONE.warn,
          )}
        >
          {o.flags.map((f) => (
            <p key={f.code}>{f.message}</p>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white/5 p-4">
        <h3 className="text-xs font-medium text-muted-foreground">Items</h3>
        <ul className="mt-2 space-y-2">
          {o.items.map((i, idx) => (
            <li
              key={`${i.sku ?? i.title}-${idx}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="min-w-0">
                {i.quantity} × {i.title}
                {i.sku ? (
                  <span className="block text-[11px] text-muted-foreground">SKU {i.sku}</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {i.unitCost === null ? "no cost" : money(i.unitCost * i.quantity, o.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
          <span className="text-muted-foreground">Supplier cost</span>
          <span className="font-medium tabular-nums">{money(o.totalCost, o.currency)}</span>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Info label="Supplier order no." value={o.supplierRef} />
        <Info label="Ships to" value={o.shipToCountry} />
        <Info
          label="Tracking"
          value={
            o.trackingNumber ? `${o.trackingNumber}${o.carrier ? ` (${o.carrier})` : ""}` : null
          }
        />
        <Info label="Expected" value={o.expectedDelivery ? fmtDate(o.expectedDelivery) : null} />
      </dl>

      {!final ? (
        <section className="space-y-4 rounded-2xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold">
            {o.status === "to_place"
              ? "Place it with the supplier"
              : o.status === "placed"
                ? "Add tracking when it ships"
                : o.status === "shipped"
                  ? "Follow the parcel"
                  : o.status === "issue"
                    ? "Resolve the problem"
                    : "Update this order"}
          </h3>

          {o.status === "to_place" ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Buy the items on the supplier's site, then paste the supplier's own order number
                here.
              </p>
              <Field
                id="ref"
                label="Supplier order number"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. 1088273645"
              />
            </>
          ) : null}

          {o.status === "placed" || o.status === "shipped" || o.status === "issue" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  id="trk"
                  label="Tracking number"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. YT2412345678"
                />
              </div>
              <Field
                id="car"
                label="Carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. YunExpress"
              />
              <Field
                id="exp"
                label="Expected delivery"
                type="date"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </div>
          ) : null}

          <Field
            id="note"
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything worth remembering"
            maxLength={500}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {o.status === "to_place" ? (
              <button
                type="button"
                disabled={busy || !ref.trim()}
                className={primary}
                onClick={() =>
                  void send({ status: "placed", supplierRef: ref.trim(), ...withNote })
                }
              >
                Mark as placed
              </button>
            ) : null}
            {o.status === "placed" ? (
              <button
                type="button"
                disabled={busy || !tracking.trim()}
                className={primary}
                onClick={() => void send({ status: "shipped", ...trackingPatch, ...withNote })}
              >
                Mark as shipped
              </button>
            ) : null}
            {o.status === "shipped" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  className={primary}
                  onClick={() => void send({ status: "delivered", ...withNote })}
                >
                  Mark as delivered
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={secondary}
                  onClick={() => void send({ ...trackingPatch, ...withNote })}
                >
                  Save tracking
                </button>
              </>
            ) : null}
            {o.status === "placed" && (tracking.trim() || carrier.trim() || expected) ? (
              <button
                type="button"
                disabled={busy}
                className={secondary}
                onClick={() => void send({ ...trackingPatch, ...withNote })}
              >
                Save without shipping
              </button>
            ) : null}
            {o.status === "issue" ? (
              <>
                <button
                  type="button"
                  disabled={busy || !tracking.trim()}
                  className={primary}
                  onClick={() => void send({ status: "shipped", ...trackingPatch, ...withNote })}
                >
                  Back to shipped
                </button>
                <button
                  type="button"
                  disabled={busy || !tracking.trim()}
                  className={secondary}
                  onClick={() => void send({ status: "delivered", ...withNote })}
                >
                  Mark as delivered
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className={secondary}
                  onClick={() => void send({ status: "refunded", ...withNote })}
                >
                  Mark as refunded
                </button>
              </>
            ) : null}
            {o.status === "delivered" ? (
              <button
                type="button"
                disabled={busy}
                className={secondary}
                onClick={() => void send({ status: "refunded", ...withNote })}
              >
                Mark as refunded
              </button>
            ) : null}
          </div>

          {o.status === "placed" || o.status === "shipped" || o.status === "delivered" ? (
            <button
              type="button"
              disabled={busy}
              className="text-xs text-[oklch(0.82_0.11_30)] underline-offset-2 hover:underline"
              onClick={() => void send({ status: "issue", ...withNote })}
            >
              Report a problem with this order
            </button>
          ) : null}
          {o.status === "to_place" || o.status === "placed" || o.status === "issue" ? (
            <button
              type="button"
              disabled={busy}
              className="block text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => void send({ status: "cancelled", ...withNote })}
            >
              Cancel this supplier order
            </button>
          ) : null}
          {o.supplier === "cj" ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Cancelling here only updates ADUF. To stop a CJ order, cancel it inside CJ too.
            </p>
          ) : null}
        </section>
      ) : (
        <p className="rounded-2xl bg-white/5 p-4 text-sm text-muted-foreground">
          This order is {o.status}. It can't be changed.
        </p>
      )}

      <section>
        <h3 className="text-sm font-semibold">History</h3>
        {o.events.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No status changes yet.</p>
        ) : (
          <ol className="mt-3 space-y-0">
            {[...o.events].reverse().map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="relative border-l border-white/12 pb-4 pl-4 last:pb-0"
              >
                <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-foreground/80" />
                <p className="text-sm">{STATUS_LABEL[e.to]}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(e.at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {e.note ? <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">
        {value || <span className="text-muted-foreground">Not set</span>}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------- states

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading supplier orders">
      <div className="glass h-36 animate-pulse rounded-3xl" />
      <div className="glass h-40 animate-pulse rounded-3xl" />
      <div className="glass h-64 animate-pulse rounded-3xl" />
    </div>
  );
}

function EmptyOrders({ total, filtered }: { total: number; filtered: boolean }) {
  return (
    <GlassCard className="p-8 text-center">
      <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">
        {total === 0
          ? "No supplier orders yet"
          : filtered
            ? "Nothing matches this filter"
            : "No orders here"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {total === 0
          ? "When a customer pays, add the order to your to-do above. Once you buy it from the supplier, it shows up here and you can follow it to delivery."
          : "Clear the search or pick another filter to see the rest."}
      </p>
    </GlassCard>
  );
}

import { useState } from "react";
import type { ConnectorEntry } from "@/lib/connector-entries";

const hue = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 11);

/** An app's logo, or coloured initials when it has none (or it fails to load). */
export function ConnectorLogo({
  entry,
  size = 40,
}: {
  entry: Pick<ConnectorEntry, "name" | "logo" | "id">;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials =
    entry.name
      .replace(/[^A-Za-z0-9 ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white/90"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {entry.logo && !failed ? (
        <img
          src={entry.logo}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-[68%] w-[68%] object-contain"
        />
      ) : (
        <span
          className="grid h-full w-full place-items-center text-[11px] font-semibold"
          style={{
            background: `hsl(${hue(entry.id)} 45% 30%)`,
            color: `hsl(${hue(entry.id)} 80% 90%)`,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

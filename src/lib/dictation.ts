// Pure text logic for voice dictation. Browsers' speech recognition does not give clean, append-only
// text: on Android Chrome, each new result is a *longer copy* of the previous one ("hello",
// "hello world", "hello world how are"), and a restarted session can re-say the last words. Appending
// every result (the old approach) is what produced the doubled words. These helpers rebuild the
// transcript from the full result list instead and trim any repeated boundary.

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Share of positions (over the shorter list) where both lists have the same word. */
function prefixSimilarity(a: string[], b: string[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let same = 0;
  for (let i = 0; i < n; i++) if (norm(a[i]!) === norm(b[i]!)) same++;
  return same / n;
}

/** Folds one recognised segment into what we already have. */
function fold(acc: string, seg: string): string {
  const a = words(acc);
  const s = words(seg);
  if (s.length === 0) return acc;
  if (a.length === 0) return seg.trim();
  // The new segment is a longer (possibly corrected) version of everything so far: replace, don't append.
  if (s.length > a.length && prefixSimilarity(a, s) >= 0.75) return seg.trim();
  // Longer version of just the last segment is handled by the caller; here we trim any repeated boundary.
  return joinWithOverlap(acc, seg);
}

/** Appends `next` to `base`, dropping words at the start of `next` that `base` already ends with.
 *  Needs at least 2 matching words so a genuine "very very good" is left alone. */
export function joinWithOverlap(base: string, next: string): string {
  const a = words(base);
  const s = words(next);
  if (s.length === 0) return base;
  if (a.length === 0) return next.trim();
  const max = Math.min(a.length, s.length);
  for (let k = max; k >= 2; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (norm(a[a.length - k + i]!) !== norm(s[i]!)) {
        match = false;
        break;
      }
    }
    if (match) {
      const rest = s.slice(k).join(" ");
      return rest ? `${base.trimEnd()} ${rest}` : base;
    }
  }
  return `${base.trimEnd()} ${s.join(" ")}`;
}

/** Builds the transcript from the ordered text of every recognition result in the session. */
export function mergeSegments(segments: string[]): string {
  let out = "";
  let prev = "";
  for (const raw of segments) {
    const seg = raw.trim();
    if (!seg) continue;
    const p = words(prev);
    const s = words(seg);
    // Each result is a longer copy of the one before it (Android): swap the previous result for this one.
    if (p.length > 0 && s.length > p.length && prefixSimilarity(p, s) >= 0.75) {
      const withoutPrev = out.endsWith(prev)
        ? out.slice(0, out.length - prev.length).trimEnd()
        : out;
      out = withoutPrev ? joinWithOverlap(withoutPrev, seg) : seg;
    } else {
      out = out ? fold(out, seg) : seg;
    }
    prev = seg;
  }
  return out;
}

/** Puts dictated text after what was already typed, with one space between and no repeated boundary. */
export function appendDictation(typed: string, dictated: string): string {
  const base = typed.replace(/\s+$/, "");
  const text = dictated.trim();
  if (!text) return typed;
  return base ? joinWithOverlap(base, text) : text;
}

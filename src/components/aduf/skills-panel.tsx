import { Loader2, Sparkle } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/aduf/liquid";
import { Switch } from "@/components/ui/switch";

interface Skill {
  id: string;
  category: string;
  title: string;
  description: string;
  enabled: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  growth: "Growth",
  ops: "Operations",
  social: "Social & Messaging",
  commerce: "Commerce",
};

export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data: { skills: Skill[] }) => setSkills(data.skills))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    setPending(id);
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
    try {
      await fetch("/api/skills", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
    } catch {
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !enabled } : s)));
    } finally {
      setPending(null);
    }
  };

  const byCategory = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <GlassCard hover={false} className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkle className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-semibold">Business Skills</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Turn off any skill you don't want ADUF drawing on — it only shapes replies while on.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : !skills.length ? (
        <p className="text-xs text-muted-foreground">
          Connect a backend to configure skills — see .env.example.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABEL[category] ?? category}
              </p>
              <div className="space-y-1.5">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm">{s.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{s.description}</p>
                    </div>
                    <Switch
                      checked={s.enabled}
                      disabled={pending === s.id}
                      onCheckedChange={(checked) => toggle(s.id, checked)}
                      className="shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

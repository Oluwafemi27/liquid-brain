import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/aduf/app-shell";
import { DataPrivacyPanel } from "@/components/aduf/data-privacy-panel";
import { GlassCard } from "@/components/aduf/liquid";
import { PlanSummaryCard } from "@/components/aduf/plan-summary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchMySurveyFn, submitSurvey } from "@/lib/server-fns";
import type { BusinessSurvey } from "@/lib/server/survey";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ADUF AI" },
      {
        name: "description",
        content: "Your account, the answers you gave at sign-up, and your data.",
      },
    ],
  }),
  component: ProfilePage,
});

const BUSINESS_TYPES = [
  "E-commerce / online store",
  "Local / brick-and-mortar",
  "Service business",
  "SaaS / software",
  "Agency / consultancy",
  "Other",
];
const TEAM_SIZES = ["Just me", "2-5", "6-20", "21-50", "50+"];
const EMPTY: BusinessSurvey = {
  profession: "",
  websiteUrl: "",
  goal: "",
  businessType: "",
  teamSize: "",
};

const selectCls =
  "h-9 w-full rounded-md border border-border bg-transparent px-3 text-sm text-foreground";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <GlassCard hover={false} className="mb-4 space-y-3 p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </GlassCard>
  );
}

function ProfilePage() {
  const { user, status, accessToken, signOut } = useAuth();
  const { setUserName } = useAduf();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [survey, setSurvey] = useState<BusinessSurvey>(EMPTY);
  const [surveyLoaded, setSurveyLoaded] = useState(false);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [surveyMsg, setSurveyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatarUrl ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    fetchMySurveyFn({ data: { accessToken } })
      .then((r) => {
        if (!live) return;
        if (r.survey) {
          setSurvey(r.survey);
          setHasSurvey(true);
        }
        setSurveyLoaded(true);
      })
      .catch(() => live && setSurveyLoaded(true));
    return () => {
      live = false;
    };
  }, [accessToken]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    const client = getSupabaseBrowser();
    if (!client) return;
    setBusy("account");
    const { error } = await client.auth.updateUser({
      data: { full_name: name.trim(), avatar_url: avatar.trim() || null },
    });
    setBusy(null);
    if (error) return setAccountMsg(error.message);
    setUserName(name.trim());
    setAccountMsg("Profile saved.");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const client = getSupabaseBrowser();
    if (!client || password.length < 8) return setAccountMsg("Use at least 8 characters.");
    setBusy("password");
    const { error } = await client.auth.updateUser({ password });
    setBusy(null);
    setPassword("");
    setAccountMsg(error ? error.message : "Password updated.");
  }

  async function saveSurvey(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    if (!survey.profession.trim() || !survey.goal.trim() || !survey.businessType)
      return setSurveyMsg("Role, business type and main goal are required.");
    setBusy("survey");
    try {
      await submitSurvey({ data: { accessToken, survey } });
      setHasSurvey(true);
      setSurveyMsg("Saved. ADUF will use these answers from your next message.");
    } catch {
      setSurveyMsg("Couldn't save that. Try again.");
    }
    setBusy(null);
  }

  if (status === "signed-out") {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
          Sign in to see your profile.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-24 lg:py-8">
        <PageHeader eyebrow="Profile" title={user?.name || "Your profile"}>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <SettingsIcon className="h-3.5 w-3.5" /> Settings
          </Link>
        </PageHeader>

        <Section title="Account" hint={user?.email ?? undefined}>
          <form onSubmit={saveAccount} className="space-y-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-lg font-semibold">
                  {(name || user?.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="p-name">Display name</Label>
                  <Input
                    id="p-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-avatar">Photo link</Label>
                  <Input
                    id="p-avatar"
                    type="url"
                    placeholder="https://"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy === "account"}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
            >
              {busy === "account" ? "Saving…" : "Save profile"}
            </button>
          </form>
          <form
            onSubmit={savePassword}
            className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="p-pass">Set or change password</Label>
              <Input
                id="p-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <button
              type="submit"
              disabled={busy === "password" || !password}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
            >
              Update password
            </button>
          </form>
          {accountMsg ? (
            <p role="status" className="text-xs text-muted-foreground">
              {accountMsg}
            </p>
          ) : null}
        </Section>

        <Section
          title="Your business survey"
          hint="The answers you gave when you signed up. ADUF uses them as background for every reply. Only you can see them."
        >
          {!surveyLoaded ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={saveSurvey} className="space-y-3">
              {!hasSurvey ? (
                <p className="text-xs text-muted-foreground">You haven't filled this in yet.</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-prof">Role / profession</Label>
                  <Input
                    id="s-prof"
                    value={survey.profession}
                    onChange={(e) => setSurvey({ ...survey, profession: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-type">Business type</Label>
                  <select
                    id="s-type"
                    className={selectCls}
                    value={survey.businessType}
                    onChange={(e) => setSurvey({ ...survey, businessType: e.target.value })}
                  >
                    <option value="">Select one</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-web">Website or storefront</Label>
                  <Input
                    id="s-web"
                    type="url"
                    placeholder="https://"
                    value={survey.websiteUrl}
                    onChange={(e) => setSurvey({ ...survey, websiteUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-team">Team size</Label>
                  <select
                    id="s-team"
                    className={selectCls}
                    value={survey.teamSize}
                    onChange={(e) => setSurvey({ ...survey, teamSize: e.target.value })}
                  >
                    <option value="">Select one</option>
                    {TEAM_SIZES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-goal">Main goal right now</Label>
                <Textarea
                  id="s-goal"
                  rows={3}
                  value={survey.goal}
                  onChange={(e) => setSurvey({ ...survey, goal: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={busy === "survey"}
                className="rounded-xl px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
                style={{ background: "var(--gradient-accent)" }}
              >
                {busy === "survey" ? "Saving…" : "Save survey"}
              </button>
              {surveyMsg ? (
                <p role="status" className="text-xs text-muted-foreground">
                  {surveyMsg}
                </p>
              ) : null}
            </form>
          )}
        </Section>

        <PlanSummaryCard />

        <div className="mt-4">
          <DataPrivacyPanel />
        </div>

        <button
          onClick={() => void signOut()}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}

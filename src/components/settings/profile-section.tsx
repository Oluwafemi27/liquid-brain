import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchMySurveyFn, submitSurvey } from "@/lib/server-fns";
import type { BusinessSurvey } from "@/lib/server/survey";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAduf } from "@/store/aduf-store";
import { useAuth } from "@/store/auth-store";

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
  "h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-cyan";
const ghostBtn =
  "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground";
const solidBtn =
  "rounded-lg bg-foreground px-3.5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40";

/** A titled group: one quiet heading, then rows separated by hairlines. No boxes inside boxes. */
export function Group({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-1 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {note ? <p className="mt-0.5 text-sm text-muted-foreground">{note}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-3 divide-y divide-white/8 rounded-2xl border border-white/10 bg-white/[0.02] px-5">
        {children}
      </div>
    </section>
  );
}

export function Row({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4">
      <p className="w-28 shrink-0 pt-0.5 text-sm text-muted-foreground sm:w-36">{label}</p>
      <div className="min-w-0 flex-1 text-sm break-words">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const dash = <span className="text-muted-foreground/60">Not set</span>;

/** Account and business-survey groups for the profile page's main column. */
export function ProfileSection() {
  const { user, accessToken } = useAuth();
  const { setUserName } = useAduf();

  // Account
  const [editing, setEditing] = useState<null | "name" | "password" | "survey">(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  // Survey
  const [survey, setSurvey] = useState<BusinessSurvey>(EMPTY);
  const [draft, setDraft] = useState<BusinessSurvey>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [surveyMsg, setSurveyMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
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
        setLoaded(true);
      })
      .catch(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [accessToken]);

  async function saveName() {
    const client = getSupabaseBrowser();
    if (!client || !name.trim()) return;
    setBusy(true);
    const { error } = await client.auth.updateUser({ data: { full_name: name.trim() } });
    setBusy(false);
    if (error) return setAccountMsg(error.message);
    setUserName(name.trim());
    setEditing(null);
    setAccountMsg("Name saved.");
  }

  async function savePassword() {
    const client = getSupabaseBrowser();
    if (!client) return;
    if (password.length < 8) return setAccountMsg("Use at least 8 characters.");
    setBusy(true);
    const { error } = await client.auth.updateUser({ password });
    setBusy(false);
    setPassword("");
    if (error) return setAccountMsg(error.message);
    setEditing(null);
    setAccountMsg("Password updated.");
  }

  async function saveSurvey() {
    if (!accessToken) return;
    if (!draft.profession.trim() || !draft.goal.trim() || !draft.businessType)
      return setSurveyMsg("Role, business type and main goal are required.");
    setBusy(true);
    try {
      await submitSurvey({ data: { accessToken, survey: draft } });
      setSurvey(draft);
      setHasSurvey(true);
      setEditing(null);
      setSurveyMsg("Saved. ADUF uses these answers from your next message.");
    } catch {
      setSurveyMsg("Couldn't save that. Try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <Group title="Account">
        <Row
          label="Name"
          action={
            editing === "name" ? null : (
              <button
                className={ghostBtn}
                onClick={() => (setEditing("name"), setAccountMsg(null))}
              >
                Edit
              </button>
            )
          }
        >
          {editing === "name" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="max-w-xs"
              />
              <button
                className={solidBtn}
                disabled={busy || !name.trim()}
                onClick={() => void saveName()}
              >
                Save
              </button>
              <button
                className={ghostBtn}
                onClick={() => (setEditing(null), setName(user?.name ?? ""))}
              >
                Cancel
              </button>
            </div>
          ) : (
            user?.name || dash
          )}
        </Row>
        <Row label="Email">
          <span className="text-muted-foreground">{user?.email}</span>
        </Row>
        <Row
          label="Password"
          action={
            editing === "password" ? null : (
              <button
                className={ghostBtn}
                onClick={() => (setEditing("password"), setAccountMsg(null))}
              >
                Change
              </button>
            )
          }
        >
          {editing === "password" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="New password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="max-w-xs"
              />
              <button
                className={solidBtn}
                disabled={busy || !password}
                onClick={() => void savePassword()}
              >
                Update
              </button>
              <button className={ghostBtn} onClick={() => (setEditing(null), setPassword(""))}>
                Cancel
              </button>
            </div>
          ) : (
            <span className="tracking-widest text-muted-foreground">••••••••</span>
          )}
        </Row>
      </Group>
      {accountMsg ? (
        <p role="status" className="-mt-6 mb-8 text-sm text-muted-foreground">
          {accountMsg}
        </p>
      ) : null}

      <Group
        title="Your business"
        note="What you told us when you signed up. ADUF uses it as background for every reply. Only you can see it."
        action={
          editing !== "survey" && loaded ? (
            <button
              className={ghostBtn}
              onClick={() => (setDraft(survey), setSurveyMsg(null), setEditing("survey"))}
            >
              {hasSurvey ? "Edit answers" : "Add answers"}
            </button>
          ) : null
        }
      >
        {!loaded ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : editing === "survey" ? (
          <div className="space-y-4 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">Role</span>
                <Input
                  value={draft.profession}
                  onChange={(e) => setDraft({ ...draft, profession: e.target.value })}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">Business type</span>
                <select
                  className={selectCls}
                  value={draft.businessType}
                  onChange={(e) => setDraft({ ...draft, businessType: e.target.value })}
                >
                  <option value="">Select one</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">Website</span>
                <Input
                  type="url"
                  placeholder="https://"
                  value={draft.websiteUrl}
                  onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-muted-foreground">Team size</span>
                <select
                  className={selectCls}
                  value={draft.teamSize}
                  onChange={(e) => setDraft({ ...draft, teamSize: e.target.value })}
                >
                  <option value="">Select one</option>
                  {TEAM_SIZES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Main goal right now</span>
              <Textarea
                rows={3}
                value={draft.goal}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
              />
            </label>
            <div className="flex items-center gap-2">
              <button className={solidBtn} disabled={busy} onClick={() => void saveSurvey()}>
                {busy ? "Saving…" : "Save answers"}
              </button>
              <button className={ghostBtn} onClick={() => setEditing(null)}>
                Cancel
              </button>
              {surveyMsg ? <span className="text-xs text-amber-400">{surveyMsg}</span> : null}
            </div>
          </div>
        ) : hasSurvey ? (
          <>
            <Row label="Role">{survey.profession || dash}</Row>
            <Row label="Business type">{survey.businessType || dash}</Row>
            <Row label="Website">
              {survey.websiteUrl ? (
                <a
                  href={survey.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {survey.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                dash
              )}
            </Row>
            <Row label="Team size">{survey.teamSize || dash}</Row>
            <Row label="Main goal">{survey.goal || dash}</Row>
          </>
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            You haven't answered these yet. Add them so ADUF can tailor its advice.
          </p>
        )}
      </Group>
      {surveyMsg && editing !== "survey" ? (
        <p role="status" className="-mt-6 mb-8 text-sm text-muted-foreground">
          {surveyMsg}
        </p>
      ) : null}
    </div>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/store/auth-store";
import { submitSurvey } from "@/lib/server-fns";
import type { BusinessSurvey } from "@/lib/server/survey";

const BUSINESS_TYPES = [
  "E-commerce / online store",
  "Local / brick-and-mortar",
  "Service business",
  "SaaS / software",
  "Agency / consultancy",
  "Other",
];

const TEAM_SIZES = ["Just me", "2-5", "6-20", "21-50", "50+"];

const emptySurvey: BusinessSurvey = {
  profession: "",
  websiteUrl: "",
  goal: "",
  businessType: "",
  teamSize: "",
};

/** One-time onboarding survey — opens automatically right after a user's
 *  first sign-in (driven by auth-store's surveyStatus, checked in
 *  AuthBootstrap) and never again once submitted. The answers become part
 *  of the context ADUF uses for every analysis (see
 *  src/lib/server/survey.ts#surveyToContext). */
export function SurveyModal() {
  const { status, surveyStatus, accessToken, setSurveyStatus } = useAuth();
  const [survey, setSurvey] = useState<BusinessSurvey>(emptySurvey);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = status === "signed-in" && surveyStatus === "pending";
  const canSubmit = survey.profession.trim() && survey.goal.trim() && survey.businessType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitSurvey({ data: { accessToken, survey } });
      setSurveyStatus("done");
    } catch {
      setError("Couldn't save that — mind trying again?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="glass max-w-md border-border bg-background/95 text-foreground"
        // No close affordance — this is a required one-time step, not a
        // dismissible dialog. Radix still lets Esc close it, which is fine;
        // it'll simply reopen next visit since surveyStatus stays "pending".
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Quick setup, before we start</DialogTitle>
          <DialogDescription>
            A few questions so ADUF's analysis is actually about your business, not generic advice.
            Takes under a minute.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="survey-profession">Your role / profession</Label>
            <Input
              id="survey-profession"
              placeholder="e.g. Founder, Marketing lead, Shop owner"
              value={survey.profession}
              onChange={(e) => setSurvey((s) => ({ ...s, profession: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-business-type">Business type</Label>
            <Select
              value={survey.businessType}
              onValueChange={(v) => setSurvey((s) => ({ ...s, businessType: v }))}
            >
              <SelectTrigger id="survey-business-type">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-website">Website or storefront link (optional)</Label>
            <Input
              id="survey-website"
              type="url"
              placeholder="https://"
              value={survey.websiteUrl}
              onChange={(e) => setSurvey((s) => ({ ...s, websiteUrl: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-team-size">Team size (optional)</Label>
            <Select
              value={survey.teamSize}
              onValueChange={(v) => setSurvey((s) => ({ ...s, teamSize: v }))}
            >
              <SelectTrigger id="survey-team-size">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_SIZES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="survey-goal">What's your main goal right now?</Label>
            <Textarea
              id="survey-goal"
              placeholder="e.g. Get more repeat customers, fix a leaky checkout, grow local visibility"
              value={survey.goal}
              onChange={(e) => setSurvey((s) => ({ ...s, goal: e.target.value }))}
              required
              rows={3}
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-50"
            style={{ background: "var(--gradient-accent)" }}
          >
            {submitting ? "Saving…" : "Start using ADUF"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

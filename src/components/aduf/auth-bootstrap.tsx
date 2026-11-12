import { useEffect, useRef } from "react";
import { useAuth } from "@/store/auth-store";
import { fetchSurveyStatus } from "@/lib/server-fns";

/** Mounted once in AppShell. Boots the auth session listener, and — once a
 *  user is signed in — checks whether they've completed the onboarding
 *  survey yet, so SurveyModal knows whether to open. Renders nothing. */
export function AuthBootstrap() {
  const { init, status, accessToken, user, setSurveyStatus } = useAuth();
  const checkedFor = useRef<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (status !== "signed-in" || !accessToken || !user) return;
    if (checkedFor.current === user.id) return;
    checkedFor.current = user.id;

    fetchSurveyStatus({ data: { accessToken } })
      .then((res) => {
        if (res.status === "done" || res.status === "pending") {
          setSurveyStatus(res.status);
        }
        // "unconfigured" / "signed-out": leave surveyStatus as "unknown" —
        // no backend to persist it, so don't block the UI on it forever.
      })
      .catch(() => {
        // Fail open — a transient error here shouldn't trap the user behind
        // a survey they can't get past.
      });
  }, [status, accessToken, user, setSurveyStatus]);

  // Reset the dedupe guard if the user signs out, so a different account
  // signing in afterwards is checked fresh.
  useEffect(() => {
    if (status === "signed-out") checkedFor.current = null;
  }, [status]);

  return null;
}

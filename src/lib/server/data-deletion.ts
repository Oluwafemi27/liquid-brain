import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "./supabase";

export type DeletionScope = "imports" | "activity" | "chats" | "everything";

const EVERYTHING = [
  "automation_runs",
  "automations",
  "business_surveys",
  "chat_messages",
  "goals",
  "insights",
  "n8n_deployments",
  "schedule_events",
  "data_imports",
  "platform_events",
  "agent_actions",
  "owner_settings",
] as const;

/** Deletes a person's own data. `everything` also removes the sign-in account. Workspace-wide
 *  connections (shared logins) are NOT touched — those are disconnected from Settings. */
export async function deleteUserData(
  userId: string,
  scope: DeletionScope,
): Promise<{ deletedFrom: string[] }> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const tables =
    scope === "imports"
      ? ["data_imports"] // business_records + traffic_snapshots cascade
      : scope === "activity"
        ? ["platform_events", "agent_actions"]
        : scope === "chats"
          ? ["chat_messages"]
          : [...EVERYTHING];
  const done: string[] = [];
  for (const t of tables) {
    const { error } = await db.from(t).delete().eq("user_id", userId);
    if (error) throw new Error(`Couldn't clear ${t}: ${error.message}`);
    done.push(t);
  }
  if (scope === "everything") {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Data cleared, but deleting the account failed: ${error.message}`);
    done.push("account");
  }
  return { deletedFrom: done };
}

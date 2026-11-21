import { DEFAULT_WORKSPACE_ID as D } from "@/lib/server/supabase";
import { tables } from "./supabase-stub";
import { isValidWorkspaceId, telegramWebhookUrl, telegramWorkspaceFor } from "@/lib/server/telegram";

const ok = (c: unknown, m: string) => {
  if (!c) {
    console.error("FAIL", m);
    process.exit(1);
  }
  console.log("ok  ", m);
};

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

async function main() {
  ok(isValidWorkspaceId(D), "the original shared bot's id is accepted");
  ok(isValidWorkspaceId(A), "an account id is accepted");
  ok(!isValidWorkspaceId("x' or 1=1"), "anything else is rejected");
  ok(!isValidWorkspaceId(""), "empty is rejected");

  ok(
    telegramWebhookUrl("https://aduf.me", D) === "https://aduf.me/api/connectors/telegram/webhook",
    "the original bot keeps its original webhook address",
  );
  ok(
    telegramWebhookUrl("https://aduf.me", A).endsWith(`/webhook?w=${A}`),
    "every other account gets its own webhook address",
  );

  tables["telegram_connections"] = [];
  ok((await telegramWorkspaceFor(A)) === A, "with no old shared bot, an account uses its own workspace");
  tables["telegram_connections"] = [{ workspace_id: D, owner_user_id: A }];
  ok((await telegramWorkspaceFor(A)) === D, "whoever connected the old shared bot keeps it");
  ok((await telegramWorkspaceFor(B)) === B, "another account never lands on the old shared bot");
  console.log("done");
}
main();

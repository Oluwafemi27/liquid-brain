import "@tanstack/react-start/server-only";
import { NoModelConfiguredError, callAgent } from "./agent";
import { runWithHarness } from "./agent-harness";
import { resolveDefaultModelKey } from "./model-keys";
import { getSurvey, surveyToContext } from "./survey";
import { handleBusinessUpdate } from "./telegram-business";
import {
  fetchChatTurns,
  getOwnerUserId,
  isChatPaired,
  recordInboundUpdate,
  sendTelegramMessage,
  sendTypingAction,
  tryPairChat,
  type TgUpdate,
} from "./telegram";
import type { ChatMessage } from "@/lib/aduf-types";

const NOT_PAIRED =
  "This is a private ADUF assistant. To use it, open ADUF → Settings → Telegram, " +
  "then send me:\n/start YOUR_CODE";

const HELP =
  "I'm ADUF, your business COO. Just message me like you would in Brain Chat — " +
  "ask about sales, goals, automations or anything about your business.";

/** Turns the agent's structured reply into text that reads well in Telegram.
 *  Anything that needs a tap-to-approve UI (proposed actions, files) is
 *  pointed back at the app instead of being executed from chat. */
function formatReply(reply: Awaited<ReturnType<typeof callAgent>>): string {
  const parts: string[] = [reply.reply.trim()];
  if (reply.question?.options?.length) {
    parts.push(
      `${reply.question.prompt}\n` +
        reply.question.options.map((o, i) => `${i + 1}. ${o.label}`).join("\n") +
        "\n(Reply with your choice.)",
    );
  }
  if (reply.proposedAction) {
    parts.push(
      `**Suggested action:** ${reply.proposedAction.reasoning}\nOpen ADUF to review and approve it — nothing changes until you do.`,
    );
  }
  if (reply.document) {
    parts.push(`I prepared "${reply.document.filename}" — open Brain Chat in ADUF to download it.`);
  }
  return parts.filter(Boolean).join("\n\n");
}

/** Handles one Telegram update end to end: dedupe → pairing gate → agent →
 *  reply. Never throws (the webhook must always answer 200, or Telegram
 *  keeps retrying); failures are logged and the user gets a short apology. */
export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  // Customer DMs to the owner's own account (Telegram Business) are a different
  // trust model from the owner chatting with the bot — handled separately, with
  // a customer-safe assistant that never touches the owner's business data.
  if (update.business_connection || update.business_message) {
    await handleBusinessUpdate(update);
    return;
  }

  const msg = update.message;
  // Only 1:1 chats with the bot. Groups/channels would let strangers in the
  // room reach the agent.
  if (!msg || msg.chat.type !== "private") return;

  const isNew = await recordInboundUpdate(update);
  if (!isNew) return; // Telegram retry — already handled

  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();
  const displayName = msg.from?.username ?? msg.from?.first_name ?? null;

  try {
    // /start [CODE] — pairing entry point (also the button users tap first).
    if (text.startsWith("/start")) {
      const code = text.slice("/start".length).trim();
      if (code) {
        const ok = await tryPairChat(chatId, displayName, code);
        await sendTelegramMessage(
          chatId,
          ok
            ? "You're connected. I'm ADUF, your business COO — ask me anything about your business."
            : "That code didn't work. Copy the current code from ADUF → Settings → Telegram and try again.",
          { log: false },
        );
        return;
      }
      await sendTelegramMessage(chatId, (await isChatPaired(chatId)) ? HELP : NOT_PAIRED, {
        log: false,
      });
      return;
    }

    if (!(await isChatPaired(chatId))) {
      await sendTelegramMessage(chatId, NOT_PAIRED, { log: false });
      return;
    }

    if (text === "/help") {
      await sendTelegramMessage(chatId, HELP, { log: false });
      return;
    }
    if (!text) {
      await sendTelegramMessage(chatId, "I can only read text messages for now.", { log: false });
      return;
    }

    if (!(await resolveDefaultModelKey())) {
      await sendTelegramMessage(chatId, new NoModelConfiguredError().message, { log: false });
      return;
    }

    void sendTypingAction(chatId);

    const ownerId = await getOwnerUserId();
    const surveyContext = ownerId
      ? await getSurvey(ownerId).then((s) => (s ? surveyToContext(s) : undefined))
      : undefined;
    const turns = await fetchChatTurns(chatId, update.update_id);
    const history: ChatMessage[] = turns.map((t, i) => ({
      id: `tg-${i}`,
      role: t.role,
      text: t.text,
    }));

    const { result } = await runWithHarness(
      "telegram-reply",
      (repairContext) => callAgent(history, text.slice(0, 4000), repairContext, surveyContext),
      { maxAttempts: 2 },
    );
    await sendTelegramMessage(chatId, formatReply(result));
  } catch (error) {
    console.error("[telegram] failed to answer message", error);
    await sendTelegramMessage(
      chatId,
      "Sorry — I couldn't put together an answer just now. Please try again in a moment.",
      { log: false },
    ).catch(() => undefined);
  }
}

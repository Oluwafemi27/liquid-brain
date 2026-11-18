import "@tanstack/react-start/server-only";
import { resolveDefaultModelKey, resolveModelKey } from "./model-keys";
import {
  MODEL_PROVIDERS,
  VISION_PROVIDERS,
  callProviderChat,
  supportsVision,
  type MediaPart,
} from "./model-providers";

// Lets ADUF look at pictures, scanned PDFs and video frames. It uses the owner's default AI model if
// that model can see images, otherwise any other connected vision-capable model (Claude, ChatGPT,
// Gemini, Grok, Azure). If none is connected it says so instead of guessing.

export class NoVisionModelError extends Error {
  constructor() {
    super(
      "Reading images needs a vision-capable AI key (Claude, ChatGPT, Gemini or Grok). Add one in Settings, then try again.",
    );
    this.name = "NoVisionModelError";
  }
}

export async function pickVisionKey(
  userId: string,
): Promise<{ providerId: string; apiKey: string } | null> {
  const def = await resolveDefaultModelKey(userId);
  if (def && supportsVision(def.providerId)) return def;
  for (const id of VISION_PROVIDERS) {
    if (id === "azure_openai" || id === def?.providerId) continue;
    const key = await resolveModelKey(userId, id);
    if (key) return { providerId: id, apiKey: key };
  }
  if (def && def.providerId !== "azure_openai") {
    const azure = await resolveModelKey(userId, "azure_openai");
    if (azure) return { providerId: "azure_openai", apiKey: azure };
  }
  return null;
}

export const DESCRIBE_INSTRUCTION =
  "Describe this image for someone who cannot see it, in detail but without padding. " +
  "1) Transcribe ALL visible text exactly (signs, labels, receipts, screenshots, tables, handwriting), keeping numbers, currencies and dates exact. " +
  "2) If it is a chart, table, invoice, receipt, product photo, screenshot or document, say which and give the key figures. " +
  "3) Describe the main objects, people (no guessing who they are), layout and anything unusual. " +
  "Plain text, no preamble.";

/** Asks a vision model about one or more images (or a PDF). Throws NoVisionModelError when no key can see. */
export async function analyzeMedia(
  userId: string,
  media: MediaPart[],
  instruction: string,
  system = "You read images and documents accurately and never invent text that is not there.",
): Promise<string> {
  const key = await pickVisionKey(userId);
  if (!key) throw new NoVisionModelError();
  const provider = MODEL_PROVIDERS[key.providerId];
  if (!provider) throw new NoVisionModelError();
  const { text } = await callProviderChat(provider, key.apiKey, {
    system,
    messages: [{ role: "user", content: instruction, media }],
  });
  return text.trim();
}

import { z } from "zod";
import type { SkillModule } from "../types";
import { assertPublicHttpsUrl } from "@/lib/server/url-guard";
import { allowedActors, apifyRunSync } from "../services/apify";
import { firecrawlScrape } from "../services/firecrawl";

export const competitorSpySkill: SkillModule = {
  id: "skill-competitor-spy",
  title: "Competitor Spy",
  description:
    "Reads public competitor pages and runs approved Apify scrapers for ads and site content.",
  stack: ["firecrawl", "apify", "lightpanda (not wired)"],
  requiresEnv: [],
  implemented: true,
  prompt:
    "Only look at public pages the owner names or that are clearly competitors. Quote what the page says, " +
    "say which URL it came from, and never present scraped text as verified fact about the business.",
  tools: [
    {
      name: "competitor_spy_scrape",
      description:
        "Fetch one public https page as readable markdown (pricing pages, landing pages, product pages).",
      requiresEnv: ["FIRECRAWL_API_KEY"],
      input: z.object({ url: z.string().url().max(500) }),
      risk: "read",
      run: async ({ url }) => {
        assertPublicHttpsUrl(url); // validates only; we keep the full path for the scrape
        return firecrawlScrape(new URL(url).href);
      },
    },
    {
      name: "competitor_spy_actor",
      description:
        `Run an approved Apify actor (${allowedActors().join(", ")}) and return up to 20 items. ` +
        "Input is the actor's own JSON input (e.g. startUrls for website-content-crawler).",
      requiresEnv: ["APIFY_TOKEN"],
      input: z.object({
        actor: z.string().min(3).max(100),
        input: z.record(z.unknown()).default({}),
        maxItems: z.number().int().min(1).max(20).default(10),
      }),
      risk: "read",
      run: async ({ actor, input, maxItems }) => ({
        items: await apifyRunSync(actor, input, maxItems),
      }),
    },
  ],
};

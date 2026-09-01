import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/survey-BYFoAF1g.js
var cached = null;
var warned = false;
/** Returns a Supabase admin (service-role) client, or null if the project
*  isn't configured yet. Every caller must handle the null case — the app
*  runs fine without a backend, it just skips persistence. */
function getSupabaseAdmin() {
	const url = processModule.env["SUPABASE_URL"];
	const key = processModule.env["SUPABASE_SERVICE_ROLE_KEY"];
	if (!url || !key) {
		if (!warned) {
			console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — chat history, connector tokens and agent-run logs won't be persisted.");
			warned = true;
		}
		return null;
	}
	if (!cached) cached = createClient(url, key, { auth: {
		persistSession: false,
		autoRefreshToken: false
	} });
	return cached;
}
/** Single-tenant placeholder until real auth/accounts exist — every row is
*  scoped to this workspace id so multi-tenant support is a schema-compatible
*  follow-up (swap this for the authenticated user's workspace id). */
var DEFAULT_WORKSPACE_ID = "default";
function isOAuth(p) {
	return !("keyBased" in p);
}
/**
* One entry per Automation Grid / Settings source id (see initial-data.ts
* `initialDataSources`). Populate the matching *_CLIENT_ID / *_CLIENT_SECRET
* env vars once you've registered an OAuth app with each provider — the
* authorize/callback routes work as soon as they're set, no code changes.
*/
var OAUTH_PROVIDERS = {
	shopify: {
		id: "shopify",
		displayName: "Shopify",
		authorizeUrl: "https://{shop}.myshopify.com/admin/oauth/authorize",
		tokenUrl: "https://{shop}.myshopify.com/admin/oauth/access_token",
		scope: "read_orders,read_products,read_customers",
		clientId: processModule.env["SHOPIFY_CLIENT_ID"],
		clientSecret: processModule.env["SHOPIFY_CLIENT_SECRET"],
		requiresShopParam: true
	},
	ga: {
		id: "ga",
		displayName: "Google Analytics",
		authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		scope: "https://www.googleapis.com/auth/analytics.readonly",
		clientId: processModule.env["GOOGLE_CLIENT_ID"],
		clientSecret: processModule.env["GOOGLE_CLIENT_SECRET"],
		extraAuthorizeParams: {
			access_type: "offline",
			prompt: "consent"
		}
	},
	sheets: {
		id: "sheets",
		displayName: "Google Sheets",
		authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
		tokenUrl: "https://oauth2.googleapis.com/token",
		scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
		clientId: processModule.env["GOOGLE_CLIENT_ID"],
		clientSecret: processModule.env["GOOGLE_CLIENT_SECRET"],
		extraAuthorizeParams: {
			access_type: "offline",
			prompt: "consent"
		}
	},
	meta: {
		id: "meta",
		displayName: "Meta Ads",
		authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
		tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
		scope: "ads_read,business_management",
		clientId: processModule.env["META_CLIENT_ID"],
		clientSecret: processModule.env["META_CLIENT_SECRET"]
	},
	whatsapp: {
		id: "whatsapp",
		displayName: "WhatsApp Business",
		authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
		tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
		scope: "whatsapp_business_management,whatsapp_business_messaging",
		clientId: processModule.env["META_CLIENT_ID"],
		clientSecret: processModule.env["META_CLIENT_SECRET"]
	},
	paystack: {
		id: "paystack",
		displayName: "Paystack",
		keyBased: true
	}
};
function getProvider(id) {
	return OAUTH_PROVIDERS[id];
}
/** Verifies a Supabase Auth access token (from the browser session) against
*  the project and returns the user it belongs to, or null if it's missing,
*  expired, or invalid. Every server-side action gated on "must be signed
*  in" goes through this — the client's `status === "signed-in"` is only a
*  UI convenience, never something the server trusts on its own. */
async function verifyAccessToken(token) {
	if (!token) return null;
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data, error } = await db.auth.getUser(token);
	if (error || !data.user) return null;
	return {
		id: data.user.id,
		email: data.user.email ?? null
	};
}
/** null = not configured (no backend); undefined = configured, but this
*  user hasn't submitted the survey yet. */
async function getSurvey(userId) {
	const db = getSupabaseAdmin();
	if (!db) return null;
	const { data, error } = await db.from("business_surveys").select("profession, website_url, goal, business_type, team_size").eq("user_id", userId).maybeSingle();
	if (error) {
		console.error("[survey] failed to load survey", error);
		return;
	}
	if (!data) return void 0;
	return {
		profession: data["profession"],
		websiteUrl: data["website_url"] ?? "",
		goal: data["goal"],
		businessType: data["business_type"],
		teamSize: data["team_size"] ?? ""
	};
}
async function saveSurvey(userId, email, survey) {
	const db = getSupabaseAdmin();
	if (!db) throw new Error("No backend configured.");
	const { error } = await db.from("business_surveys").upsert({
		user_id: userId,
		workspace_id: DEFAULT_WORKSPACE_ID,
		email,
		profession: survey.profession,
		website_url: survey.websiteUrl || null,
		goal: survey.goal,
		business_type: survey.businessType,
		team_size: survey.teamSize || null,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}, { onConflict: "user_id" });
	if (error) throw new Error(`Failed to save survey: ${error.message}`);
}
/** Renders the survey as short natural-language context folded into the
*  agent's system prompt — see src/lib/server/agent.ts. */
function surveyToContext(survey) {
	return [
		`Profession/role: ${survey.profession}`,
		survey.businessType ? `Business type: ${survey.businessType}` : null,
		survey.websiteUrl ? `Website: ${survey.websiteUrl}` : null,
		survey.teamSize ? `Team size: ${survey.teamSize}` : null,
		`Primary goal: ${survey.goal}`
	].filter((l) => Boolean(l)).join("\n");
}
//#endregion
export { isOAuth as a, verifyAccessToken as c, getSurvey as i, getProvider as n, saveSurvey as o, getSupabaseAdmin as r, surveyToContext as s, DEFAULT_WORKSPACE_ID as t };

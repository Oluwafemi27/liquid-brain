import {
  chooseN8nMethod,
  credentialedNodeTypes,
  extractComposioTrigger,
  generateCredentiallessWorkflow,
  toExpressionLiteral,
} from "@/lib/n8n-credentialless";
import { signRelayToken, verifyRelayToken } from "@/lib/server/n8n-relay";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };

process.env["N8N_RELAY_SECRET"] = "test-secret";

ok(chooseN8nMethod({ N8N_HOSTED: "true" }) === "inject", "hosted n8n uses auto-inject (Method 1)");
ok(chooseN8nMethod({ N8N_HOSTED: "false" }) === "composio-node", "non-hosted uses Composio-as-node (Method 2)");
ok(chooseN8nMethod({}) === "composio-node", "unset defaults to Method 2");

ok(toExpressionLiteral("={{ $json.a }}") === "$json.a", "a whole expression stays an expression");
ok(toExpressionLiteral("Hi {{ $json.n }}!") === "`Hi ${$json.n}!`", "embedded expressions become a template");
ok(toExpressionLiteral('plain "q"') === '"plain \\"q\\""', "plain strings are escaped");

const wf = generateCredentiallessWorkflow("user-1", { gmail: "ca_g", slack: "ca_s" }, [
  { name: "Summarise", tool: "ADUF_AI_TEXT", params: { instruction: "Summarise", text: "={{ $json.body.data.messageText }}" } },
  { name: "Send to Slack", tool: "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL", toolkit: "slack", params: { channel: "general", text: "={{ $json.data.text }}" } },
], {
  name: "Email to Slack",
  trigger: { kind: "composio", toolkit: "gmail", slug: "GMAIL_NEW_GMAIL_MESSAGE" },
  appUrl: "https://aduf.example/", relayToken: "TOKEN", webhookPath: "aduf-test",
});
const nodes = wf["nodes"] as Record<string, any>[];
ok(nodes.length === 3 && nodes[0].type === "n8n-nodes-base.webhook", "webhook trigger plus one node per action");
ok(nodes.slice(1).every((n) => n.type === "n8n-nodes-base.httpRequest"), "actions are HTTP Request nodes only");
ok(credentialedNodeTypes(wf).length === 0, "relay workflow has no credentials at all");
ok(nodes[1].parameters.url === "https://aduf.example/api/n8n-relay", "calls the ADUF relay");
ok(!JSON.stringify(wf).includes("COMPOSIO_API_KEY") && !/x-api-key/i.test(JSON.stringify(wf)), "no Composio API key in the workflow");
ok(extractComposioTrigger(wf)?.slug === "GMAIL_NEW_GMAIL_MESSAGE", "trigger request is readable from the webhook node");
ok(Object.keys(wf["connections"] as object).length === 2, "nodes are chained in order");

const direct = generateCredentiallessWorkflow("user-1", "ca_s", [
  { name: "Slack", tool: "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL", params: { text: "hi" } },
], { gateway: "composio-direct", appUrl: "https://aduf.example", relayToken: "TOKEN" });
const dn = (direct["nodes"] as Record<string, any>[])[1]!;
ok(dn.parameters.url.startsWith("https://backend.composio.dev/api/v3/tools/execute/SLACK_"), "direct gateway calls Composio");
ok(Object.keys(dn.credentials).join() === "httpHeaderAuth", "direct gateway uses only the one Header Auth credential");
ok(JSON.stringify(dn.parameters.jsonBody).includes("ca_s"), "connectedAccountId is injected");

const tok = signRelayToken("user-1", ["GMAIL_SEND_EMAIL"]);
ok(verifyRelayToken(tok)?.u === "user-1", "a signed token verifies");
ok(verifyRelayToken(tok.slice(0, -2) + "xx") === null, "a tampered token is rejected");
ok(verifyRelayToken("garbage") === null, "garbage is rejected");
ok(!verifyRelayToken(tok)!.t.includes("SLACK_SEND"), "a token only allows its listed tools");

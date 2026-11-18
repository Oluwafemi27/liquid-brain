import { cleanTranscript } from "@/lib/server/transcribe";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };

ok(cleanTranscript({ text: "Thank you." }) === "", "a stock phrase on silence is dropped");
ok(cleanTranscript({ text: "  Our order shipped Monday. " }) === "Our order shipped Monday.", "real speech is kept and trimmed");
ok(
  cleanTranscript({
    segments: [
      { text: " Hello team", no_speech_prob: 0.01, avg_logprob: -0.2 },
      { text: " Thanks for watching", no_speech_prob: 0.9, avg_logprob: -1.1 },
      { text: " the total is 5,000 naira", no_speech_prob: 0.02, avg_logprob: -0.3 },
    ],
  }) === "Hello team the total is 5,000 naira",
  "a silence segment in the middle is removed",
);
ok(cleanTranscript({ segments: [{ text: "la la la la", avg_logprob: -0.3, compression_ratio: 3.4 }] }) === "", "a repeating loop is removed");
console.log("done");

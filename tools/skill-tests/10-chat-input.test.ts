import { appendDictation, joinWithOverlap, mergeSegments } from "@/lib/dictation";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const eq = (a: string, b: string, m: string) => { if (a !== b) { console.error("FAIL", m, "\n  got:", JSON.stringify(a), "\n  want:", JSON.stringify(b)); process.exit(1); } console.log("ok  ", m); };

// Desktop Chrome: separate final phrases, then the interim tail
eq(mergeSegments(["hello world", "how are you"]), "hello world how are you", "separate phrases are joined once");
// Android Chrome: every result is a longer copy of the last one
eq(mergeSegments(["hello", "hello world", "hello world how", "hello world how are you"]), "hello world how are you", "cumulative results (Android) do not repeat words");
eq(mergeSegments(["send the report", "send the report to john", "send the report to john today"]), "send the report to john today", "cumulative sentence grows without duplicates");
// Android corrects an earlier word while growing
eq(mergeSegments(["i want to by", "i want to buy a laptop"]), "i want to buy a laptop", "a corrected earlier word replaces, not appends");
// A new phrase after a cumulative run is appended
eq(mergeSegments(["good morning", "good morning team", "let us start"]), "good morning team let us start", "new phrase after a growing one is appended");
// Redelivery of identical text in an overlapping boundary
eq(mergeSegments(["we ship friday", "ship friday at noon"]), "we ship friday at noon", "repeated boundary words are trimmed");
// Genuine repeats must survive
eq(mergeSegments(["no", "no"]), "no no", "a genuine one-word repeat is kept");
eq(mergeSegments(["it is very very good"]), "it is very very good", "doubled words inside one phrase are kept");
eq(mergeSegments(["", "  ", "hi"]), "hi", "empty results are ignored");
// Restarted session re-says the last words
eq(appendDictation("send the report", "the report to john"), "send the report to john", "restart overlap of 2+ words is trimmed");
eq(appendDictation("hello", "world"), "hello world", "plain append adds one space");
eq(appendDictation("", "  hi there "), "hi there", "dictating into an empty box");
eq(appendDictation("typed text ", ""), "typed text ", "nothing dictated leaves the text untouched");
eq(joinWithOverlap("a b", "b c"), "a b b c", "a single overlapping word is not trimmed");
// Long realistic Android run
const run: string[] = [];
const sentence = "please summarize this week's sales and tell me which product is dropping so I can decide where to spend".split(" ");
for (let i = 1; i <= sentence.length; i++) run.push(sentence.slice(0, i).join(" "));
eq(mergeSegments(run), sentence.join(" "), "a 17-step cumulative run ends as the exact sentence");
ok(true, "dictation logic done");
console.log("done");

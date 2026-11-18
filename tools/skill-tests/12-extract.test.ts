import JSZip from "jszip";
import ExcelJS from "exceljs";
import { extractDocumentText, markupToText } from "@/lib/server/attachment-extract";
import { classifyFile } from "@/lib/attachment-types";
import { buildAttachmentContext } from "@/lib/server/attachments";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const enc = (s: string) => new TextEncoder().encode(s);

(async () => {
  // ---- classification
  ok(classifyFile("a.jpg", "") === "image" && classifyFile("x", "image/png") === "image", "images are recognised by type or extension");
  ok(classifyFile("clip.MOV", "") === "video" && classifyFile("v", "video/mp4") === "video", "videos are recognised");
  ok(classifyFile("a.m4a", "") === "audio" && classifyFile("note.opus", "audio/ogg") === "audio", "audio is recognised");
  ok(classifyFile("logo.svg", "image/svg+xml") === "document" && classifyFile("r.pdf", "application/pdf") === "document", "SVG and PDF are read as documents");

  // ---- plain text family
  const csv = await extractDocumentText("sales.csv", "text/csv", enc("name,total\nAda,100\nBo,250\n"));
  ok(csv.text.includes("Ada,100") && !csv.note, "CSV is read as text");
  const json = await extractDocumentText("d.json", "application/json", enc('{"a":1}'));
  ok(json.text === '{"a":1}', "JSON is read as text");
  const code = await extractDocumentText("app.py", "", enc("print('hi')"));
  ok(code.text.includes("print"), "source code files are read");
  const utf16 = await extractDocumentText("n.txt", "text/plain", new Uint8Array([0xff, 0xfe, 0x68, 0, 0x69, 0]));
  ok(utf16.text === "hi", "UTF-16 text is decoded");
  const html = await extractDocumentText("p.html", "text/html", enc("<html><head><title>x</title><style>p{}</style></head><body><h1>Title</h1><p>Hello &amp; welcome</p><script>evil()</script></body></html>"));
  ok(html.text.includes("Title") && html.text.includes("Hello & welcome") && !/evil|p\{\}/.test(html.text), "HTML keeps text, drops scripts and styles, decodes entities");
  ok(markupToText("<p>a</p><p>b</p>").trim() === "a\nb", "paragraphs become lines");
  const rtf = await extractDocumentText("l.rtf", "application/rtf", enc("{\\rtf1\\ansi{\\fonttbl\\f0 Arial;}\\f0 Hello \\b world\\b0\\par Second line}"));
  ok(rtf.text.includes("Hello") && rtf.text.includes("Second line") && !rtf.text.includes("\\b"), "RTF control words are stripped");

  // ---- office formats
  const xl = new ExcelJS.Workbook();
  const ws = xl.addWorksheet("Q3");
  ws.addRow(["Product", "Units", "Revenue"]);
  ws.addRow(["Shoes", 12, { formula: "B2*50", result: 600 }]);
  ws.addRow(["Hats", 3, 90]);
  const xlsx = new Uint8Array(await xl.xlsx.writeBuffer());
  const x = await extractDocumentText("report.xlsx", "", xlsx);
  ok(x.text.includes("Sheet: Q3") && x.text.includes("Shoes | 12 | 600") && x.text.includes("Hats | 3 | 90"), "Excel: sheet name, rows and formula results are read");

  const pptx = new JSZip();
  pptx.file("ppt/slides/slide2.xml", '<p:sld><a:p><a:r><a:t>Second slide</a:t></a:r></a:p></p:sld>');
  pptx.file("ppt/slides/slide1.xml", '<p:sld><a:p><a:r><a:t>Launch plan</a:t></a:r></a:p><a:p><a:r><a:t>Q4 targets</a:t></a:r></a:p></p:sld>');
  pptx.file("ppt/slides/slide10.xml", '<p:sld><a:p><a:r><a:t>Last slide</a:t></a:r></a:p></p:sld>');
  pptx.file("ppt/notesSlides/notesSlide1.xml", '<p:notes><a:p><a:r><a:t>Mention pricing</a:t></a:r></a:p></p:notes>');
  const p = await extractDocumentText("deck.pptx", "", new Uint8Array(await pptx.generateAsync({ type: "uint8array" })));
  ok(p.text.indexOf("Launch plan") < p.text.indexOf("Second slide") && p.text.indexOf("Second slide") < p.text.indexOf("Last slide"), "PowerPoint slides are read in numeric order (1, 2, 10)");
  ok(p.text.includes("Speaker notes") && p.text.includes("Mention pricing"), "PowerPoint speaker notes are included");

  const docx = new JSZip();
  docx.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  docx.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  docx.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Supplier agreement</w:t></w:r></w:p><w:p><w:r><w:t>Net 30 days</w:t></w:r></w:p></w:body></w:document>');
  const d = await extractDocumentText("contract.docx", "", new Uint8Array(await docx.generateAsync({ type: "uint8array" })));
  ok(d.text.includes("Supplier agreement") && d.text.includes("Net 30 days"), "Word documents are read");

  const odt = new JSZip();
  odt.file("content.xml", '<office:document-content><text:p>Open document text</text:p><text:p>Second</text:p></office:document-content>');
  const o = await extractDocumentText("n.odt", "", new Uint8Array(await odt.generateAsync({ type: "uint8array" })));
  ok(o.text.includes("Open document text") && o.text.includes("Second"), "OpenDocument files are read");

  const epub = new JSZip();
  epub.file("OEBPS/ch1.xhtml", "<html><body><p>Chapter one</p></body></html>");
  const e = await extractDocumentText("b.epub", "", new Uint8Array(await epub.generateAsync({ type: "uint8array" })));
  ok(e.text.includes("Chapter one"), "EPUB chapters are read");

  // ---- zip with several files
  const zip = new JSZip();
  zip.file("notes.txt", "remember the invoice");
  zip.file("data/orders.csv", "id,amount\n1,5");
  zip.file("photo.bin", new Uint8Array([0, 1, 2, 3]));
  const z = await extractDocumentText("bundle.zip", "", new Uint8Array(await zip.generateAsync({ type: "uint8array" })));
  ok(z.text.includes("Zip archive with 3 files") && z.text.includes("remember the invoice") && z.text.includes("id,amount"), "zip: lists files and reads the text inside");

  // ---- PDF
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 63>>stream
BT /F1 18 Tf 20 100 Td (Invoice total 4500 naira) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`;
  const pr = await extractDocumentText("inv.pdf", "application/pdf", enc(pdf));
  const blankPdf = await extractDocumentText("scan.pdf", "application/pdf", enc(pdf.replace("(Invoice total 4500 naira) Tj", "() Tj")));
  ok(blankPdf.needsVision === true, "PDF with no text layer is flagged for the vision reader (scanned)");

  // ---- failures are gentle
  const bad = await extractDocumentText("broken.docx", "", enc("not a zip"));
  ok(bad.text === "" && /damaged|protected/.test(bad.note ?? ""), "a damaged Word file gives a clear note instead of an error");
  const old = await extractDocumentText("legacy.doc", "", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0]));
  ok(/Old \.doc/.test(old.note ?? ""), "old .doc files explain what to do");
  const bin = await extractDocumentText("blob.dat", "", new Uint8Array([0, 1, 0, 2, 0, 3]));
  ok(bin.text === "" && /can't read/.test(bin.note ?? ""), "unreadable binary files are reported");
  const big = await extractDocumentText("big.txt", "text/plain", enc("x".repeat(200_000)));
  ok(big.text.length === 120_000 && /first 120,000/.test(big.note ?? ""), "very long text is cut with a note saying so");

  // ---- the context block the model reads
  const ctx = buildAttachmentContext([
    { row: { filename: "a.pdf", kind: "document" } as any, text: "AAA" },
    { row: { filename: "b.png", kind: "image" } as any, text: "BBB" },
    { row: { filename: "c.mp4", kind: "video" } as any, text: "" },
  ]);
  ok(ctx.includes('[Attachment 1 of 3: "a.pdf", document]\nAAA') && ctx.includes('"b.png", image]') && ctx.includes("(nothing readable was found)"), "context block labels every file and flags empty ones");
  const huge = buildAttachmentContext([{ row: { filename: "h.txt", kind: "document" } as any, text: "y".repeat(50_000) }], 10_000);
  ok(huge.includes("more characters not shown"), "context block is capped to a shared budget");
  console.log("done");
})();

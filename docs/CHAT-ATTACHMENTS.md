# Chat attachments, voice and connectors

## Attachments (the + button)
- Pick several files at once: documents, spreadsheets, slides, PDFs, images, audio and video.
- Files upload straight to the private `agent-files` Supabase bucket through signed URLs, so large files never hit the 4.5 MB serverless body limit.
- The server reads each file once (`src/lib/server/attachment-extract.ts`): Word (mammoth), PDF (pdf-parse), Excel (exceljs), PowerPoint/OpenDocument/EPUB/zip (jszip), text and markup, images and scanned PDFs (vision model), audio (Whisper).
- Video is processed in the browser (frames plus 16 kHz audio chunks) and sent to `/api/attachments/video`.
- Every file is virus-scanned before it is read, and originals are deleted automatically (23 hours at most, immediately for audio and files of 8 MB or more; videos are never stored). See `docs/SECURITY.md`.
- The extracted text is stored in `chat_attachments`. The chat route loads it by id, so the browser never resends it.
- **Run migration `supabase/migrations/024_chat_attachments.sql`** (after 021-023).
- Images, scanned PDFs and video frames need a vision-capable model key. Audio and video sound need a Groq or OpenAI key for Whisper.

## Voice
`src/lib/dictation.ts` rebuilds the transcript from the full result list and removes overlap, which stops the duplicated words some Android browsers produce. If browser speech recognition is unavailable, it records audio and transcribes with Whisper.

## Connectors
Every app connection goes through Composio (Connectors page, Memory page, and the connector picker in chat). The old built-in OAuth and pasted-key endpoints under `/api/connectors/:provider/*` are retired (authorize and callback redirect to `/connectors`; saving keys returns 410; disconnect still works to wipe old credentials). Telegram, n8n and ADUF's own Paystack billing are not connectors and are unchanged.

// POST /api/chat — streaming "chat with résumé" (spec §3.5). Takes the chat history
// plus a compact profile/analysis context (NOT the raw résumé, §10) and streams the
// assistant's reply back as plain-text token deltas.

import { getConfig } from "@/lib/llm/config";
import { streamChat, toLLMError } from "@/lib/llm/client";
import { chatSystemPrompt } from "@/lib/llm/prompts";
import type { ChatMessage, ResumeAnalysis, ResumeProfile } from "@/lib/llm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UIMessage {
  from: "me" | "bot";
  text: string;
}

interface ChatRequestBody {
  messages?: UIMessage[];
  profile?: ResumeProfile | null;
  analysis?: ResumeAnalysis | null;
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  const llmMessages: ChatMessage[] = [
    { role: "system", content: chatSystemPrompt(body.profile ?? null, body.analysis ?? null) },
    ...history
      .filter((m) => m && typeof m.text === "string" && m.text.trim().length > 0)
      .map<ChatMessage>((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: m.text,
      })),
  ];

  if (llmMessages.length === 1) {
    return Response.json({ error: "No message to respond to." }, { status: 400 });
  }

  // Fail fast (proper status) on a config/key problem before opening the stream.
  try {
    getConfig();
  } catch (err) {
    const e = toLLMError(err);
    return Response.json({ error: e.message }, { status: e.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamChat({
          task: "default",
          temperature: 0.6,
          messages: llmMessages,
        })) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch {
        // Mid-stream failure — append a short notice (status is already 200).
        controller.enqueue(encoder.encode("\n\n[การเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้งค่ะ]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

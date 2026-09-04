import { CambProviderError } from "@camb-ai/vercel-ai-sdk-provider";

import { parseSpeechRequest } from "@/_server/schemas/speech";
import { generateCambSpeech } from "@/_server/services/speech";
import { jsonError } from "@/_server/shared/json-response";
import { withCambApiKey } from "@/lib/env";

export const runtime = "nodejs";

async function handlePost(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseSpeechRequest(body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  try {
    const result = await generateCambSpeech(parsed.data, request.signal);
    const audio = result.audio.uint8Array;
    const responseBody = audio.buffer.slice(
      audio.byteOffset,
      audio.byteOffset + audio.byteLength,
    ) as ArrayBuffer;

    return new Response(responseBody, {
      status: 200,
      headers: {
        "content-type": result.audio.mediaType,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof CambProviderError) {
      return jsonError(error.message, 502);
    }
    return jsonError("Speech generation failed. Please try again.", 502);
  }
}

export const POST = withCambApiKey(handlePost);

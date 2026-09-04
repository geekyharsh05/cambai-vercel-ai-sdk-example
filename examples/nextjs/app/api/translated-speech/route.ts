import {
  CambProviderError,
  CambTranslatedSpeechError,
  type CambTranslatedSpeechProgress,
  type CambTranslatedSpeechResult,
} from "@camb-ai/vercel-ai-sdk-provider";

import { parseTranslatedSpeechRequest } from "@/_server/schemas/translated-speech";
import { runCambTranslatedSpeech } from "@/_server/services/translated-speech";
import { jsonError } from "@/_server/shared/json-response";
import { withCambApiKey } from "@/lib/env";

export const runtime = "nodejs";

type StreamRecord =
  | { type: "progress"; progress: CambTranslatedSpeechProgress }
  | {
      type: "result";
      translatedText: string;
      audioBase64: string;
      mediaType: string;
      taskId: string;
      runId: number;
    }
  | {
      type: "error";
      error: string;
      status?: string;
      taskId?: string;
      canResume?: boolean;
    };

type TranslatedSpeechRunner = typeof runCambTranslatedSpeech;

function publicError(error: unknown): Extract<StreamRecord, { type: "error" }> {
  if (error instanceof CambTranslatedSpeechError) {
    return {
      type: "error",
      error: error.message,
      status: error.status,
      taskId: error.taskId,
      canResume: error.status === "CLIENT_TIMEOUT",
    };
  }
  if (error instanceof CambProviderError) {
    return { type: "error", error: error.message };
  }
  return {
    type: "error",
    error: "Translated speech generation failed. Please try again.",
  };
}

export async function handleTranslatedSpeechPost(
  request: Request,
  runTranslatedSpeech: TranslatedSpeechRunner = runCambTranslatedSpeech,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = parseTranslatedSpeechRequest(body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const encoder = new TextEncoder();
  const operation = new AbortController();
  const abortOperation = () => operation.abort(request.signal.reason);
  if (request.signal.aborted) abortOperation();
  else request.signal.addEventListener("abort", abortOperation, { once: true });

  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (record: StreamRecord) => {
        if (!cancelled) {
          controller.enqueue(encoder.encode(`${JSON.stringify(record)}\n`));
        }
      };

      void (async () => {
        try {
          const result: CambTranslatedSpeechResult =
            await runTranslatedSpeech(parsed.data, {
              abortSignal: operation.signal,
              onProgress: (progress) =>
                enqueue({ type: "progress", progress }),
            });
          enqueue({
            type: "result",
            translatedText: result.translatedText,
            audioBase64: Buffer.from(result.audio).toString("base64"),
            mediaType: result.mediaType,
            taskId: result.taskId,
            runId: result.runId,
          });
        } catch (error) {
          if (!operation.signal.aborted) enqueue(publicError(error));
        } finally {
          request.signal.removeEventListener("abort", abortOperation);
          if (!cancelled) controller.close();
        }
      })();
    },
    cancel() {
      cancelled = true;
      operation.abort();
      request.signal.removeEventListener("abort", abortOperation);
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/x-ndjson; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

export const POST = withCambApiKey((request: Request) =>
  handleTranslatedSpeechPost(request),
);

import type { CambTranslatedSpeechProgress } from "@camb-ai/vercel-ai-sdk-provider";

import { TRANSLATED_STAGES } from "./constants";

export interface TranslatedSpeechResult {
  translatedText: string;
  audioBase64: string;
  mediaType: string;
  taskId: string;
  runId: number;
}

export class TranslatedSpeechStreamError extends Error {
  readonly status?: string;
  readonly taskId?: string;
  readonly canResume: boolean;

  constructor(
    message: string,
    details: { status?: string; taskId?: string; canResume?: boolean } = {},
  ) {
    super(message);
    this.name = "TranslatedSpeechStreamError";
    this.status = details.status;
    this.taskId = details.taskId;
    this.canResume = details.canResume === true;
  }
}

export { TRANSLATED_STAGES };

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function progressEvent(value: unknown): CambTranslatedSpeechProgress {
  const event = record(value);
  if (!event) {
    throw new Error("The server returned an invalid progress update.");
  }
  const phase = event.phase;
  const taskId = event.taskId;
  const elapsedMs = event.elapsedMs;
  if (
    typeof phase !== "string" ||
    typeof taskId !== "string" ||
    typeof elapsedMs !== "number" ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0
  ) {
    throw new Error("The server returned an invalid progress update.");
  }

  if (phase === "submitted") return { phase, taskId, elapsedMs };
  if (phase === "processing") {
    if (!Number.isSafeInteger(event.attempt) || Number(event.attempt) <= 0) {
      throw new Error("The server returned an invalid progress update.");
    }
    return { phase, taskId, elapsedMs, attempt: Number(event.attempt) };
  }
  if (phase === "retrieving" || phase === "complete") {
    if (!Number.isSafeInteger(event.runId) || Number(event.runId) <= 0) {
      throw new Error("The server returned an invalid progress update.");
    }
    return { phase, taskId, elapsedMs, runId: Number(event.runId) };
  }
  throw new Error("The server returned an invalid progress update.");
}

function resultRecord(value: Record<string, unknown>): TranslatedSpeechResult {
  const translatedText = value.translatedText;
  const audioBase64 = value.audioBase64;
  const mediaType = value.mediaType;
  const taskId = value.taskId;
  const runId = value.runId;
  if (
    typeof translatedText !== "string" ||
    typeof audioBase64 !== "string" ||
    typeof mediaType !== "string" ||
    typeof taskId !== "string" ||
    !Number.isSafeInteger(runId) ||
    Number(runId) <= 0
  ) {
    throw new Error("The server returned an invalid translated speech result.");
  }
  return {
    translatedText,
    audioBase64,
    mediaType,
    taskId,
    runId: Number(runId),
  };
}

export function translatedStep(progress?: CambTranslatedSpeechProgress): number {
  if (!progress || progress.phase === "submitted") return 1;
  if (progress.phase === "processing") return 2;
  if (progress.phase === "retrieving") return 3;
  return 4;
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export async function readTranslatedSpeechStream(
  response: Response,
  onProgress: (progress: CambTranslatedSpeechProgress) => void,
): Promise<TranslatedSpeechResult> {
  if (!response.body) {
    throw new Error("The server did not return a translated speech stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: TranslatedSpeechResult | undefined;

  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error("The server returned malformed progress data.");
    }
    const item = record(value);
    if (item?.type === "progress") {
      onProgress(progressEvent(item.progress));
      return;
    }
    if (item?.type === "result") {
      result = resultRecord(item);
      return;
    }
    if (item?.type === "error" && typeof item.error === "string") {
      throw new TranslatedSpeechStreamError(item.error, {
        ...(typeof item.status === "string" ? { status: item.status } : {}),
        ...(typeof item.taskId === "string" ? { taskId: item.taskId } : {}),
        ...(typeof item.canResume === "boolean"
          ? { canResume: item.canResume }
          : {}),
      });
    }
    throw new Error("The server returned an unknown progress record.");
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) consumeLine(line);
    if (done) break;
  }
  consumeLine(buffer);

  if (!result) {
    throw new Error("The translated speech stream ended before a result arrived.");
  }
  return result;
}

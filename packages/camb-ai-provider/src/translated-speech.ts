import {
  DEFAULT_TRANSLATED_SPEECH_POLL_INTERVAL_MS,
  DEFAULT_TRANSLATED_SPEECH_TIMEOUT_MS,
  JSON_CONTENT_TYPE,
} from "./constants.js";
import { requestCamb, type CambHttpConfig } from "./http.js";
import type {
  CambTranslatedSpeech,
  CambTranslatedSpeechFailureStatus,
  CambTranslatedSpeechOptions,
  CambResumeTranslatedSpeech,
  CambResumeTranslatedSpeechOptions,
  CambTranslatedSpeechResult,
  CambTranslatedSpeechStatus,
} from "./types.js";
import {
  asRecord,
  hasCambTextLength,
  isLowercaseLocale,
  isPositiveInteger,
  nonEmptyString,
} from "./validation.js";

const STATUSES = new Set<CambTranslatedSpeechStatus>([
  "PENDING",
  "SUCCESS",
  "ERROR",
  "FAILED",
  "TIMEOUT",
  "PAYMENT_REQUIRED",
]);

export class CambTranslatedSpeechError extends Error {
  readonly status: CambTranslatedSpeechFailureStatus;
  readonly taskId: string;

  constructor(status: CambTranslatedSpeechFailureStatus, taskId: string) {
    const detail =
      status === "CLIENT_TIMEOUT"
        ? "Polling timed out before CAMB completed the task."
        : `CAMB finished the translated speech task with status ${status}.`;
    super(detail);
    this.name = "CambTranslatedSpeechError";
    this.status = status;
    this.taskId = taskId;
  }
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    function onAbort() {
      clearTimeout(timer);
      reject(signal ? abortError(signal) : new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function positiveInteger(value: number, name: string): number {
  if (!isPositiveInteger(value)) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return value;
}

function locale(value: string, name: string): string {
  if (!isLowercaseLocale(value)) {
    throw new TypeError(`${name} must be a lowercase BCP-47 locale such as en-us.`);
  }
  return value;
}

function validatePollingOptions(options: {
  pollIntervalMs?: number;
  timeoutMs?: number;
}) {
  const pollIntervalMs = positiveInteger(
    options.pollIntervalMs ?? DEFAULT_TRANSLATED_SPEECH_POLL_INTERVAL_MS,
    "pollIntervalMs",
  );
  const timeoutMs = positiveInteger(
    options.timeoutMs ?? DEFAULT_TRANSLATED_SPEECH_TIMEOUT_MS,
    "timeoutMs",
  );
  if (timeoutMs < pollIntervalMs) {
    throw new TypeError("timeoutMs must be greater than or equal to pollIntervalMs.");
  }
  return { pollIntervalMs, timeoutMs };
}

function validateOptions(options: CambTranslatedSpeechOptions) {
  const text = options.text.trim();
  if (!hasCambTextLength(text)) {
    throw new TypeError("text must be between 3 and 3000 characters.");
  }

  const voiceId = positiveInteger(options.voiceId, "voiceId");
  const sourceLanguage = locale(options.sourceLanguage, "sourceLanguage");
  const targetLanguage = locale(options.targetLanguage, "targetLanguage");
  if (sourceLanguage === targetLanguage) {
    throw new TypeError("sourceLanguage and targetLanguage must differ.");
  }

  const { pollIntervalMs, timeoutMs } = validatePollingOptions(options);

  return { text, voiceId, sourceLanguage, targetLanguage, pollIntervalMs, timeoutMs };
}

function validateResumeOptions(options: CambResumeTranslatedSpeechOptions) {
  const taskId = nonEmptyString(options.taskId);
  if (!taskId) throw new TypeError("taskId must not be empty.");
  return { taskId, ...validatePollingOptions(options) };
}

function readTaskId(value: unknown): string {
  const taskId = nonEmptyString(asRecord(value)?.task_id);
  if (!taskId) {
    throw new TypeError("CAMB translated speech response is missing task_id.");
  }
  return taskId;
}

function readStatus(value: unknown): {
  status: CambTranslatedSpeechStatus;
  runId?: number;
} {
  const response = asRecord(value);
  const status = response?.status;
  if (typeof status !== "string" || !STATUSES.has(status as CambTranslatedSpeechStatus)) {
    throw new TypeError("CAMB translated speech status response is malformed.");
  }
  const runId = response?.run_id;
  return {
    status: status as CambTranslatedSpeechStatus,
    ...(isPositiveInteger(runId) ? { runId } : {}),
  };
}

function readTranslation(value: unknown): string {
  const response = asRecord(value);
  const texts = response?.texts;
  const translatedText = nonEmptyString(
    Array.isArray(texts) ? texts[0] : response?.translated_text,
  );
  if (!translatedText) {
    throw new TypeError("CAMB translation result is missing translated text.");
  }
  return translatedText;
}

async function pollTranslatedSpeech(
  config: CambHttpConfig,
  options: {
    taskId: string;
    pollIntervalMs: number;
    timeoutMs: number;
    abortSignal?: AbortSignal;
    onProgress?: CambTranslatedSpeechOptions["onProgress"];
  },
  startedAt: number,
): Promise<CambTranslatedSpeechResult> {
  const { taskId } = options;
  const deadline = Date.now() + options.timeoutMs;
  let runId: number | undefined;
  let attempt = 0;

  while (runId === undefined) {
    throwIfAborted(options.abortSignal);
    attempt += 1;
    const statusResponse = await requestCamb(
      config,
      `/translated-tts/${encodeURIComponent(taskId)}`,
      { method: "GET", signal: options.abortSignal },
    );
    const task = readStatus(await statusResponse.json());

    if (task.status === "SUCCESS") {
      if (task.runId === undefined) {
        throw new TypeError(
          "CAMB translated speech status is SUCCESS but is missing run_id.",
        );
      }
      runId = task.runId;
      options.onProgress?.({
        phase: "retrieving",
        taskId,
        runId,
        elapsedMs: Date.now() - startedAt,
      });
      break;
    }

    if (task.status !== "PENDING") {
      throw new CambTranslatedSpeechError(task.status, taskId);
    }

    options.onProgress?.({
      phase: "processing",
      taskId,
      attempt,
      elapsedMs: Date.now() - startedAt,
    });

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new CambTranslatedSpeechError("CLIENT_TIMEOUT", taskId);
    }
    await delay(Math.min(options.pollIntervalMs, remaining), options.abortSignal);
    if (Date.now() >= deadline) {
      throw new CambTranslatedSpeechError("CLIENT_TIMEOUT", taskId);
    }
  }

  const [translationResponse, audioResponse] = await Promise.all([
    requestCamb(config, `/translation-result/${runId}`, {
      method: "GET",
      signal: options.abortSignal,
    }),
    requestCamb(config, `/tts-result/${runId}?output_type=raw_bytes`, {
      method: "GET",
      signal: options.abortSignal,
    }),
  ]);
  const mediaType = audioResponse.headers.get("content-type")?.split(";")[0]?.trim();
  if (!mediaType?.startsWith("audio/")) {
    throw new TypeError("CAMB TTS result did not return audio content.");
  }

  const result = {
    translatedText: readTranslation(await translationResponse.json()),
    audio: new Uint8Array(await audioResponse.arrayBuffer()),
    mediaType,
    taskId,
    runId,
  };
  options.onProgress?.({
    phase: "complete",
    taskId,
    runId,
    elapsedMs: Date.now() - startedAt,
  });
  return result;
}

export function createTranslatedSpeech(config: CambHttpConfig): CambTranslatedSpeech {
  return async (options) => {
    const validated = validateOptions(options);
    const startedAt = Date.now();
    throwIfAborted(options.abortSignal);

    const createResponse = await requestCamb(config, "/translated-tts", {
      method: "POST",
      headers: { "content-type": JSON_CONTENT_TYPE },
      body: JSON.stringify({
        text: validated.text,
        voice_id: validated.voiceId,
        source_language: validated.sourceLanguage,
        target_language: validated.targetLanguage,
      }),
      signal: options.abortSignal,
    });
    const taskId = readTaskId(await createResponse.json());
    options.onProgress?.({
      phase: "submitted",
      taskId,
      elapsedMs: Date.now() - startedAt,
    });
    return pollTranslatedSpeech(config, {
      taskId,
      pollIntervalMs: validated.pollIntervalMs,
      timeoutMs: validated.timeoutMs,
      abortSignal: options.abortSignal,
      onProgress: options.onProgress,
    }, startedAt);
  };
}

export function createResumeTranslatedSpeech(
  config: CambHttpConfig,
): CambResumeTranslatedSpeech {
  return async (options) => {
    const validated = validateResumeOptions(options);
    const startedAt = Date.now();
    throwIfAborted(options.abortSignal);
    return pollTranslatedSpeech(config, {
      ...validated,
      abortSignal: options.abortSignal,
      onProgress: options.onProgress,
    }, startedAt);
  };
}

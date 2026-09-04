import { afterEach, describe, expect, it, vi } from "vitest";

import { CambTranslatedSpeechError } from "@camb-ai/vercel-ai-sdk-provider";

import {
  handleTranslatedSpeechPost,
  POST,
} from "@/api/translated-speech/route";

const body = {
  action: "create",
  text: "Welcome to our application",
  voiceId: 144300,
  sourceLanguage: "en-us",
  targetLanguage: "es-es",
} as const;

function request(value: unknown = body) {
  return new Request("http://localhost/api/translated-speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

function records(response: Response) {
  return response.text().then((text) =>
    text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>),
  );
}

const result = {
  translatedText: "Bienvenido",
  audio: new Uint8Array([82, 73, 70, 70]),
  mediaType: "audio/wav",
  taskId: "task_1",
  runId: 9,
};

describe("translated speech route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("streams progress followed by translated text and audio", async () => {
    const run = vi.fn(async (_input, options) => {
      options.onProgress({
        phase: "processing",
        taskId: "task_1",
        attempt: 1,
        elapsedMs: 20,
      });
      return result;
    });

    const response = await handleTranslatedSpeechPost(request(), run);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/x-ndjson",
    );
    expect(await records(response)).toEqual([
      {
        type: "progress",
        progress: {
          phase: "processing",
          taskId: "task_1",
          attempt: 1,
          elapsedMs: 20,
        },
      },
      {
        type: "result",
        translatedText: "Bienvenido",
        audioBase64: "UklGRg==",
        mediaType: "audio/wav",
        taskId: "task_1",
        runId: 9,
      },
    ]);
  });

  it("keeps validation errors as ordinary JSON responses", async () => {
    const response = await handleTranslatedSpeechPost(
      request({ ...body, text: "Hi" }),
      vi.fn(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    });
  });

  it("passes resume requests to the SDK service", async () => {
    const run = vi.fn(async () => ({ ...result, taskId: "task_saved" }));

    await records(
      await handleTranslatedSpeechPost(
        request({ action: "resume", taskId: "task_saved" }),
        run,
      ),
    );

    expect(run).toHaveBeenCalledWith(
      { action: "resume", taskId: "task_saved" },
      expect.objectContaining({
        abortSignal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
      }),
    );
  });

  it("marks local polling timeouts as resumable", async () => {
    const run = vi.fn(async () => {
      throw new CambTranslatedSpeechError("CLIENT_TIMEOUT", "task_pending");
    });

    expect(await records(await handleTranslatedSpeechPost(request(), run))).toEqual([
      {
        type: "error",
        error: expect.any(String),
        status: "CLIENT_TIMEOUT",
        taskId: "task_pending",
        canResume: true,
      },
    ]);
  });

  it("uses the shared API-key guard on POST", async () => {
    vi.stubEnv("CAMB_API_KEY", "");

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "The server is missing CAMB_API_KEY.",
    });
  });
});

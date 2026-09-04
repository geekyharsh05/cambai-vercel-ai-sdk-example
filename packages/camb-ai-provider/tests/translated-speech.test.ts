import { describe, expect, it, vi } from "vitest";

import {
  CambTranslatedSpeechError,
  createResumeTranslatedSpeech,
  createTranslatedSpeech,
} from "../src/translated-speech.js";
import type { CambTranslatedSpeechProgress } from "../src/types.js";

const baseOptions = {
  text: "Welcome to our application",
  voiceId: 144300,
  sourceLanguage: "en-us",
  targetLanguage: "es-es",
  pollIntervalMs: 1,
  timeoutMs: 100,
} as const;

function config(fetchMock: typeof fetch) {
  return {
    apiKey: "test-key",
    baseURL: "https://example.test/apis",
    fetch: fetchMock,
  };
}

describe("translatedSpeech", () => {
  it("creates, polls, and retrieves translated text and audio", async () => {
    const wav = new Uint8Array([82, 73, 70, 70]);
    const progress: CambTranslatedSpeechProgress[] = [];
    let statusCalls = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/translated-tts") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          text: "Welcome to our application",
          voice_id: 144300,
          source_language: "en-us",
          target_language: "es-es",
        });
        return Response.json({ task_id: "task_123" });
      }
      if (url.endsWith("/translated-tts/task_123")) {
        statusCalls += 1;
        return Response.json(
          statusCalls === 1
            ? { status: "PENDING", run_id: null }
            : { status: "SUCCESS", run_id: 456 },
        );
      }
      if (url.endsWith("/translation-result/456")) {
        return Response.json({ texts: ["Bienvenido a nuestra aplicación"] });
      }
      if (url.endsWith("/tts-result/456?output_type=raw_bytes")) {
        return new Response(wav, {
          headers: { "content-type": "audio/wav" },
        });
      }
      return new Response("unexpected", { status: 500 });
    });

    await expect(
      createTranslatedSpeech(config(fetchMock))({
        ...baseOptions,
        onProgress: (event) => progress.push(event),
      }),
    ).resolves.toEqual({
      translatedText: "Bienvenido a nuestra aplicación",
      audio: wav,
      mediaType: "audio/wav",
      taskId: "task_123",
      runId: 456,
    });
    expect(statusCalls).toBe(2);
    expect(progress.map(({ phase }) => phase)).toEqual([
      "submitted",
      "processing",
      "retrieving",
      "complete",
    ]);
    expect(progress[1]).toMatchObject({
      phase: "processing",
      taskId: "task_123",
      attempt: 1,
    });
    expect(progress.every(({ elapsedMs }) => elapsedMs >= 0)).toBe(true);
  });

  it("accepts the translated_text response used in CAMB tutorial examples", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/translated-tts")) {
        return Response.json({ task_id: "task_1" });
      }
      if (url.endsWith("/translated-tts/task_1")) {
        return Response.json({ status: "SUCCESS", run_id: 2 });
      }
      if (url.endsWith("/translation-result/2")) {
        return Response.json({ translated_text: "Hola" });
      }
      return new Response(new Uint8Array([1]), {
        headers: { "content-type": "audio/wav" },
      });
    });

    const result = await createTranslatedSpeech(config(fetchMock))(baseOptions);
    expect(result.translatedText).toBe("Hola");
  });

  it.each(["ERROR", "FAILED", "TIMEOUT", "PAYMENT_REQUIRED"] as const)(
    "throws a typed error for %s",
    async (status) => {
      const fetchMock = vi.fn<typeof fetch>(async (input) =>
        String(input).endsWith("/translated-tts")
          ? Response.json({ task_id: "task_failed" })
          : Response.json({ status, run_id: null }),
      );

      const promise = createTranslatedSpeech(config(fetchMock))(baseOptions);
      await expect(promise).rejects.toBeInstanceOf(CambTranslatedSpeechError);
      await expect(promise).rejects.toMatchObject({ status, taskId: "task_failed" });
    },
  );

  it("stops when the client polling deadline expires", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/translated-tts")
        ? Response.json({ task_id: "task_pending" })
        : Response.json({ status: "PENDING", run_id: null }),
    );

    await expect(
      createTranslatedSpeech(config(fetchMock))({
        ...baseOptions,
        timeoutMs: 3,
      }),
    ).rejects.toMatchObject({ status: "CLIENT_TIMEOUT", taskId: "task_pending" });
  });

  it("supports cancellation while waiting to poll", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/translated-tts")
        ? Response.json({ task_id: "task_pending" })
        : Response.json({ status: "PENDING", run_id: null }),
    );

    const promise = createTranslatedSpeech(config(fetchMock))({
      ...baseOptions,
      pollIntervalMs: 50,
      timeoutMs: 100,
      abortSignal: controller.signal,
    });
    setTimeout(() => controller.abort(), 0);

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("resumes an existing task without creating a duplicate task", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      expect(init?.method).toBe("GET");
      if (url.endsWith("/translated-tts/task_saved")) {
        return Response.json({ status: "SUCCESS", run_id: 12 });
      }
      if (url.endsWith("/translation-result/12")) {
        return Response.json({ texts: ["Hola"] });
      }
      return new Response(new Uint8Array([1, 2]), {
        headers: { "content-type": "audio/mpeg" },
      });
    });

    await expect(
      createResumeTranslatedSpeech(config(fetchMock))({
        taskId: "task_saved",
        pollIntervalMs: 1,
        timeoutMs: 100,
      }),
    ).resolves.toMatchObject({
      taskId: "task_saved",
      runId: 12,
      translatedText: "Hola",
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/translated-tts$/),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("validates a resumed task ID before polling", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(
      createResumeTranslatedSpeech(config(fetchMock))({ taskId: "  " }),
    ).rejects.toThrow("taskId");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed task and result responses", async () => {
    const missingTaskFetch = vi.fn<typeof fetch>(async () => Response.json({}));
    await expect(
      createTranslatedSpeech(config(missingTaskFetch))(baseOptions),
    ).rejects.toThrow("task_id");

    const noRunFetch = vi.fn<typeof fetch>(async (input) =>
      String(input).endsWith("/translated-tts")
        ? Response.json({ task_id: "task_1" })
        : Response.json({ status: "SUCCESS", run_id: null }),
    );
    await expect(
      createTranslatedSpeech(config(noRunFetch))(baseOptions),
    ).rejects.toThrow("run_id");
  });

  it.each([
    [{ ...baseOptions, text: "Hi" }, "between 3 and 3000"],
    [{ ...baseOptions, voiceId: 0 }, "voiceId"],
    [{ ...baseOptions, sourceLanguage: "EN-US" }, "sourceLanguage"],
    [{ ...baseOptions, targetLanguage: "Spanish" }, "targetLanguage"],
    [{ ...baseOptions, targetLanguage: "en-us" }, "must differ"],
    [{ ...baseOptions, pollIntervalMs: 0 }, "pollIntervalMs"],
    [{ ...baseOptions, pollIntervalMs: 5, timeoutMs: 4 }, "timeoutMs"],
  ])("validates options %#", async (options, message) => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(
      createTranslatedSpeech(config(fetchMock))(options),
    ).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { CambProviderError } from "../src/errors.js";
import { createCamb } from "../src/provider.js";

const originalApiKey = process.env.CAMB_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalApiKey === undefined) delete process.env.CAMB_API_KEY;
  else process.env.CAMB_API_KEY = originalApiKey;
});

describe("CambSpeechModel", () => {
  it("sends the mapped request and returns binary audio metadata", async () => {
    const wav = new Uint8Array([82, 73, 70, 70, 1, 2, 3]);
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(wav, {
        status: 200,
        headers: {
          "content-type": "audio/wav",
          "x-request-id": "req_123",
        },
      }),
    );
    const abortController = new AbortController();
    const model = createCamb({
      apiKey: "test-key",
      baseURL: "https://example.test/apis/",
      headers: { "x-client": "provider-test" },
      fetch: fetchMock,
    }).speech("mars-instruct");

    const result = await model.doGenerate({
      text: "Hello from CAMB.AI",
      voice: "147320",
      language: "en-us",
      outputFormat: "wav",
      headers: { "x-call": "speech-test" },
      abortSignal: abortController.signal,
      providerOptions: { camb: { inferenceSteps: 8 } },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://example.test/apis/tts-stream");
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBe(abortController.signal);
    expect(headers.get("x-api-key")).toBe("test-key");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-client")).toBe("provider-test");
    expect(headers.get("x-call")).toBe("speech-test");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      text: "Hello from CAMB.AI",
      voice_id: 147320,
      language: "en-us",
      speech_model: "mars-instruct",
      inference_options: { inference_steps: 8 },
    });
    expect(result.audio).toEqual(wav);
    expect(result.warnings).toEqual([]);
    expect(result.response.modelId).toBe("mars-instruct");
    expect(result.response.timestamp).toBeInstanceOf(Date);
    expect(result.response.headers?.["content-type"]).toBe("audio/wav");
  });

  it("reads CAMB_API_KEY when no explicit key is configured", async () => {
    process.env.CAMB_API_KEY = "environment-key";
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      expect(new Headers(init?.headers).get("x-api-key")).toBe(
        "environment-key",
      );
      return new Response(new Uint8Array([82, 73, 70, 70]));
    });

    await createCamb({ fetch: fetchMock })
      .speech("mars-flash")
      .doGenerate({
        text: "Hello world",
        voice: "147320",
        language: "en-us",
      });
  });

  it("fails before fetch when no API key is available", async () => {
    delete process.env.CAMB_API_KEY;
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      createCamb({ fetch: fetchMock })
        .speech("mars-flash")
        .doGenerate({
          text: "Hello world",
          voice: "147320",
          language: "en-us",
        }),
    ).rejects.toThrow("CAMB_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, { detail: "Invalid API key must-not-leak" }, "Authentication failed"],
    [422, { detail: "Unsupported locale" }, "Invalid request"],
    [429, { message: "Too many requests" }, "Rate limit exceeded"],
    [500, "Upstream unavailable", "CAMB service error"],
  ])("turns a %i response into a sanitized provider error", async (
    status,
    body,
    fallback,
  ) => {
    const secret = "must-not-leak";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: {
          "content-type":
            typeof body === "string" ? "text/plain" : "application/json",
        },
      }),
    );

    const promise = createCamb({ apiKey: secret, fetch: fetchMock })
      .speech("mars-flash")
      .doGenerate({
        text: "Hello world",
        voice: "147320",
        language: "en-us",
      });

    await expect(promise).rejects.toBeInstanceOf(CambProviderError);
    await expect(promise).rejects.toMatchObject({ status });
    await expect(promise).rejects.toThrow(fallback);
    await expect(promise).rejects.not.toThrow(secret);
  });
});

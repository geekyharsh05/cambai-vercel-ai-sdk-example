import { describe, expect, it, vi } from "vitest";

import { createLanguageClient, createVoiceClient } from "../src/catalog.js";

const config = (fetchMock: typeof fetch) => ({
  apiKey: "test-key",
  baseURL: "https://example.test/apis",
  fetch: fetchMock,
});

const rawVoice = {
  id: 147320,
  voice_name: "Ava",
  gender: "female",
  age: 28,
  description: "Warm and clear",
  transcript: "Sample",
  is_published: true,
  language: "en-us",
};

describe("voice catalog", () => {
  it.each([
    { label: "array", payload: [rawVoice] },
    { label: "wrapped array", payload: { voices: [rawVoice] } },
  ])(
    "normalizes the $label response",
    async ({ payload }) => {
      const fetchMock = vi.fn<typeof fetch>(async () =>
        Response.json(payload),
      );
      const abortController = new AbortController();

      await expect(
        createVoiceClient(config(fetchMock)).list({
          abortSignal: abortController.signal,
        }),
      ).resolves.toEqual([
        {
          id: 147320,
          name: "Ava",
          gender: "female",
          age: 28,
          description: "Warm and clear",
          transcript: "Sample",
          isPublished: true,
          language: "en-us",
        },
      ]);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://example.test/apis/list-voices");
      expect(init?.method).toBe("GET");
      expect(init?.signal).toBe(abortController.signal);
    },
  );

  it.each([
    [{ nope: [] }],
    [[{ ...rawVoice, id: "147320" }]],
    [[{ ...rawVoice, voice_name: " " }]],
  ])("rejects a malformed successful response %#", async (payload) => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(payload));

    await expect(
      createVoiceClient(config(fetchMock)).list(),
    ).rejects.toThrow("voice catalog");
  });
});

describe("language catalog", () => {
  it.each([
    ["listSource", "source-languages"],
    ["listTarget", "target-languages"],
  ] as const)("normalizes %s", async (method, endpoint) => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json([
        { id: 1, language: " English (US) ", short_name: "EN_US" },
      ]),
    );

    await expect(
      createLanguageClient(config(fetchMock))[method](),
    ).resolves.toEqual([{ id: 1, name: "English (US)", locale: "en-us" }]);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `https://example.test/apis/${endpoint}`,
    );
  });

  it.each([
    [{ id: "1", language: "English", short_name: "en-us" }],
    [{ id: 1, language: "", short_name: "en-us" }],
    [{ id: 1, language: "English", short_name: "" }],
  ])("rejects a malformed language %#", async (language) => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json([language]),
    );

    await expect(
      createLanguageClient(config(fetchMock)).listTarget(),
    ).rejects.toThrow("language catalog");
  });
});

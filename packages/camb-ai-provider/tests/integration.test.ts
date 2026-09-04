import { generateSpeech } from "ai";
import { describe, expect, it, vi } from "vitest";

import { createCamb } from "../src/index.js";

describe("AI SDK integration", () => {
  it("generates speech through the public AI SDK API", async () => {
    const wavHeader = new Uint8Array([
      82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69,
    ]);
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(wavHeader, {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    const result = await generateSpeech({
      model: createCamb({ apiKey: "test-key", fetch: fetchMock }).speech(
        "mars-8.1-flash-beta",
      ),
      text: "Hello from CAMB.AI",
      voice: "147320",
      language: "en-us",
      outputFormat: "wav",
      maxRetries: 0,
    });

    expect(result.audio.uint8Array).toEqual(wavHeader);
    expect(result.audio.mediaType).toBe("audio/wav");
    expect(result.audio.format).toBe("wav");
    expect(result.responses).toHaveLength(1);
  });

  it("lists voices through the package public entry point", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json([{ id: 7, voice_name: "Demo voice", language: "en-us" }]),
    );

    const voices = await createCamb({ apiKey: "test-key", fetch: fetchMock })
      .voices.list();

    expect(voices).toEqual([{ id: 7, name: "Demo voice", language: "en-us" }]);
  });
});

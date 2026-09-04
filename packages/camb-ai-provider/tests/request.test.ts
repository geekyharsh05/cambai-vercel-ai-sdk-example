import { describe, expect, it } from "vitest";

import { buildCambTtsRequest } from "../src/request.js";

describe("buildCambTtsRequest", () => {
  it("maps AI SDK options and CAMB options to the streaming API", () => {
    expect(
      buildCambTtsRequest(
        {
          text: "Hello from CAMB.AI",
          voice: "147320",
          language: "en-us",
          outputFormat: "wav",
          speed: 1.1,
          instructions: "Warm and clear",
          providerOptions: {
            camb: {
              inferenceSteps: 10,
              enhanceNamedEntitiesPronunciation: true,
              sampleRate: 24_000,
            },
          },
        },
        "mars-instruct",
      ),
    ).toEqual({
      body: {
        text: "Hello from CAMB.AI",
        voice_id: 147320,
        language: "en-us",
        speech_model: "mars-instruct",
        user_instructions: "Warm and clear",
        output_configuration: { format: "wav", sample_rate: 24_000 },
        voice_settings: { speaking_rate: 1.1 },
        inference_options: { inference_steps: 10 },
        enhance_named_entities_pronunciation: true,
      },
      warnings: [],
    });
  });

  it("lets the standard speed override the CAMB speaking-rate option", () => {
    const result = buildCambTtsRequest(
      {
        text: "Hello world",
        voice: "147320",
        language: "en-us",
        speed: 1.2,
        providerOptions: { camb: { speakingRate: 0.8 } },
      },
      "mars-flash",
    );

    expect(result.body.voice_settings).toEqual({ speaking_rate: 1.2 });
  });

  it("warns when instructions are used with a model that cannot use them", () => {
    const result = buildCambTtsRequest(
      {
        text: "Hello world",
        voice: "147320",
        language: "en-us",
        instructions: "Whisper",
      },
      "mars-8.1-flash-beta",
    );

    expect(result.body.user_instructions).toBeUndefined();
    expect(result.warnings).toEqual([
      expect.objectContaining({ type: "unsupported", feature: "instructions" }),
    ]);
  });

  it.each([
    [{ text: "Hi", voice: "147320", language: "en-us" }, "between 3 and 3000"],
    [{ text: "Hello", language: "en-us" }, "voice is required"],
    [{ text: "Hello", voice: "voice-name", language: "en-us" }, "positive integer"],
    [{ text: "Hello", voice: "147320" }, "language is required"],
    [
      { text: "Hello", voice: "147320", language: "EN-US" },
      "lowercase BCP-47",
    ],
    [
      {
        text: "Hello",
        voice: "147320",
        language: "en-us",
        outputFormat: "ogg",
      },
      "Unsupported CAMB output format",
    ],
  ])("rejects invalid input %#", (options, message) => {
    expect(() => buildCambTtsRequest(options, "mars-flash")).toThrow(message);
  });
});

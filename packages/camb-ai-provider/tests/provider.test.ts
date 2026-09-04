import { describe, expect, it } from "vitest";

import { createCamb } from "../src/provider.js";

describe("createCamb", () => {
  it("exposes catalog and translated speech capabilities", () => {
    const provider = createCamb({ apiKey: "test-key" });

    expect(provider.voices.list).toBeTypeOf("function");
    expect(provider.languages.listSource).toBeTypeOf("function");
    expect(provider.languages.listTarget).toBeTypeOf("function");
    expect(provider.translatedSpeech).toBeTypeOf("function");
    expect(provider.resumeTranslatedSpeech).toBeTypeOf("function");
  });

  it("creates a SpeechModelV4 with CAMB metadata", () => {
    const model = createCamb({ apiKey: "test-key" }).speech(
      "mars-8.1-flash-beta",
    );

    expect(model.specificationVersion).toBe("v4");
    expect(model.provider).toBe("camb.speech");
    expect(model.modelId).toBe("mars-8.1-flash-beta");
  });

  it("rejects empty model IDs", () => {
    expect(() => createCamb({ apiKey: "test-key" }).speech("  ")).toThrow(
      "modelId must not be empty",
    );
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  copySpeechSnippet,
  SPEECH_SNIPPET,
} from "@/components/code-snippet-bridge";

describe("CodeSnippetBridge", () => {
  it("keeps the complete example exact", () => {
    expect(SPEECH_SNIPPET).toBe(`import { generateSpeech } from "ai";
import { camb } from "@camb-ai/vercel-ai-sdk-provider";

const result = await generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Welcome!",
  language: "en-us",
  outputFormat: "wav",
});`);
  });

  it("copies the exact visible snippet", async () => {
    const writeText = vi.fn(async () => undefined);

    await copySpeechSnippet(writeText);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(SPEECH_SNIPPET);
  });
});

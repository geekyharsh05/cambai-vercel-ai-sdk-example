import { describe, expect, it, vi } from "vitest";

import { runCambTranslatedSpeech } from "@/_server/services/translated-speech";

const options = {
  abortSignal: new AbortController().signal,
  onProgress: vi.fn(),
};

const result = {
  translatedText: "Bienvenido",
  audio: new Uint8Array([1]),
  mediaType: "audio/mpeg",
  taskId: "task_1",
  runId: 2,
};

describe("translated speech service", () => {
  it("uses camb.translatedSpeech for create requests", async () => {
    const translatedSpeech = vi.fn(async () => result);
    const resumeTranslatedSpeech = vi.fn();

    await runCambTranslatedSpeech(
      {
        action: "create",
        text: "Welcome",
        voiceId: 7,
        sourceLanguage: "en-us",
        targetLanguage: "es-es",
      },
      options,
      { translatedSpeech, resumeTranslatedSpeech },
    );

    expect(translatedSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Welcome", voiceId: 7, ...options }),
    );
    expect(resumeTranslatedSpeech).not.toHaveBeenCalled();
  });

  it("uses camb.resumeTranslatedSpeech for resume requests", async () => {
    const translatedSpeech = vi.fn();
    const resumeTranslatedSpeech = vi.fn(async () => result);

    await runCambTranslatedSpeech(
      { action: "resume", taskId: "task_saved" },
      options,
      { translatedSpeech, resumeTranslatedSpeech },
    );

    expect(resumeTranslatedSpeech).toHaveBeenCalledWith({
      taskId: "task_saved",
      ...options,
    });
    expect(translatedSpeech).not.toHaveBeenCalled();
  });
});

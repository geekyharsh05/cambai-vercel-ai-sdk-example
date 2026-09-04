import {
  camb,
  type CambProvider,
  type CambTranslatedSpeechProgress,
} from "@camb-ai/vercel-ai-sdk-provider";

import type { TranslatedSpeechRequest } from "@/_server/schemas/translated-speech";

type CambTranslatedSpeechClient = Pick<
  CambProvider,
  "translatedSpeech" | "resumeTranslatedSpeech"
>;

export function runCambTranslatedSpeech(
  input: TranslatedSpeechRequest,
  options: {
    abortSignal: AbortSignal;
    onProgress: (progress: CambTranslatedSpeechProgress) => void;
  },
  cambClient: CambTranslatedSpeechClient = camb,
) {
  if (input.action === "resume") {
    return cambClient.resumeTranslatedSpeech({
      taskId: input.taskId,
      ...options,
    });
  }

  return cambClient.translatedSpeech({
    text: input.text,
    voiceId: input.voiceId,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    ...options,
  });
}

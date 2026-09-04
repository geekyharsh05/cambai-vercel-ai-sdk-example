import { camb, type CambProvider } from "@camb-ai/vercel-ai-sdk-provider";
import { generateSpeech } from "ai";

import type { SpeechRequest } from "@/_server/schemas/speech";

type CambSpeechClient = Pick<CambProvider, "speech">;

export function generateCambSpeech(
  input: SpeechRequest,
  abortSignal: AbortSignal,
  cambClient: CambSpeechClient = camb,
) {
  return generateSpeech({
    model: cambClient.speech(input.model),
    text: input.text,
    voice: input.voice,
    language: input.language,
    outputFormat: input.outputFormat,
    maxRetries: 0,
    abortSignal,
  });
}

import { createLanguageClient, createVoiceClient } from "./catalog.js";
import type { CambHttpConfig } from "./http.js";
import { CambSpeechModel } from "./speech-model.js";
import {
  createResumeTranslatedSpeech,
  createTranslatedSpeech,
} from "./translated-speech.js";
import type {
  CambLanguageClient,
  CambProviderSettings,
  CambResumeTranslatedSpeech,
  CambTranslatedSpeech,
  CambVoiceClient,
} from "./types.js";
import { nonEmptyString } from "./validation.js";
import { DEFAULT_BASE_URL } from "./constants.js";

export interface CambProvider {
  speech(modelId: string): CambSpeechModel;
  voices: CambVoiceClient;
  languages: CambLanguageClient;
  translatedSpeech: CambTranslatedSpeech;
  resumeTranslatedSpeech: CambResumeTranslatedSpeech;
}

export function createCamb(
  settings: CambProviderSettings = {},
): CambProvider {
  const baseURL = (settings.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const fetch = settings.fetch ?? globalThis.fetch;
  const config: CambHttpConfig = {
    apiKey: settings.apiKey,
    baseURL,
    headers: settings.headers,
    fetch,
  };

  return {
    speech(modelId: string) {
      const normalizedModelId = nonEmptyString(modelId);
      if (!normalizedModelId) {
        throw new TypeError("modelId must not be empty.");
      }

      return new CambSpeechModel(normalizedModelId, config);
    },
    voices: createVoiceClient(config),
    languages: createLanguageClient(config),
    translatedSpeech: createTranslatedSpeech(config),
    resumeTranslatedSpeech: createResumeTranslatedSpeech(config),
  };
}

export const camb = createCamb();

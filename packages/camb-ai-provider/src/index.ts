export { CambProviderError } from "./errors.js";
export { camb, createCamb, type CambProvider } from "./provider.js";
export { CambSpeechModel } from "./speech-model.js";
export { CambTranslatedSpeechError } from "./translated-speech.js";

export type {
  CambCatalogRequestOptions,
  CambLanguage,
  CambLanguageClient,
  CambOutputFormat,
  CambProviderSettings,
  CambResumeTranslatedSpeech,
  CambResumeTranslatedSpeechOptions,
  CambSpeechModelOptions,
  CambTranslatedSpeech,
  CambTranslatedSpeechFailureStatus,
  CambTranslatedSpeechOptions,
  CambTranslatedSpeechProgress,
  CambTranslatedSpeechResult,
  CambTranslatedSpeechStatus,
  CambTtsRequest,
  CambVoice,
  CambVoiceClient,
} from "./types.js";

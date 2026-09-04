import type { SharedV4Warning } from "@ai-sdk/provider";

export type CambOutputFormat =
  | "wav"
  | "mp3"
  | "flac"
  | "pcm_s16le"
  | "pcm_s16be";

export interface CambSpeechModelOptions {
  speakingRate?: number;
  sampleRate?: number;
  inferenceSteps?: number;
  enhanceNamedEntitiesPronunciation?: boolean;
}

export interface CambProviderSettings {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export interface CambVoice {
  id: number;
  name: string;
  language?: string;
  gender?: string;
  age?: string | number;
  description?: string;
  transcript?: string;
  isPublished?: boolean;
}

export interface CambLanguage {
  id: number;
  name: string;
  locale: string;
}

export interface CambCatalogRequestOptions {
  abortSignal?: AbortSignal;
}

export interface CambVoiceClient {
  list(options?: CambCatalogRequestOptions): Promise<CambVoice[]>;
}

export interface CambLanguageClient {
  listSource(options?: CambCatalogRequestOptions): Promise<CambLanguage[]>;
  listTarget(options?: CambCatalogRequestOptions): Promise<CambLanguage[]>;
}

export type CambTranslatedSpeechStatus =
  | "PENDING"
  | "SUCCESS"
  | "ERROR"
  | "FAILED"
  | "TIMEOUT"
  | "PAYMENT_REQUIRED";

export type CambTranslatedSpeechFailureStatus = Exclude<
  CambTranslatedSpeechStatus,
  "PENDING" | "SUCCESS"
> | "CLIENT_TIMEOUT";

export type CambTranslatedSpeechProgress =
  | { phase: "submitted"; taskId: string; elapsedMs: number }
  | {
      phase: "processing";
      taskId: string;
      attempt: number;
      elapsedMs: number;
    }
  | {
      phase: "retrieving";
      taskId: string;
      runId: number;
      elapsedMs: number;
    }
  | {
      phase: "complete";
      taskId: string;
      runId: number;
      elapsedMs: number;
    };

export interface CambTranslatedSpeechOptions {
  text: string;
  voiceId: number;
  sourceLanguage: string;
  targetLanguage: string;
  abortSignal?: AbortSignal;
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (event: CambTranslatedSpeechProgress) => void;
}

export interface CambResumeTranslatedSpeechOptions {
  taskId: string;
  abortSignal?: AbortSignal;
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (event: CambTranslatedSpeechProgress) => void;
}

export interface CambTranslatedSpeechResult {
  translatedText: string;
  audio: Uint8Array;
  mediaType: string;
  taskId: string;
  runId: number;
}

export type CambTranslatedSpeech = (
  options: CambTranslatedSpeechOptions,
) => Promise<CambTranslatedSpeechResult>;

export type CambResumeTranslatedSpeech = (
  options: CambResumeTranslatedSpeechOptions,
) => Promise<CambTranslatedSpeechResult>;

export interface CambTtsRequest {
  text: string;
  voice_id: number;
  language: string;
  speech_model: string;
  user_instructions?: string;
  output_configuration: {
    format: CambOutputFormat;
    sample_rate?: number;
  };
  voice_settings?: {
    speaking_rate: number;
  };
  inference_options?: {
    inference_steps: number;
  };
  enhance_named_entities_pronunciation?: boolean;
}

export interface CambRequestResult {
  body: CambTtsRequest;
  warnings: SharedV4Warning[];
}

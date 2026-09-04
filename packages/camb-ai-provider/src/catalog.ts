import { requestCamb, type CambHttpConfig } from "./http.js";
import type {
  CambCatalogRequestOptions,
  CambLanguage,
  CambLanguageClient,
  CambVoice,
  CambVoiceClient,
} from "./types.js";
import {
  asRecord,
  isPositiveInteger,
  nonEmptyString,
} from "./validation.js";

function parseVoice(value: unknown, index: number): CambVoice {
  const voice = asRecord(value);
  const id = voice?.id;
  const name = nonEmptyString(voice?.voice_name);
  if (!isPositiveInteger(id) || !name) {
    throw new TypeError(`CAMB voice catalog item ${index} is malformed.`);
  }

  const age = voice?.age;
  const language = nonEmptyString(voice?.language);
  const gender = nonEmptyString(voice?.gender);
  const description = nonEmptyString(voice?.description);
  const transcript = nonEmptyString(voice?.transcript);
  return {
    id,
    name,
    ...(language === undefined ? {} : { language }),
    ...(gender === undefined ? {} : { gender }),
    ...(typeof age === "string" || typeof age === "number" ? { age } : {}),
    ...(description === undefined ? {} : { description }),
    ...(transcript === undefined ? {} : { transcript }),
    ...(typeof voice?.is_published === "boolean"
      ? { isPublished: voice.is_published }
      : {}),
  };
}

function parseVoices(value: unknown): CambVoice[] {
  const voices = Array.isArray(value) ? value : asRecord(value)?.voices;
  if (!Array.isArray(voices)) {
    throw new TypeError("CAMB voice catalog response is malformed.");
  }
  return voices.map(parseVoice);
}

function parseLanguage(value: unknown, index: number): CambLanguage {
  const language = asRecord(value);
  const id = language?.id;
  const name = nonEmptyString(language?.language);
  const locale = nonEmptyString(language?.short_name)
    ?.replaceAll("_", "-")
    .toLowerCase();

  if (!isPositiveInteger(id) || !name || !locale) {
    throw new TypeError(`CAMB language catalog item ${index} is malformed.`);
  }

  return { id, name, locale };
}

function parseLanguages(value: unknown): CambLanguage[] {
  if (!Array.isArray(value)) {
    throw new TypeError("CAMB language catalog response is malformed.");
  }
  return value.map(parseLanguage);
}

export function createVoiceClient(config: CambHttpConfig): CambVoiceClient {
  return {
    async list(options: CambCatalogRequestOptions = {}) {
      const response = await requestCamb(config, "/list-voices", {
        method: "GET",
        signal: options.abortSignal,
      });
      return parseVoices(await response.json());
    },
  };
}

export function createLanguageClient(
  config: CambHttpConfig,
): CambLanguageClient {
  async function list(
    path: "/source-languages" | "/target-languages",
    options: CambCatalogRequestOptions = {},
  ) {
    const response = await requestCamb(config, path, {
      method: "GET",
      signal: options.abortSignal,
    });
    return parseLanguages(await response.json());
  }

  return {
    listSource: (options) => list("/source-languages", options),
    listTarget: (options) => list("/target-languages", options),
  };
}

import type {
  JSONObject,
  SharedV4Warning,
  SpeechModelV4CallOptions,
} from "@ai-sdk/provider";

import type {
  CambOutputFormat,
  CambRequestResult,
  CambSpeechModelOptions,
} from "./types.js";
import {
  hasCambTextLength,
  isLowercaseLocale,
  isPositiveInteger,
} from "./validation.js";

const OUTPUT_FORMATS = new Set<CambOutputFormat>([
  "wav",
  "mp3",
  "flac",
  "pcm_s16le",
  "pcm_s16be",
]);

const CAMB_OPTION_KEYS = new Set<keyof CambSpeechModelOptions>([
  "speakingRate",
  "sampleRate",
  "inferenceSteps",
  "enhanceNamedEntitiesPronunciation",
]);

function positiveNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive number.`);
  }
  return value;
}

function positiveInteger(value: unknown, name: string): number | undefined {
  const number = positiveNumber(value, name);
  if (number !== undefined && !isPositiveInteger(number)) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return number;
}

function readCambOptions(value: JSONObject | undefined): CambSpeechModelOptions {
  if (value === undefined) return {};

  return {
    speakingRate: positiveNumber(value.speakingRate, "camb.speakingRate"),
    sampleRate: positiveInteger(value.sampleRate, "camb.sampleRate"),
    inferenceSteps: positiveInteger(
      value.inferenceSteps,
      "camb.inferenceSteps",
    ),
    enhanceNamedEntitiesPronunciation:
      value.enhanceNamedEntitiesPronunciation === undefined
        ? undefined
        : typeof value.enhanceNamedEntitiesPronunciation === "boolean"
          ? value.enhanceNamedEntitiesPronunciation
          : (() => {
              throw new TypeError(
                "camb.enhanceNamedEntitiesPronunciation must be a boolean.",
              );
            })(),
  };
}

export function buildCambTtsRequest(
  options: SpeechModelV4CallOptions,
  modelId: string,
): CambRequestResult {
  if (!hasCambTextLength(options.text)) {
    throw new TypeError("text must be between 3 and 3000 characters.");
  }

  if (!options.voice) {
    throw new TypeError("voice is required for CAMB speech generation.");
  }

  const voiceId = Number(options.voice);
  if (!isPositiveInteger(voiceId)) {
    throw new TypeError("voice must be a positive integer CAMB voice ID.");
  }

  if (!options.language) {
    throw new TypeError("language is required for CAMB speech generation.");
  }
  if (!isLowercaseLocale(options.language)) {
    throw new TypeError("language must be a lowercase BCP-47 locale such as en-us.");
  }

  const outputFormat = options.outputFormat ?? "wav";
  if (!OUTPUT_FORMATS.has(outputFormat as CambOutputFormat)) {
    throw new TypeError(`Unsupported CAMB output format: ${outputFormat}.`);
  }

  const rawCambOptions = options.providerOptions?.camb;
  const cambOptions = readCambOptions(rawCambOptions);
  const warnings: SharedV4Warning[] = [];

  if (rawCambOptions) {
    for (const key of Object.keys(rawCambOptions)) {
      if (!CAMB_OPTION_KEYS.has(key as keyof CambSpeechModelOptions)) {
        warnings.push({
          type: "unsupported",
          feature: `providerOptions.camb.${key}`,
          details: "This option is not supported by the CAMB provider MVP.",
        });
      }
    }
  }

  const speakingRate = positiveNumber(
    options.speed ?? cambOptions.speakingRate,
    "speed",
  );

  const body: CambRequestResult["body"] = {
    text: options.text,
    voice_id: voiceId,
    language: options.language,
    speech_model: modelId,
    output_configuration: {
      format: outputFormat as CambOutputFormat,
      ...(cambOptions.sampleRate === undefined
        ? {}
        : { sample_rate: cambOptions.sampleRate }),
    },
    ...(speakingRate === undefined
      ? {}
      : { voice_settings: { speaking_rate: speakingRate } }),
    ...(cambOptions.inferenceSteps === undefined
      ? {}
      : {
          inference_options: {
            inference_steps: cambOptions.inferenceSteps,
          },
        }),
  };

  if (options.instructions) {
    if (modelId === "mars-instruct") {
      body.user_instructions = options.instructions;
    } else {
      warnings.push({
        type: "unsupported",
        feature: "instructions",
        details: "CAMB user instructions are supported only by mars-instruct.",
      });
    }
  }

  if (cambOptions.enhanceNamedEntitiesPronunciation !== undefined) {
    if (
      modelId === "mars-8.1-flash-beta" ||
      modelId === "mars-8.1-pro-beta"
    ) {
      warnings.push({
        type: "unsupported",
        feature: "enhanceNamedEntitiesPronunciation",
        details: `CAMB does not support this option for ${modelId}.`,
      });
    } else {
      body.enhance_named_entities_pronunciation =
        cambOptions.enhanceNamedEntitiesPronunciation;
    }
  }

  return { body, warnings };
}

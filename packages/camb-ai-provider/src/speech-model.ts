import type {
  SpeechModelV4,
  SpeechModelV4CallOptions,
  SpeechModelV4Result,
} from "@ai-sdk/provider";
import { JSON_CONTENT_TYPE } from "./constants.js";
import {
  requestCamb,
  responseHeaders,
  type CambHttpConfig,
} from "./http.js";
import { buildCambTtsRequest } from "./request.js";

export type CambSpeechModelConfig = CambHttpConfig;

export class CambSpeechModel implements SpeechModelV4 {
  readonly specificationVersion = "v4";
  readonly provider = "camb.speech";
  readonly modelId: string;

  readonly #config: CambSpeechModelConfig;

  constructor(modelId: string, config: CambSpeechModelConfig) {
    this.modelId = modelId;
    this.#config = config;
  }

  async doGenerate(
    options: SpeechModelV4CallOptions,
  ): Promise<SpeechModelV4Result> {
    const { body, warnings } = buildCambTtsRequest(options, this.modelId);
    const timestamp = new Date();

    const response = await requestCamb(this.#config, "/tts-stream", {
      method: "POST",
      headers: {
        ...options.headers,
        "content-type": JSON_CONTENT_TYPE,
      },
      body: JSON.stringify(body),
      signal: options.abortSignal,
    });

    return {
      audio: new Uint8Array(await response.arrayBuffer()),
      warnings,
      request: { body },
      response: {
        timestamp,
        modelId: this.modelId,
        headers: responseHeaders(response.headers),
      },
    };
  }
}

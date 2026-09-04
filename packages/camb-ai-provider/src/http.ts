import type { SharedV2Headers } from "@ai-sdk/provider";

import { resolveCambApiKey } from "./env.js";
import { createCambProviderError } from "./errors.js";

export interface CambHttpConfig {
  apiKey?: string;
  baseURL: string;
  headers?: Record<string, string>;
  fetch: typeof globalThis.fetch;
}

export type CambRequestInit = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit | Record<string, string | undefined>;
};

function mergeCambHeaders(
  config: CambHttpConfig,
  requestHeaders: CambRequestInit["headers"],
  apiKey: string,
): Headers {
  const headers = new Headers(config.headers);

  if (requestHeaders instanceof Headers || Array.isArray(requestHeaders)) {
    for (const [key, value] of new Headers(requestHeaders).entries()) {
      headers.set(key, value);
    }
  } else if (requestHeaders) {
    for (const [key, value] of Object.entries(requestHeaders)) {
      if (value !== undefined) headers.set(key, value);
    }
  }

  headers.set("x-api-key", apiKey);
  return headers;
}

export function buildCambHeaders(
  config: CambHttpConfig,
  requestHeaders?: CambRequestInit["headers"],
): Headers {
  return mergeCambHeaders(
    config,
    requestHeaders,
    resolveCambApiKey(config.apiKey),
  );
}

export async function requestCamb(
  config: CambHttpConfig,
  path: string,
  init: CambRequestInit = {},
): Promise<Response> {
  if (!path.startsWith("/")) {
    throw new TypeError("CAMB request path must start with a slash.");
  }

  const apiKey = resolveCambApiKey(config.apiKey);
  const headers = mergeCambHeaders(config, init.headers, apiKey);
  const response = await config.fetch(`${config.baseURL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await createCambProviderError(response, [apiKey]);
  }

  return response;
}

export function responseHeaders(headers: Headers): SharedV2Headers {
  return Object.fromEntries(headers.entries());
}

import { jsonError } from "@/_server/shared/json-response";

export function hasCambApiKey() {
  return Boolean(process.env.CAMB_API_KEY);
}

export function withCambApiKey<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Response | Promise<Response>,
  isConfigured: () => boolean = hasCambApiKey,
) {
  return async (...args: TArgs): Promise<Response> => {
    if (!isConfigured()) {
      return jsonError("The server is missing CAMB_API_KEY.", 500);
    }

    return handler(...args);
  };
}

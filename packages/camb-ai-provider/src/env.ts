import { MISSING_API_KEY_MESSAGE } from "./constants.js";

export function resolveCambApiKey(explicitApiKey?: string): string {
  const apiKey = explicitApiKey ?? process.env.CAMB_API_KEY;
  if (!apiKey) throw new Error(MISSING_API_KEY_MESSAGE);

  return apiKey;
}

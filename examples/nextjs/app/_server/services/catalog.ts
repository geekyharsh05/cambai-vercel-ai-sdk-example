import { camb, type CambProvider } from "@camb-ai/vercel-ai-sdk-provider";

type CambCatalogClient = Pick<CambProvider, "voices" | "languages">;

export async function listCambCatalog(
  abortSignal: AbortSignal,
  cambClient: CambCatalogClient = camb,
) {
  const options = { abortSignal };
  const [voices, sourceLanguages, targetLanguages] = await Promise.all([
    cambClient.voices.list(options),
    cambClient.languages.listSource(options),
    cambClient.languages.listTarget(options),
  ]);
  return { voices, sourceLanguages, targetLanguages };
}

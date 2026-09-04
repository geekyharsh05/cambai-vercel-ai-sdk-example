import { CambProviderError } from "@camb-ai/vercel-ai-sdk-provider";

import { listCambCatalog } from "@/_server/services/catalog";
import { jsonError } from "@/_server/shared/json-response";
import { withCambApiKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleGet(request: Request) {
  try {
    const { voices, sourceLanguages, targetLanguages } =
      await listCambCatalog(request.signal);
      
    const byName = (left: { name: string }, right: { name: string }) =>
      left.name.localeCompare(right.name);

    return Response.json(
      {
        voices,
        sourceLanguages: [...sourceLanguages].sort(byName),
        targetLanguages: [...targetLanguages].sort(byName),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CambProviderError) {
      return jsonError(error.message, 502);
    }
    return jsonError("Voice and language catalogs are unavailable.", 502);
  }
}

export const GET = withCambApiKey(handleGet);

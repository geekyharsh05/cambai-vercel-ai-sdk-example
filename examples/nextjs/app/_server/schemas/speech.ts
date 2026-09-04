import { MODELS, OUTPUT_FORMATS } from "@/lib/constants";

export interface SpeechRequest {
  text: string;
  model: (typeof MODELS)[number];
  voice: string;
  language: string;
  outputFormat: (typeof OUTPUT_FORMATS)[number];
}

type ParseResult =
  | { success: true; data: SpeechRequest }
  | { success: false; error: string };

export function parseSpeechRequest(value: unknown): ParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Request body must be a JSON object." };
  }

  const body = value as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 3 || text.length > 3_000) {
    return { success: false, error: "Text must contain 3–3000 characters." };
  }
  if (
    typeof body.model !== "string" ||
    !MODELS.includes(body.model as SpeechRequest["model"])
  ) {
    return { success: false, error: "Choose a supported CAMB speech model." };
  }
  if (typeof body.voice !== "string" || !/^[1-9]\d*$/.test(body.voice)) {
    return { success: false, error: "Voice must be a numeric CAMB voice ID." };
  }
  if (
    typeof body.language !== "string" ||
    !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})+$/.test(body.language)
  ) {
    return {
      success: false,
      error: "Language must be a lowercase locale such as en-us.",
    };
  }
  if (
    typeof body.outputFormat !== "string" ||
    !OUTPUT_FORMATS.includes(body.outputFormat as SpeechRequest["outputFormat"])
  ) {
    return { success: false, error: "Choose wav, mp3, or flac output." };
  }

  return {
    success: true,
    data: {
      text,
      model: body.model as SpeechRequest["model"],
      voice: body.voice,
      language: body.language,
      outputFormat: body.outputFormat as SpeechRequest["outputFormat"],
    },
  };
}

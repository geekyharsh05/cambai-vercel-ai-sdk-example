export interface CreateTranslatedSpeechRequest {
  action: "create";
  text: string;
  voiceId: number;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface ResumeTranslatedSpeechRequest {
  action: "resume";
  taskId: string;
}

export type TranslatedSpeechRequest =
  | CreateTranslatedSpeechRequest
  | ResumeTranslatedSpeechRequest;

type ParseResult =
  | { success: true; data: TranslatedSpeechRequest }
  | { success: false; error: string };

const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})+$/;

export function parseTranslatedSpeechRequest(value: unknown): ParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, error: "Request body must be a JSON object." };
  }

  const body = value as Record<string, unknown>;
  if (body.action === "resume") {
    const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
    if (!taskId) {
      return { success: false, error: "A CAMB task ID is required to resume." };
    }
    return { success: true, data: { action: "resume", taskId } };
  }
  if (body.action !== undefined && body.action !== "create") {
    return { success: false, error: "Unknown translated speech action." };
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 3 || text.length > 3_000) {
    return { success: false, error: "Text must contain 3–3000 characters." };
  }
  if (!Number.isSafeInteger(body.voiceId) || Number(body.voiceId) <= 0) {
    return { success: false, error: "Choose a valid CAMB voice." };
  }
  if (
    typeof body.sourceLanguage !== "string" ||
    !LOCALE_PATTERN.test(body.sourceLanguage)
  ) {
    return {
      success: false,
      error: "Source language must be a lowercase locale.",
    };
  }
  if (
    typeof body.targetLanguage !== "string" ||
    !LOCALE_PATTERN.test(body.targetLanguage)
  ) {
    return {
      success: false,
      error: "Target language must be a lowercase locale.",
    };
  }
  if (body.sourceLanguage === body.targetLanguage) {
    return {
      success: false,
      error: "Source and target languages must be different.",
    };
  }

  return {
    success: true,
    data: {
      action: "create",
      text,
      voiceId: Number(body.voiceId),
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
    },
  };
}

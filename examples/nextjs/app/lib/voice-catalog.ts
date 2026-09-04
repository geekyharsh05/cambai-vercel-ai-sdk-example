export interface CatalogVoice {
  id: number;
  name: string;
  language?: string;
  gender?: string;
  age?: string | number;
  description?: string;
  transcript?: string;
  isPublished?: boolean;
}

export interface CatalogLanguage {
  id: number;
  name: string;
  locale: string;
}

export interface CatalogResponse {
  voices: CatalogVoice[];
  sourceLanguages: CatalogLanguage[];
  targetLanguages: CatalogLanguage[];
}

export function normalizeLocale(value: string): string {
  return value.trim().replaceAll("_", "-").toLowerCase();
}

export function languageLabel(name: string): string {
  return name.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function voiceLabel(voice: CatalogVoice): string {
  return [voice.name, voice.language, voice.gender].filter(Boolean).join(" · ");
}

export function voicesForLanguage(
  voices: CatalogVoice[],
  locale: string,
): CatalogVoice[] {
  const normalizedLocale = normalizeLocale(locale);
  const matches = voices.filter(
    (voice) =>
      voice.language !== undefined &&
      normalizeLocale(voice.language) === normalizedLocale,
  );
  return matches.length > 0 ? matches : voices;
}

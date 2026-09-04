const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})+$/;
const MIN_TEXT_LENGTH = 3;
const MAX_TEXT_LENGTH = 3_000;

export function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

export function isLowercaseLocale(value: unknown): value is string {
  return typeof value === "string" && LOCALE_PATTERN.test(value);
}

export function hasCambTextLength(value: string): boolean {
  return value.length >= MIN_TEXT_LENGTH && value.length <= MAX_TEXT_LENGTH;
}

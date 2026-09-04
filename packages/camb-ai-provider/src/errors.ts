const STATUS_MESSAGES: Record<number, string> = {
  401: "Authentication failed",
  403: "Access denied",
  422: "Invalid request",
  429: "Rate limit exceeded",
};

function fallbackForStatus(status: number): string {
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (status >= 500) return "CAMB service error";
  return "Unexpected CAMB API response";
}

function findDiagnostic(body: unknown): string | undefined {
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return undefined;

  const record = body as Record<string, unknown>;
  for (const key of ["detail", "message", "error"]) {
    if (typeof record[key] === "string") return record[key];
  }
  return undefined;
}

export class CambProviderError extends Error {
  readonly status: number;
  readonly responseBody?: unknown;

  constructor(options: {
    status: number;
    responseBody?: unknown;
    diagnostic?: string;
  }) {
    const fallback = fallbackForStatus(options.status);
    const diagnostic = options.diagnostic?.trim().slice(0, 500);
    super(
      `CAMB API request failed (${options.status}): ${fallback}${
        diagnostic ? ` — ${diagnostic}` : ""
      }`,
    );
    this.name = "CambProviderError";
    this.status = options.status;
    this.responseBody = options.responseBody;
  }
}

export async function createCambProviderError(
  response: Response,
  secrets: string[] = [],
): Promise<CambProviderError> {
  const rawBody = secrets.reduce(
    (body, secret) => (secret ? body.replaceAll(secret, "[redacted]") : body),
    (await response.text()).slice(0, 10_000),
  );
  let responseBody: unknown = rawBody;

  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      responseBody = JSON.parse(rawBody);
    } catch {
      responseBody = rawBody;
    }
  }

  return new CambProviderError({
    status: response.status,
    responseBody,
    diagnostic: findDiagnostic(responseBody),
  });
}

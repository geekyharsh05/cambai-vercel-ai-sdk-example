import { afterEach, describe, expect, it, vi } from "vitest";

import { requestCamb } from "../src/http.js";

const originalApiKey = process.env.CAMB_API_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalApiKey === undefined) delete process.env.CAMB_API_KEY;
  else process.env.CAMB_API_KEY = originalApiKey;
});

describe("requestCamb", () => {
  it("protects authentication while merging configured and request headers", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("[]"));

    await requestCamb(
      {
        apiKey: "secret",
        baseURL: "https://example.test/apis",
        headers: { "x-client": "provider", "x-api-key": "wrong" },
        fetch: fetchMock,
      },
      "/list-voices",
      { method: "GET", headers: { "x-call": "catalog", "x-api-key": "also-wrong" } },
    );

    const [url, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://example.test/apis/list-voices");
    expect(headers.get("x-client")).toBe("provider");
    expect(headers.get("x-call")).toBe("catalog");
    expect(headers.get("x-api-key")).toBe("secret");
  });

  it("reads CAMB_API_KEY lazily", async () => {
    process.env.CAMB_API_KEY = "environment-key";
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      expect(new Headers(init?.headers).get("x-api-key")).toBe("environment-key");
      return new Response("[]");
    });

    await requestCamb(
      { baseURL: "https://example.test/apis", fetch: fetchMock },
      "/list-voices",
    );
  });

  it("fails before fetch when the API key is missing", async () => {
    delete process.env.CAMB_API_KEY;
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      requestCamb(
        { baseURL: "https://example.test/apis", fetch: fetchMock },
        "/list-voices",
      ),
    ).rejects.toThrow("CAMB_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redacts the API key from upstream diagnostics", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ detail: "Invalid secret-value" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      requestCamb(
        {
          apiKey: "secret-value",
          baseURL: "https://example.test/apis",
          fetch: fetchMock,
        },
        "/list-voices",
      ),
    ).rejects.not.toThrow("secret-value");
  });
});

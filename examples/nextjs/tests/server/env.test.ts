import { afterEach, describe, expect, it, vi } from "vitest";

import { hasCambApiKey, withCambApiKey } from "@/lib/env";

describe("CAMB environment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports a missing API key", () => {
    vi.stubEnv("CAMB_API_KEY", "");

    expect(hasCambApiKey()).toBe(false);
  });

  it("reports a configured API key", () => {
    vi.stubEnv("CAMB_API_KEY", "test-key");

    expect(hasCambApiKey()).toBe(true);
  });

  it("blocks a handler when the API key is missing", async () => {
    const handler = vi.fn(async () => new Response("ok"));

    const response = await withCambApiKey(handler, () => false)();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "The server is missing CAMB_API_KEY.",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("forwards arguments when the API key is configured", async () => {
    const handler = vi.fn(async (request: Request) => new Response(request.url));
    const guarded = withCambApiKey(handler, () => true);
    const request = new Request("http://localhost/api/catalog");

    const response = await guarded(request);

    await expect(response.text()).resolves.toBe(request.url);
    expect(handler).toHaveBeenCalledWith(request);
  });
});

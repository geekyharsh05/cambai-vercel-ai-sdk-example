import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveCambApiKey } from "../src/env.js";

describe("resolveCambApiKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers an explicitly configured key", () => {
    vi.stubEnv("CAMB_API_KEY", "environment-key");

    expect(resolveCambApiKey("explicit-key")).toBe("explicit-key");
  });

  it("reads the environment lazily", () => {
    vi.stubEnv("CAMB_API_KEY", "first-key");
    expect(resolveCambApiKey()).toBe("first-key");

    vi.stubEnv("CAMB_API_KEY", "second-key");
    expect(resolveCambApiKey()).toBe("second-key");
  });

  it("explains how to configure a missing key", () => {
    vi.stubEnv("CAMB_API_KEY", "");

    expect(() => resolveCambApiKey()).toThrow(
      "CAMB_API_KEY is required. Set it in the server environment or pass apiKey to createCamb().",
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  asRecord,
  hasCambTextLength,
  isLowercaseLocale,
  isPositiveInteger,
  nonEmptyString,
} from "../src/validation.js";

describe("shared validation", () => {
  it("accepts plain records and rejects arrays and null", () => {
    expect(asRecord({ id: 1 })).toEqual({ id: 1 });
    expect(asRecord([])).toBeUndefined();
    expect(asRecord(null)).toBeUndefined();
  });

  it("normalizes non-empty strings", () => {
    expect(nonEmptyString("  voice  ")).toBe("voice");
    expect(nonEmptyString("   ")).toBeUndefined();
    expect(nonEmptyString(1)).toBeUndefined();
  });

  it.each([
    [1, true],
    [0, false],
    [-1, false],
    [1.5, false],
    ["1", false],
  ])("classifies positive integer %j", (value, expected) => {
    expect(isPositiveInteger(value)).toBe(expected);
  });

  it.each([
    ["en-us", true],
    ["zh-hans-cn", true],
    ["en", false],
    ["EN-US", false],
    ["en_us", false],
  ])("classifies locale %s", (value, expected) => {
    expect(isLowercaseLocale(value)).toBe(expected);
  });

  it("enforces the shared CAMB text limits", () => {
    expect(hasCambTextLength("Hi")).toBe(false);
    expect(hasCambTextLength("Hey")).toBe(true);
    expect(hasCambTextLength("x".repeat(3_000))).toBe(true);
    expect(hasCambTextLength("x".repeat(3_001))).toBe(false);
  });
});

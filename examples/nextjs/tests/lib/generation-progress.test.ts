import { describe, expect, it } from "vitest";

import {
  readTranslatedSpeechStream,
  TranslatedSpeechStreamError,
} from "@/lib/generation-progress";

describe("translated speech stream", () => {
  it("preserves resumable timeout details", async () => {
    const response = new Response(
      `${JSON.stringify({
        type: "error",
        error: "Still processing",
        status: "CLIENT_TIMEOUT",
        taskId: "task_pending",
        canResume: true,
      })}\n`,
    );

    const promise = readTranslatedSpeechStream(response, () => undefined);
    await expect(promise).rejects.toBeInstanceOf(TranslatedSpeechStreamError);
    await expect(promise).rejects.toMatchObject({
      status: "CLIENT_TIMEOUT",
      taskId: "task_pending",
      canResume: true,
    });
  });
});

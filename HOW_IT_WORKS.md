# How This Project Works

This project connects the AI SDK to CAMB.AI and keeps CAMB-specific HTTP details in one reusable package.

For normal text-to-speech, an application calls AI SDK `generateSpeech()` with `camb.speech(...)`. The provider changes the standard fields into CAMB's request format, adds the secret API key on the server, calls `/tts-stream`, and returns the audio bytes.

```text
AI SDK generateSpeech()
        ↓
CAMB provider
        ↓
POST /tts-stream
        ↓
audio
```

The provider can also load the account's voices and CAMB's supported languages. The example uses those methods to build dropdowns, so users choose real options instead of typing voice IDs and locale codes by hand.

Translated speech takes longer because CAMB runs it as a task. The package starts the task, checks its status until it succeeds, and then downloads two results: the translated text and the generated audio.

The provider checks every five seconds for up to five minutes. Stopping the browser or reaching that local limit does not cancel CAMB's remote work. The example keeps the task ID and lets the user resume checking the same task, so it does not spend time or credits creating a duplicate.

```text
camb.translatedSpeech()
        ↓
create task
        ↓
wait for SUCCESS
        ↓
translated text + audio
```

`camb.resumeTranslatedSpeech({ taskId })` enters the same flow at the status-check step.

Polling has a time limit and can be cancelled. If CAMB reports an error, timeout, or payment problem, the package returns a useful typed error without exposing the API key.

The package also emits progress events when a translated task is submitted, remains in processing, starts retrieving results, and completes. CAMB does not return a precise percentage. The example therefore shows honest stages, the number of status checks, and elapsed time instead of pretending to know exactly how much audio has been generated.

The Next.js example proves that the package works like a published library. It imports `@camb-ai/vercel-ai-sdk-provider` through the Bun workspace and calls it only from server routes. During translated speech, the local route streams small newline-delimited JSON records to update the progress panel, then sends the translated text and audio as the final record. The browser never talks directly to CAMB.

In one sentence: **the package makes CAMB speech easy to use from AI SDK applications while also providing small helpers for voices, languages, and translate-then-speak.**

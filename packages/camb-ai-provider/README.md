# @camb-ai/vercel-ai-sdk-provider

CAMB.AI speech support for AI SDK 7, plus typed voice/language catalogs and translated text-to-speech.

```bash
bun add ai @camb-ai/vercel-ai-sdk-provider
```

Set `CAMB_API_KEY` in the server environment. Never import or run this provider from browser code.

## AI SDK text-to-speech

```ts
import { camb } from "@camb-ai/vercel-ai-sdk-provider";
import { generateSpeech } from "ai";

const result = await generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Hello from CAMB.AI!",
  voice: "147320",
  language: "en-us",
  outputFormat: "wav",
});
```

## Discover voices and languages

```ts
const voices = await camb.voices.list();
const sources = await camb.languages.listSource();
const targets = await camb.languages.listTarget();
```

## Translate and speak

```ts
const result = await camb.translatedSpeech({
  text: "Welcome to our application",
  voiceId: voices[0]!.id,
  sourceLanguage: "en-us",
  targetLanguage: "es-es",
  onProgress: (progress) => {
    console.log(progress.phase, progress.elapsedMs);
  },
});

console.log(result.translatedText);
console.log(result.audio); // Uint8Array
```

`translatedSpeech()` returns `translatedText`, `audio`, `mediaType`, `taskId`, and `runId`. It accepts `pollIntervalMs`, `timeoutMs`, `abortSignal`, and `onProgress`; defaults are 5 seconds and 5 minutes. Progress phases are `submitted`, `processing`, `retrieving`, and `complete`. They reflect CAMB's real task lifecycle and intentionally do not claim an exact completion percentage.

If the local polling window expires, the thrown `CambTranslatedSpeechError` retains its `taskId`. Continue the same server-side task without submitting the text again:

```ts
const result = await camb.resumeTranslatedSpeech({ taskId });
```

## Supported capabilities

- AI SDK `SpeechModelV4` through `POST /tts-stream`
- WAV, MP3, FLAC, and supported PCM output for direct TTS
- Typed CAMB-specific direct-TTS options
- `GET /list-voices`, accepting both documented response shapes
- Source and target language catalogs
- Translated TTS task creation, bounded polling, and text/audio retrieval
- Sanitized HTTP and task errors

For explicit server-side configuration, use `createCamb({ apiKey, baseURL, headers, fetch })`.

## Internal boundaries

The package keeps cross-cutting behavior focused and private: `env.ts` lazily
resolves authentication, `validation.ts` contains shared input and response
predicates, `constants.ts` contains shared protocol values, and `http.ts` is the
single authenticated CAMB request boundary. Endpoint-specific mapping remains in
its feature module so the public API stays small and the workflows remain easy
to follow.

See the [CAMB TTS documentation](https://docs.camb.ai/tutorials/tts-with-api) and [translated TTS documentation](https://docs.camb.ai/tutorials/translated-tts).

## License

MIT

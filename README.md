# CAMB.AI Provider for the AI SDK

This Bun workspace contains a publishable CAMB.AI provider and a minimal Next.js example that consumes it by package name.

The provider supports:

- AI SDK `generateSpeech()` through CAMB `/tts-stream`.
- Listing the voices available to the authenticated account.
- Listing CAMB source and target languages.
- Translated TTS that returns translated text and generated audio together.

## Run the example

Requirements: Bun 1.3.14 or newer and a CAMB.AI API key.

```bash
bun install
cp examples/nextjs/.env.example examples/nextjs/.env.local
```

Put your key in `examples/nextjs/.env.local`:

```bash
CAMB_API_KEY=your_camb_api_key
```

Start the app:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose `Speak` for direct TTS or `Translate & speak` for translated text plus audio. Voice and language options are loaded from CAMB using your account key.

## Install the package

After publication:

```bash
bun add ai @camb-ai/vercel-ai-sdk-provider
```

Use the package only in server-side code.

### AI SDK speech

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

const audioBytes = result.audio.uint8Array;
```

### Voices and languages

```ts
import { camb } from "@camb-ai/vercel-ai-sdk-provider";

const [voices, sourceLanguages, targetLanguages] = await Promise.all([
  camb.voices.list(),
  camb.languages.listSource(),
  camb.languages.listTarget(),
]);
```

Each voice has a normalized `id` and `name`, with language, gender, age, description, transcript, and publication metadata when CAMB provides them. Languages use `{ id, name, locale }`.

### Translated speech

```ts
import { camb } from "@camb-ai/vercel-ai-sdk-provider";

const result = await camb.translatedSpeech({
  text: "Welcome to our application",
  voiceId: 144300,
  sourceLanguage: "en-us",
  targetLanguage: "es-es",
  onProgress: (progress) => {
    console.log(progress.phase, progress.elapsedMs);
  },
});

console.log(result.translatedText);
console.log(result.audio);     // Uint8Array
console.log(result.mediaType); // e.g. audio/wav
console.log(result.taskId, result.runId);
```

Translated speech creates a CAMB task, polls it every five seconds, and keeps checking for five minutes by default. Both values are configurable, and cancellation is supported:

```ts
await camb.translatedSpeech({
  text: "Hello world",
  voiceId: 144300,
  sourceLanguage: "en-us",
  targetLanguage: "fr-fr",
  pollIntervalMs: 1_000,
  timeoutMs: 90_000,
  abortSignal: controller.signal,
});
```

If local polling stops or reaches its deadline, CAMB keeps the remote task alive. Save the `taskId` from `CambTranslatedSpeechError` and resume it without creating a duplicate task:

```ts
const result = await camb.resumeTranslatedSpeech({
  taskId: "your-existing-task-id",
});
```

The progress callback reports real lifecycle transitions—`submitted`, `processing`, `retrieving`, and `complete`. CAMB reports task status rather than an exact completion percentage, so applications should present these as stages instead of inventing a numeric percentage.

## Explicit configuration

The default `camb` instance reads `CAMB_API_KEY`. Tests and advanced server environments can create an instance directly:

```ts
import { createCamb } from "@camb-ai/vercel-ai-sdk-provider";

const camb = createCamb({
  apiKey: process.env.CAMB_API_KEY,
  baseURL: "https://client.camb.ai/apis",
});
```

Standard AI SDK options such as `speed` and `instructions` are mapped when CAMB supports them. Additional direct-TTS controls are available through `providerOptions.camb`: `speakingRate`, `sampleRate`, `inferenceSteps`, and `enhanceNamedEntitiesPronunciation`.

## Local package workflow

The example declares the provider as a `workspace:*` dependency and imports `@camb-ai/vercel-ai-sdk-provider`, never its source directory. This mirrors normal package use while developing locally.

Create and verify the publishable npm archive:

```bash
bun run pack:provider
```

The archive is written to `artifacts/camb-ai-vercel-ai-sdk-provider-0.1.0.tgz`.

## Example structure

The Next.js demo follows a feature-oriented DRY structure. `app/page.tsx` is a
small server component that composes reusable presentation sections. The
interactive studio lives under `app/components/voice-studio`, while
`app/hooks/use-voice-studio.ts` owns form state, CAMB catalog loading, generation,
progress, cancellation, and audio URL cleanup.

Stable models, formats, route paths, copy defaults, and progress stages are in
`app/lib/constants.ts`, while `app/lib/env.ts` owns the shared server-side CAMB
API-key guard. Server validation lives in `app/_server/schemas`, SDK-only calls
live in `app/_server/services`, and shared response helpers live in
`app/_server/shared`. Each `app/api/*/route.ts` owns its `GET` or `POST` HTTP
behavior directly and calls the focused CAMB service it needs.
Cross-folder imports use the `@/` alias rooted at `examples/nextjs/app`; local
same-folder imports remain relative.

## Verification

```bash
bun run test
bun run typecheck
bun run build
bun run build:example
bun run pack:provider
```

Tests mock `fetch`; they do not call CAMB or require a real key.

## Security and limits

The provider and API key must remain server-side. The example browser calls local Next.js routes and never receives `CAMB_API_KEY`. Account voice catalogs are returned with private, no-store caching. Translated speech uses a local NDJSON stream so lifecycle updates reach the progress panel while CAMB continues processing.

This v1 does not include transcription, voice cloning, sound effects, standalone translation without speech, analytics, persistence, or automatic retries.

## License

MIT

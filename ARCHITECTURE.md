# CAMB.AI × Vercel AI SDK — Architecture & Technical Design

## 1. Purpose

This document describes the architecture of a community-maintained Vercel AI SDK provider for CAMB.AI.

The provider is an **adapter**, not a replacement for the CAMB SDK. Direct speech follows the AI SDK model contract; voice/language discovery and translated TTS are exposed as narrow provider-native helpers because the AI SDK speech result cannot represent translated text plus an asynchronous task.

The implemented v1 surface is:

```text
camb.speech(modelId)          -> AI SDK SpeechModelV4 -> POST /tts-stream
camb.voices.list()            -> GET /list-voices
camb.languages.listSource()   -> GET /source-languages
camb.languages.listTarget()   -> GET /target-languages
camb.translatedSpeech(...)    -> create task -> poll -> translated text + audio
```

The architectural objective is:

```text
AI SDK application
       |
       | standard AI SDK speech API
       v
CAMB AI SDK Provider
       |
       | CAMB REST API
       v
CAMB MARS TTS
       |
       v
Audio
```

The application should not need to understand CAMB's REST API.

---

# 2. Design Principles

## Principle 1 — Follow the AI SDK abstraction

The provider should implement the current AI SDK speech-provider contract rather than inventing a parallel API.

Vercel's provider architecture exists specifically to standardize access to provider-specific models and capabilities.

For this project, the relevant capability is:

```text
SpeechModel
```

---

## Principle 2 — Keep CAMB-specific behavior inside the provider

Application code:

```ts
generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Hello!",
});
```

Provider internals:

```text
CAMB endpoint
CAMB headers
CAMB model field
CAMB voice_id
CAMB output_configuration
CAMB error format
```

This keeps the application's dependency on CAMB small and explicit.

---

# 3. High-Level Architecture

```text
┌──────────────────────────────────────────┐
│              User Application             │
│                                           │
│  Next.js / Node / Serverless / Bun        │
└────────────────────┬─────────────────────┘
                     │
                     │ generateSpeech()
                     ▼
┌──────────────────────────────────────────┐
│              Vercel AI SDK                │
│                                           │
│         Speech generation API             │
└────────────────────┬─────────────────────┘
                     │
                     │ SpeechModel contract
                     ▼
┌──────────────────────────────────────────┐
│      @camb-ai/vercel-ai-sdk-provider         │
│                                           │
│  ┌────────────────────────────────────┐   │
│  │ Provider Factory                   │   │
│  │ createCamb()                       │   │
│  └────────────────┬───────────────────┘   │
│                   │                       │
│  ┌────────────────▼───────────────────┐   │
│  │ CAMB Speech Model                  │   │
│  │ camb.speech(modelId)               │   │
│  └────────────────┬───────────────────┘   │
│                   │                       │
│  ┌────────────────▼───────────────────┐   │
│  │ Request Adapter                    │   │
│  │ AI SDK → CAMB JSON                 │   │
│  └────────────────┬───────────────────┘   │
│                   │                       │
│  ┌────────────────▼───────────────────┐   │
│  │ HTTP / Error Adapter               │   │
│  │ fetch + response handling          │   │
│  └────────────────┬───────────────────┘   │
└───────────────────┼──────────────────────┘
                    │
                    │ HTTPS
                    ▼
┌──────────────────────────────────────────┐
│              CAMB.AI API                 │
│                                          │
│ POST /apis/tts-stream                    │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│                 MARS                     │
│                                          │
│ Flash / Pro / Instruct                   │
└────────────────────┬─────────────────────┘
                     │
                     ▼
                Audio bytes
```

---

# 4. Component Responsibilities

## 4.1 Provider Factory

File:

```text
src/provider.ts
```

Responsibilities:

- create provider instances
- resolve base URL
- configure headers
- expose `speech(modelId)`
- expose the `voices` and `languages` catalog namespaces
- expose `translatedSpeech(options)` as a typed compound operation
- expose the provider identity

Example conceptual API:

```ts
const camb = createCamb({
  apiKey: process.env.CAMB_API_KEY,
});

const model = camb.speech("mars-8.1-flash-beta");
```

The provider factory should contain almost no CAMB request logic.

---

## 4.2 Speech Model

File:

```text
src/speech-model.ts
```

Responsibilities:

- implement the current AI SDK SpeechModel contract
- hold `modelId`
- accept AI SDK generation options
- call the CAMB API
- transform CAMB response into the AI SDK result

Conceptual flow:

```text
doGenerate(options)
       |
       +-- extract text
       |
       +-- extract generic speech settings
       |
       +-- extract providerOptions.camb
       |
       +-- construct CAMB request
       |
       +-- perform HTTP request
       |
       +-- validate response
       |
       +-- convert audio
       |
       +-- return AI SDK result
```

---

## 4.3 Shared Provider Internals

Cross-cutting behavior is split into focused internal modules:

```text
src/env.ts         -> lazy explicit-key / CAMB_API_KEY resolution
src/validation.ts  -> shared external-data and input predicates
src/constants.ts   -> shared CAMB protocol constants
src/http.ts        -> authenticated requests, header merging, safe errors
```

These modules are private package internals. Feature modules keep their own
payload mapping, response interpretation, progress, and endpoint-specific error
messages so the abstraction boundary remains easy to follow.

---

# 5. Request Flow

Example application call:

```ts
const result = await generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Hello from CAMB.AI!",
  voice: "147320",
  language: "en-us",
});
```

The provider transforms it into:

```json
{
  "text": "Hello from CAMB.AI!",
  "voice_id": 147320,
  "language": "en-us",
  "speech_model": "mars-8.1-flash-beta",
  "output_configuration": {
    "format": "wav"
  }
}
```

Then:

```http
POST /apis/tts-stream
x-api-key: <secret>
content-type: application/json
```

The response is audio.

Translated speech uses CAMB's task/run protocol because it produces two outputs:

```text
camb.translatedSpeech(options)
  -> POST /apis/translated-tts
  -> GET /apis/translated-tts/{task_id} until SUCCESS
  -> GET /apis/translation-result/{run_id} ┐
  -> GET /apis/tts-result/{run_id}         ┴ concurrently
  -> { translatedText, audio, mediaType, taskId, runId }
```

The helper bounds each local polling session to five minutes by default, waits five seconds between status checks, accepts an `AbortSignal`, handles every documented terminal state, and does not retry task creation. An optional `onProgress` callback emits `submitted`, `processing`, `retrieving`, and `complete` events from those real transitions. It does not fabricate a numeric completion percentage. If local polling ends first, the typed error retains the task ID; `resumeTranslatedSpeech({ taskId })` continues polling and retrieval without creating another task.

The Next.js example forwards these lifecycle events to the browser as newline-delimited JSON:

```text
provider onProgress
  -> { type: "progress", progress }
  -> { type: "result", translatedText, audioBase64, ... }
```

Validation failures remain ordinary JSON error responses before streaming begins. Failures after the stream opens are terminal `{ type: "error" }` records. The browser incrementally parses complete lines, updates the Result panel, and creates an audio object URL only after receiving the final result.

Voice and language catalogs share the same authenticated HTTP boundary. The voice parser accepts both the direct array and `{ voices: [...] }` response forms shown in CAMB documentation.

---

# 6. Data Transformation Boundary

This boundary is one of the most important design decisions.

```text
                    Provider Boundary
                          │
                          │
AI SDK representation     │      CAMB representation
──────────────────────────┼────────────────────────────
text                      │      text
voice                     │      voice_id
language                  │      language
modelId                   │      speech_model
output format             │      output_configuration.format
providerOptions.camb      │      CAMB-specific fields
                          │
```

Do not leak CAMB request field names into generic application code.

For example, avoid:

```ts
generateSpeech({
  model,
  voice_id: 147320,
  speech_model: "...",
});
```

Prefer the AI SDK abstraction and provider-specific options.

---

# 7. Provider Options Architecture

Generic parameters:

```text
text
voice
language
output format
```

should use the AI SDK's standard interface where available.

CAMB-specific parameters:

```ts
providerOptions: {
  camb: {
    speakingRate: 1.1,
    inferenceSteps: 10,
    enhanceNamedEntitiesPronunciation: true,
  },
}
```

Flow:

```text
AI SDK
  |
  +-- standard options
  |
  +-- providerOptions
          |
          +-- camb
                |
                +-- CAMB-specific configuration
```

This is the cleanest way to preserve CAMB's unique capabilities without changing the AI SDK API.

---

# 8. Authentication Architecture

```text
Application server
       |
       | CAMB_API_KEY
       v
createCamb()
       |
       v
SpeechModel
       |
       | x-api-key
       v
CAMB API
```

The API key must remain server-side.

Recommended configuration:

```bash
CAMB_API_KEY=...
```

Provider resolution:

```text
explicit apiKey
      |
      +-- if absent
             |
             +-- CAMB_API_KEY
```

Never put the key into:

- browser bundles
- client components
- URLs
- logs
- provider metadata
- thrown errors

---

# 9. Streaming / Binary Architecture

CAMB's TTS stream is fundamentally audio data.

Conceptually:

```text
CAMB
 |
 | HTTP response
 |
 +---- audio bytes ---->
 +---- audio bytes ---->
 +---- audio bytes ---->
 +---- audio bytes ---->
```

The provider must respect binary data.

Do not assume:

```text
JSON
SSE
text chunks
```

unless CAMB's current API documentation explicitly says so.

For the initial implementation, follow the exact AI SDK SpeechModel result contract.

If `doGenerate()` requires a completed audio byte sequence:

```text
CAMB stream
     |
     v
Uint8Array / ArrayBuffer
     |
     v
AI SDK result
```

This is acceptable for MVP.

Later, if the AI SDK speech specification provides a native streaming speech contract that is appropriate for CAMB, add it as a separate feature.

---

# 10. Error Architecture

```text
CAMB response
      |
      v
response.ok?
   /       \
 yes        no
 |          |
audio      error body
 |          |
 v          v
AI SDK     Provider error
result
```

Status handling:

```text
401 → authentication failure
403 → permission failure
422 → invalid request
429 → rate limit
5xx → upstream/server failure
```

The provider should preserve useful diagnostic information while avoiding secret leakage.

Good:

```text
CAMB API request failed (429)
```

Bad:

```text
CAMB API request failed:
x-api-key=sk_very_secret_value...
```

---

# 11. Model Architecture

MVP intentionally uses a pass-through model factory.

```ts
camb.speech("mars-8.1-flash-beta")
```

The provider stores:

```ts
modelId = "mars-8.1-flash-beta"
```

and maps it to:

```json
{
  "speech_model": "mars-8.1-flash-beta"
}
```

This means the provider does not need to maintain a large registry.

Benefits:

- simpler
- forward compatible with new CAMB model IDs
- less package maintenance
- fewer breaking releases

Documentation can still list known/recommended model IDs.

---

# 12. Why Not Wrap `@camb-ai/sdk`?

CAMB already has an official TypeScript SDK.

The community provider has a different responsibility.

```text
Official CAMB SDK
        |
        +-- CAMB-native API
        +-- CAMB-native types
        +-- CAMB-native workflows


Vercel AI SDK Provider
        |
        +-- AI SDK abstraction
        +-- provider/model factory
        +-- CAMB adapter
```

Using direct HTTP in the provider keeps the adapter thin and prevents a dependency chain like:

```text
AI SDK
  ↓
Community Provider
  ↓
Official CAMB SDK
  ↓
CAMB API
```

The community provider can instead be:

```text
AI SDK
  ↓
Community Provider
  ↓
CAMB API
```

The official SDK remains the right choice for developers who want the full CAMB-native API.

---

# 13. Package Dependency Architecture

Keep dependencies minimal.

Conceptually:

```text
@camb-ai/vercel-ai-sdk-provider
│
├── peerDependency
│   └── ai
│
├── dependencies
│   └── only AI SDK provider utilities/spec packages
│       if required by implementation
│
└── devDependencies
    ├── typescript
    ├── vitest
    └── @types/node
```

Do not add a general-purpose HTTP library unless it provides a concrete benefit.

Use native `fetch()`.

---

# 14. Testing Architecture

Tests should focus on boundaries.

```text
┌─────────────────────────────┐
│ AI SDK input                │
└──────────────┬──────────────┘
               │
               ▼
       Request transformer
               │
               ▼
┌─────────────────────────────┐
│ CAMB HTTP request           │
└──────────────┬──────────────┘
               │
           mocked HTTP
               │
               ▼
┌─────────────────────────────┐
│ CAMB HTTP response           │
└──────────────┬──────────────┘
               │
               ▼
       Response transformer
               │
               ▼
┌─────────────────────────────┐
│ AI SDK result               │
└─────────────────────────────┘
```

Test independently:

1. request transformation
2. headers
3. provider options
4. binary response
5. error responses
6. model IDs

No test should require a real CAMB API key.

---

# 15. Next.js Demo Architecture

The demo exists to prove the provider works in a realistic AI application.

The App Router example keeps page composition, browser state, and server request
handling separate:

```text
examples/nextjs/app/
├── page.tsx                         # server-rendered page composition
├── components/
│   ├── hero.tsx                     # static cinematic hero
│   ├── studio-intro.tsx             # static studio introduction
│   ├── site-footer.tsx              # static footer
│   └── voice-studio/
│       ├── voice-studio.tsx         # single client boundary
│       ├── speech-form.tsx          # controls and catalog selectors
│       ├── result-card.tsx          # result, error, and audio states
│       ├── generation-progress.tsx  # translated-TTS lifecycle
│       └── select-field.tsx         # reusable language selector
├── hooks/
│   └── use-voice-studio.ts          # state, requests, cancellation, cleanup
├── lib/
│   ├── constants.ts                 # models, formats, routes, UI constants
│   ├── generation-progress.ts       # NDJSON parser and progress helpers
│   └── voice-catalog.ts             # catalog types and filters
├── _server/                         # private, server-only implementation
│   ├── services/                    # CAMB and Vercel AI SDK calls only
│   ├── schemas/                     # pure request parsing and validation
│   └── shared/                      # shared response helpers
└── api/                             # public HTTP behavior
    ├── catalog/route.ts             # GET, sorting, response mapping
    ├── speech/route.ts              # POST, validation, audio response
    └── translated-speech/route.ts   # POST and progress streaming
```

The underscore-prefixed `_server` directory is a private App Router folder and
does not create a route. Its services import the concrete `camb` client and
contain only CAMB or Vercel AI SDK calls. They accept an optional narrow client
for unit tests. Public route modules own HTTP parsing, API-key guarding, response
mapping, and translated-speech streaming directly.

The root page is a server component. `VoiceStudio` is the only explicit client
boundary; it owns the client hook and passes its controller to reusable form and
result components. This keeps browser-only state and APIs out of the static hero,
intro, and footer bundles.

The example maps `@/*` to `app/*`. Cross-folder imports therefore remain stable
as modules move deeper within the feature tree, while same-folder imports stay
relative to make local relationships visible. The workspace Vitest resolver
mirrors this alias for server route and service tests.

```text
┌───────────────┐
│ Browser       │
│               │
│ text input    │
└───────┬───────┘
        │ POST
        ▼
┌───────────────────────┐
│ Next.js API route     │
│                       │
│ generateSpeech()      │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ CAMB AI Provider      │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ CAMB /tts-stream      │
└──────────┬────────────┘
           │
           ▼
        MARS
           │
           ▼
        Audio
```

The browser should never call CAMB directly.

---

# 16. Security Model

Threats to avoid:

### API key exposure

Mitigation:

```text
server-side only
```

### Logging secrets

Mitigation:

```text
sanitize errors and headers
```

### User-controlled CAMB URLs

Mitigation:

```text
baseURL is provider configuration
```

Do not let arbitrary request input choose the upstream URL.

### Malformed provider options

Mitigation:

```text
validate provider options
```

---

# 17. Versioning Strategy

Start:

```text
0.1.0
```

because the provider contract is new.

Potential breaking changes before 1.0 are acceptable.

After the API stabilizes:

```text
1.0.0
```

Pin the compatible AI SDK range appropriately.

When AI SDK provider specifications change, test the provider against the new version before publishing.

---

# 18. Community Provider Publishing Path

Vercel's documentation recommends publishing a custom provider in:

1. its own GitHub repository
2. as an npm package

Once published, the provider can be submitted to the AI SDK Community Providers documentation through a PR.

Target workflow:

```text
GitHub repository
       |
       +-- README
       +-- tests
       +-- examples
       |
       v
npm package
       |
       v
working community provider
       |
       v
AI SDK Community Providers PR
```

Do not make the AI SDK PR part of the MVP implementation dependency.

The provider should be useful independently first.

---

# 19. Future Architecture

Once TTS is stable:

```text
                  CAMB Provider
                       |
          ┌────────────┼─────────────┐
          │            │             │
       speech     transcription   translation
          │            │             │
          ▼            ▼             ▼
        MARS        CAMB API       CAMB API
```

Potential future API:

```ts
camb.speech("...")
camb.transcription("...")
camb.translation("...")
```

Each capability should implement the corresponding AI SDK specification independently.

Do not create one giant `CambModel` class.

---

# 20. Architecture Decision Record

## Decision

Implement a dedicated CAMB SpeechModel provider using the AI SDK's current provider specification.

## Alternatives considered

### A. Generic CAMB wrapper

Rejected.

Reason:

It does not integrate naturally with the AI SDK ecosystem.

### B. Wrap `@camb-ai/sdk`

Possible, but not preferred for MVP.

Reason:

Adds an unnecessary dependency layer and makes the provider less of a thin protocol adapter.

### C. Direct CAMB REST adapter

Chosen.

Reason:

- simple
- transparent
- minimal dependencies
- easy to test
- clean separation
- provider owns protocol translation

---

# 21. Success Criteria

Architecture is successful when application developers can write:

```ts
import { generateSpeech } from "ai";
import { camb } from "@camb-ai/vercel-ai-sdk-provider";

const result = await generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Welcome!",
});
```

without knowing:

```text
CAMB endpoint
CAMB HTTP headers
CAMB JSON schema
CAMB model field names
CAMB binary response handling
CAMB error format
```

The provider should make CAMB feel like a **first-class AI SDK speech provider**.

---

# 22. Interview Summary

The architectural story is:

> "I treated CAMB's integration as a provider-adapter problem. CAMB already exposes a strong native SDK, so I didn't want to duplicate it. Instead, I implemented the AI SDK's speech abstraction and translated the standard request into CAMB's `/tts-stream` API. Generic speech parameters stay in the AI SDK interface, CAMB-specific capabilities go under `providerOptions.camb`, and the provider handles authentication, binary audio, and upstream errors. The result is a small package that lets existing AI SDK applications use CAMB without learning another SDK."

That is the core technical story of the project.

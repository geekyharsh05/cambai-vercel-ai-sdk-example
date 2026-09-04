# CAMB.AI × Vercel AI SDK Provider — MVP Implementation Plan

## Goal

Build a minimal, open-source community provider that lets developers use CAMB.AI MARS text-to-speech models through the Vercel AI SDK.

Target developer experience:

```ts
import { generateSpeech } from "ai";
import { camb } from "@camb-ai/vercel-ai-sdk-provider";

const result = await generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Hello from CAMB.AI!",
  voice: "147320",
  language: "en-us",
});
```

The package is a **thin adapter** between the AI SDK Speech Model abstraction and CAMB's TTS API, with small provider-native helpers for account catalogs and the compound translated-TTS workflow. It is not intended to replace CAMB's official SDK.

---

## Source of truth

Before implementation, verify the installed AI SDK version and use its current provider/speech model types.

Primary references:

- Vercel AI SDK custom providers:
  https://ai-sdk.dev/providers/community-providers/custom-providers
- AI SDK provider/model architecture:
  https://ai-sdk.dev/docs/foundations/providers-and-models
- AI SDK source/provider specification:
  https://github.com/vercel/ai
- CAMB API documentation:
  https://docs.camb.ai/
- CAMB TTS API:
  https://docs.camb.ai/tutorials/tts-with-api
- CAMB TypeScript SDK:
  https://docs.camb.ai/sdk-guides/typescript-sdk

Important: AI SDK provider specifications evolve. Do not copy an old provider implementation blindly. Pin the `ai`/`@ai-sdk/provider` versions used by this project and implement against those exact types.

---

# 1. MVP Scope

## Must have

- TypeScript
- Bun package manager
- npm package structure
- `createCamb()` factory
- default `camb` provider instance
- `camb.speech(modelId)`
- `camb.voices.list()`
- `camb.languages.listSource()` and `listTarget()`
- `camb.translatedSpeech()` returning translated text and audio
- CAMB API-key authentication
- MARS TTS request mapping
- voice ID
- language
- output format
- provider-specific options
- successful audio response
- useful HTTP error handling
- unit tests with mocked HTTP
- README with a working example

## Initial model IDs

Support arbitrary CAMB model IDs at the provider layer, with documentation/examples for:

- `mars-8.1-flash-beta`
- `mars-8.1-pro-beta`
- `mars-flash`
- `mars-pro`
- `mars-instruct`

Do not build a complicated model registry in MVP.

## Explicitly out of scope

- transcription
- voice cloning
- standalone translation without speech
- sound effects
- language models
- embeddings
- image generation
- billing
- analytics
- browser-side API key handling
- automatic retries
- a large UI

These can be future work.

---

# 2. Repository Setup

Use Bun.

```bash
mkdir camb-ai-vercel-provider
cd camb-ai-vercel-provider

bun init
bun add ai
bun add -d typescript vitest @types/node
```

Add the AI SDK provider/specification packages only if the exact implementation requires them:

```bash
bun add @ai-sdk/provider @ai-sdk/provider-utils
```

Do not add dependencies merely because an older provider example uses them. Keep the dependency graph minimal.

Recommended package metadata:

```json
{
  "name": "@camb-ai/vercel-ai-sdk-provider",
  "version": "0.1.0",
  "description": "CAMB.AI provider for the Vercel AI SDK",
  "license": "MIT"
}
```

Use a scoped package name initially. If CAMB wants to publish/own the package later, the package can be transferred or renamed.

---

# 3. Recommended File Structure

```text
camb-ai-vercel-provider/
├── src/
│   ├── index.ts
│   ├── provider.ts
│   ├── speech-model.ts
│   ├── types.ts
│   └── errors.ts
│
├── tests/
│   └── speech-model.test.ts
│
├── examples/
│   └── nextjs/
│
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
└── .env.example
```

Keep the implementation intentionally small.

---

# 4. Public API

The main public API should be:

```ts
export const camb = createCamb();

export function createCamb(options?: CambProviderSettings): CambProvider;
```

Provider settings:

```ts
export interface CambProviderSettings {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}
```

Expected behavior:

```ts
const camb = createCamb({
  apiKey: process.env.CAMB_API_KEY,
});

const model = camb.speech("mars-8.1-flash-beta");
```

The provider should also work without explicit configuration:

```ts
const model = camb.speech("mars-8.1-flash-beta");
```

when:

```text
CAMB_API_KEY
```

is present.

---

# 5. Authentication

CAMB API requests should send:

```http
x-api-key: <CAMB_API_KEY>
Content-Type: application/json
```

Never expose the API key to browser/client code.

Prefer the environment variable:

```bash
CAMB_API_KEY=your_key_here
```

Allow explicit configuration for testing and advanced server-side usage.

Never log:

- API keys
- Authorization headers
- full secret-bearing request headers

---

# 6. CAMB Endpoint

MVP target:

```http
POST https://client.camb.ai/apis/tts-stream
```

The base URL should be configurable so tests can use a local mock server.

Provider configuration:

```ts
const camb = createCamb({
  baseURL: "https://client.camb.ai/apis",
});
```

The implementation should normalize trailing slashes.

Do not hard-code the URL in multiple files.

---

# 7. Request Mapping

AI SDK input should be translated into CAMB's TTS request.

Conceptual CAMB payload:

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

The adapter owns this transformation.

Keep it isolated so it can be unit-tested independently.

---

# 8. Provider Options

Generic speech settings should use the AI SDK's standard fields wherever possible.

CAMB-specific fields should live under:

```ts
providerOptions: {
  camb: {
    ...
  }
}
```

Example:

```ts
const result = await generateSpeech({
  model: camb.speech("mars-instruct"),
  text: "[excited] Welcome to CAMB.AI!",
  voice: "147320",
  language: "en-us",
  providerOptions: {
    camb: {
      speakingRate: 1.1,
      inferenceSteps: 10,
      enhanceNamedEntitiesPronunciation: true,
    },
  },
});
```

Define and export:

```ts
export interface CambSpeechModelOptions {
  speakingRate?: number;
  inferenceSteps?: number;
  enhanceNamedEntitiesPronunciation?: boolean;
}
```

Use the exact AI SDK provider-options typing pattern for the installed version.

Do not expose every CAMB API field in MVP.

---

# 9. Speech Model Implementation

Implement the AI SDK's current Speech Model interface for the installed SDK version.

The model needs:

```text
specificationVersion
provider
modelId
doGenerate()
```

If the current specification requires additional members, implement those required by the installed version.

Core responsibility:

```text
doGenerate()
    |
    +-- validate options
    |
    +-- build CAMB request
    |
    +-- fetch CAMB /tts-stream
    |
    +-- handle non-2xx response
    |
    +-- return audio in AI SDK's expected result shape
```

Do not implement unrelated provider interfaces.

---

# 10. Streaming / Audio Handling

CAMB's TTS endpoint returns audio data.

Important:

- Do not parse a successful audio response as JSON.
- Do not base64 encode the audio unless the AI SDK contract requires it.
- Do not unnecessarily buffer the entire audio response.
- Preserve binary audio bytes.
- Follow the current AI SDK SpeechModel result contract exactly.

For MVP, optimize for correctness first.

If the installed AI SDK SpeechModel contract requires a byte array for `doGenerate()`, buffer the response at that boundary. Do not invent a custom streaming return type.

If a future AI SDK version exposes a streaming speech model contract, add it as a separate enhancement.

---

# 11. Error Handling

Handle at least:

```text
401 → authentication error
403 → permission/access error
422 → invalid request
429 → rate limit
5xx → CAMB server error
```

Generic fallback:

```text
other non-2xx → provider error
```

Critical rule:

```text
if response.ok:
    treat body as audio

else:
    treat body as an error response
```

Do not attempt to decode an error response as audio.

Error messages should include useful context:

```text
CAMB API request failed (429): Rate limit exceeded
```

but must never expose the API key.

---

# 12. Tests

Use Vitest.

Test the provider without making real CAMB requests.

## Test 1 — Provider creation

```ts
const camb = createCamb({
  apiKey: "test-key",
});

expect(camb.speech("mars-8.1-flash-beta")).toBeDefined();
```

## Test 2 — Request transformation

Verify:

```text
text
voice
language
model
output format
```

are mapped correctly.

## Test 3 — Authentication

Verify:

```http
x-api-key: test-key
```

is sent.

## Test 4 — Provider options

Verify:

```text
speakingRate
inferenceSteps
enhanceNamedEntitiesPronunciation
```

map to the expected CAMB fields.

## Test 5 — Audio response

Mock binary audio and verify the returned AI SDK result contains the expected bytes.

## Test 6 — Error handling

At minimum test:

```text
401
422
429
500
```

---

# 13. Example Application

Create a tiny Next.js example only after the package itself works.

Architecture:

```text
Browser
   |
   | POST text
   v
Next.js Route
   |
   v
AI SDK generateSpeech()
   |
   v
CAMB Provider
   |
   v
CAMB /tts-stream
   |
   v
MARS
   |
   v
Audio
```

The example should demonstrate:

- model selection
- text input
- voice ID
- language
- generated audio

Do not spend time making the UI beautiful.

---

# 14. README Requirements

The README should contain:

1. What the provider is
2. Installation
3. Environment variable
4. Basic example
5. Supported models
6. Provider-specific options
7. Server-side usage warning
8. Development commands
9. Testing
10. Link to CAMB documentation
11. Link to AI SDK documentation
12. Roadmap
13. License

Installation:

```bash
bun add ai @camb-ai/vercel-ai-sdk-provider
```

Usage:

```ts
import { generateSpeech } from "ai";
import { camb } from "@camb-ai/vercel-ai-sdk-provider";

const result = await generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Hello from CAMB.AI!",
  voice: "147320",
  language: "en-us",
});
```

---

# 15. Development Commands

Recommended scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "dev": "vitest"
  }
}
```

Before committing:

```bash
bun run typecheck
bun test
bun run build
```

---

# 16. Git Workflow

Initial commits:

```text
chore: initialize bun typescript package
feat: add CAMB provider factory
feat: implement CAMB speech model
feat: map CAMB speech options
test: add speech provider tests
docs: add usage and architecture
feat: add nextjs example
```

Keep commits small enough that an interviewer can understand the progression.

---

# 17. Definition of Done

The MVP is done when all of these are true:

- [ ] `bun install` works
- [ ] TypeScript compiles
- [ ] `bun test` passes
- [ ] Provider can be created
- [ ] `camb.speech(modelId)` works
- [ ] CAMB API key is read correctly
- [ ] CAMB request payload is correct
- [ ] Audio response is returned in the AI SDK format
- [ ] 401/422/429/5xx errors are handled
- [ ] providerOptions work
- [ ] README has a copy-paste example
- [ ] Next.js demo can generate audio
- [ ] API key never reaches the browser
- [ ] GitHub repository is clean and understandable

---

# 18. What NOT to Overengineer

Do not add:

- Axios
- a custom HTTP client
- a database
- a state-management library
- a model registry service
- a complex class hierarchy
- automatic retries
- caching
- analytics
- a CLI
- a dashboard

Native `fetch()` is sufficient for the MVP.

The project should communicate:

> "This is a small, standards-compliant adapter."

not:

> "I built an entire SDK platform."

---

# 19. Interview Narrative

The project should demonstrate five engineering decisions.

### 1. Ecosystem integration

CAMB already has an SDK. The opportunity is to expose CAMB through an existing AI application ecosystem.

### 2. Standard abstraction

Use the AI SDK Speech Model abstraction instead of inventing a CAMB-specific application API.

### 3. Provider-specific extensibility

Use `providerOptions.camb` for features that do not belong in the generic AI SDK interface.

### 4. Streaming/binary awareness

CAMB's TTS endpoint produces audio. The provider must preserve the correct binary semantics.

### 5. Thin adapter architecture

Keep CAMB-specific protocol handling inside the provider while leaving application code provider-agnostic.

---

# 20. Future Roadmap

After MVP:

```text
MVP
 |
 +-- TTS
 |    +-- MARS Flash
 |    +-- MARS Pro
 |    +-- MARS Instruct
 |
 +-- Better streaming support
 |
 +-- Voice discovery
 |
 +-- More CAMB provider options
 |
 +-- Transcription provider
 |
 +-- Translation provider
 |
 +-- Additional CAMB capabilities
 |
 +-- AI SDK Community Provider submission
```

Do not implement this roadmap before the MVP works.

---

# 21. Final Principle

The package should make this possible:

```ts
generateSpeech({
  model: camb.speech("mars-8.1-flash-beta"),
  text: "Hello!",
});
```

while hiding:

```text
API URL
API key
HTTP headers
CAMB JSON schema
CAMB model field names
binary response handling
CAMB errors
```

from the application developer.

That is the provider.

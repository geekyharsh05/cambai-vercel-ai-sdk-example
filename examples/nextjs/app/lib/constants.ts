export const MODELS = [
  "mars-8.1-flash-beta",
  "mars-8.1-pro-beta",
  "mars-flash",
  "mars-pro",
  "mars-instruct",
] as const;

export const OUTPUT_FORMATS = ["wav", "mp3", "flac"] as const;

export const DEFAULT_TEXT =
"Hi, this is Harsh. I noticed CAMB already has a strong TypeScript SDK and MARS TTS API, so I built a POC Vercel AI SDK provider for CAMB, along with a small Next.js demo showing the LLM MARS pipeline."
;

export const API_ROUTES = {
  catalog: "/api/catalog",
  speech: "/api/speech",
  translatedSpeech: "/api/translated-speech",
} as const;

export const HERO_VIDEO_URL =
  "https://designerstephen.github.io/public-assets/videos/serene-art-hero.mp4";

export const TRANSLATED_TIMEOUT_MS = 300_000;

export const TRANSLATED_STAGES = [
  "Submitting",
  "Generating with CAMB",
  "Retrieving results",
  "Ready",
] as const;

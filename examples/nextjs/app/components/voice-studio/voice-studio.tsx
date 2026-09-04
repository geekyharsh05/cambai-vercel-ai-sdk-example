"use client";

import { useVoiceStudio } from "@/hooks/use-voice-studio";
import { ResultCard } from "./result-card";
import { SpeechForm } from "./speech-form";

export function VoiceStudio() {
  const studio = useVoiceStudio();

  return (
    <>
      <SpeechForm studio={studio} />
      <ResultCard studio={studio} />
    </>
  );
}

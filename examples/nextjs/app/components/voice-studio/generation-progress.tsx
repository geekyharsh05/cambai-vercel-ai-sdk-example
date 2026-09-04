import type { CambTranslatedSpeechProgress } from "@camb-ai/vercel-ai-sdk-provider";

import {
  TRANSLATED_STAGES,
  TRANSLATED_TIMEOUT_MS,
} from "@/lib/constants";
import {
  formatElapsed,
  translatedStep,
} from "@/lib/generation-progress";

export function GenerationProgress({
  mode,
  elapsedMs,
  progress,
}: {
  mode: "speak" | "translate";
  elapsedMs: number;
  progress?: CambTranslatedSpeechProgress;
}) {
  if (mode === "speak") {
    return (
      <div
        className="generationProgress directProgress"
        role="progressbar"
        aria-label="Direct speech generation progress"
        aria-valuetext="CAMB is generating speech"
      >
        <div className="progressHeader">
          <strong>Generating speech with CAMB</strong>
          <code>{formatElapsed(elapsedMs)} elapsed</code>
        </div>
        <div className="directTrack" aria-hidden="true">
          <span />
        </div>
        <p>Waiting for the audio response. No exact percentage is available.</p>
      </div>
    );
  }

  const step = translatedStep(progress);
  const currentStage = TRANSLATED_STAGES[step - 1];
  const polls = progress?.phase === "processing" ? progress.attempt : undefined;
  const remainingMs = Math.max(0, TRANSLATED_TIMEOUT_MS - elapsedMs);
  const detail =
    step === 1
      ? "Creating a secure translated-speech task."
      : step === 2
        ? "CAMB is translating and voicing the text. This usually takes 2–5 minutes."
        : step === 3
          ? "The task succeeded. Downloading translated text and audio."
          : "Translation and audio generation completed successfully.";

  return (
    <div
      className="generationProgress"
      role="progressbar"
      aria-label="Translated speech generation progress"
      aria-valuetext={`${currentStage}, step ${step} of 4`}
    >
      <div className="progressHeader">
        <strong>{currentStage}</strong>
        <code>Step {step} of 4</code>
      </div>
      <div className="segmentTrack" aria-hidden="true">
        {TRANSLATED_STAGES.map((stage, index) => {
          const stageNumber = index + 1;
          const complete = stageNumber < step || step === 4;
          const active = stageNumber === step && step < 4;
          return (
            <span
              key={stage}
              className={`${complete ? "complete" : ""} ${
                active ? "active" : ""
              }`}
            />
          );
        })}
      </div>
      <ol className="stageLabels">
        {TRANSLATED_STAGES.map((stage, index) => (
          <li key={stage} className={index + 1 <= step ? "reached" : ""}>
            {stage}
          </li>
        ))}
      </ol>
      <div className="progressFooter">
        <p>{detail}</p>
        <code>
          {polls ? `${polls} ${polls === 1 ? "check" : "checks"} · ` : ""}
          {formatElapsed(elapsedMs)} elapsed
          {step < 4
            ? ` · ${formatElapsed(remainingMs)} checking window`
            : ""}
        </code>
      </div>
    </div>
  );
}

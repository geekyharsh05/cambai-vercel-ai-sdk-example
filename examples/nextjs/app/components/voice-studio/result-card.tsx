import type { VoiceStudioController } from "@/hooks/use-voice-studio";
import { languageLabel } from "@/lib/voice-catalog";
import { GenerationProgress } from "./generation-progress";

export function ResultCard({ studio }: { studio: VoiceStudioController }) {
  const {
    mode,
    loading,
    error,
    audioUrl,
    translatedText,
    resultMeta,
    progress,
    pendingTask,
    elapsedMs,
    selectedTargetLanguage,
    targetLanguage,
    showTranslatedProgress,
    resumeGeneration,
    stopChecking,
  } = studio;

  return (
    <section
      className={`resultCard ${audioUrl ? "ready" : ""}`}
      aria-labelledby="result-title"
      aria-live="polite"
    >
      <div className="sectionHeading">
        <h2 id="result-title">Result</h2>
        <span
          className={`resultStatus ${error ? "failed" : ""} ${
            pendingTask ? "paused" : ""
          }`}
        >
          {error
            ? "Error"
            : pendingTask
              ? "Still processing"
              : audioUrl
              ? "Ready"
              : loading
                ? "Working"
                : "Waiting"}
        </span>
      </div>

      {error ? <p className="errorMessage">{error}</p> : null}
      {!error && loading && mode === "speak" ? (
        <GenerationProgress mode="speak" elapsedMs={elapsedMs} />
      ) : null}
      {!error && showTranslatedProgress ? (
        <>
          <GenerationProgress
            mode="translate"
            elapsedMs={elapsedMs}
            progress={progress}
          />
          {loading ? (
            <button className="secondaryButton stopButton" type="button" onClick={stopChecking}>
              Stop checking
            </button>
          ) : null}
        </>
      ) : null}
      {!error && pendingTask ? (
        <div className="pendingTaskPanel">
          <div>
            <span>Remote task saved</span>
            <p>{pendingTask.message}</p>
            <code>{pendingTask.taskId}</code>
          </div>
          <button
            className="secondaryButton"
            type="button"
            disabled={loading}
            onClick={() => void resumeGeneration()}
          >
            Resume checking <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : null}
      {!error && translatedText ? (
        <div className="translationResult">
          <span>
            Translated text ·{" "}
            {selectedTargetLanguage
              ? languageLabel(selectedTargetLanguage.name)
              : targetLanguage}
          </span>
          <p>{translatedText}</p>
        </div>
      ) : null}
      {!error && audioUrl ? (
        <div className="audioResult">
          <audio controls autoPlay src={audioUrl}>
            Your browser cannot play this audio.
          </audio>
          <small>{resultMeta}</small>
        </div>
      ) : null}
      {!error && !pendingTask && !audioUrl && !loading ? (
        <p className="emptyResult">Your generated audio will appear here.</p>
      ) : null}
    </section>
  );
}

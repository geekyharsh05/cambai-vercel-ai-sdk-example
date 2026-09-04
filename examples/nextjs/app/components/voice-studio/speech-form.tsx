import type { VoiceStudioController } from "@/hooks/use-voice-studio";
import { MODELS, OUTPUT_FORMATS } from "@/lib/constants";
import { voiceLabel, type CatalogVoice } from "@/lib/voice-catalog";
import { SelectField } from "./select-field";

export function SpeechForm({ studio }: { studio: VoiceStudioController }) {
  const {
    mode,
    text,
    catalog,
    directLanguage,
    sourceLanguage,
    targetLanguage,
    voiceId,
    model,
    outputFormat,
    loading,
    outputLanguage,
    availableVoices,
    selectedVoice,
    sourceLanguages,
    targetLanguages,
    translatedTargets,
    catalogReady,
    canSubmit,
    setText,
    setDirectLanguage,
    setTargetLanguage,
    setVoiceId,
    setModel,
    setOutputFormat,
    loadCatalog,
    changeMode,
    changeSourceLanguage,
    generate,
  } = studio;

  return (
    <section className="workspace" aria-labelledby="workspace-title">
      <div className="sectionHeading">
        <h2 id="workspace-title">Create speech</h2>
      </div>

      <form onSubmit={generate}>
        <fieldset className="modeFieldset">
          <legend>Mode</legend>
          <div className="modeSwitch" role="group" aria-label="Speech mode">
            <button
              type="button"
              className={mode === "speak" ? "active" : ""}
              aria-pressed={mode === "speak"}
              onClick={() => changeMode("speak")}
            >
              Speak
            </button>
            <button
              type="button"
              className={mode === "translate" ? "active" : ""}
              aria-pressed={mode === "translate"}
              onClick={() => changeMode("translate")}
            >
              Translate &amp; speak
            </button>
          </div>
        </fieldset>

        <label className="textField" htmlFor="script">
          <span>Text to speak</span>
          <textarea
            id="script"
            value={text}
            minLength={3}
            maxLength={3000}
            onChange={(event) => setText(event.target.value)}
            required
          />
          <small>
            <span>Keep scripts clear and conversational.</span>
            <span>{text.length} / 3000</span>
          </small>
        </label>

        {catalog.status === "error" ? (
          <div className="catalogError" role="alert">
            <span>{catalog.message}</span>
            <button type="button" onClick={() => void loadCatalog()}>
              Retry
            </button>
          </div>
        ) : null}

        <div className={`languageGrid ${mode === "translate" ? "translated" : ""}`}>
          {mode === "translate" ? (
            <>
              <SelectField
                id="source-language"
                label="From"
                value={sourceLanguage}
                languages={sourceLanguages}
                disabled={!catalogReady || loading}
                onChange={changeSourceLanguage}
              />
              <SelectField
                id="target-language"
                label="Translate to"
                value={targetLanguage}
                languages={translatedTargets}
                disabled={!catalogReady || loading}
                onChange={setTargetLanguage}
              />
            </>
          ) : (
            <SelectField
              id="speech-language"
              label="Speech language"
              value={directLanguage}
              languages={targetLanguages}
              disabled={!catalogReady || loading}
              onChange={setDirectLanguage}
            />
          )}

          <label className="selectField" htmlFor="voice">
            <span>Voice</span>
            <select
              id="voice"
              value={voiceId}
              disabled={!catalogReady || loading || availableVoices.length === 0}
              onChange={(event) => setVoiceId(event.target.value)}
              required
            >
              {!catalogReady ? <option value="">Loading voices…</option> : null}
              {catalogReady && availableVoices.length === 0 ? (
                <option value="">No voices available</option>
              ) : null}
              {availableVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voiceLabel(voice)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <VoiceMeta voice={selectedVoice} outputLanguage={outputLanguage} />

        {mode === "speak" ? <details className="advanced">
          <summary>
            Advanced settings <span aria-hidden="true">⌄</span>
          </summary>
          <div className="advancedGrid">
            <label className="selectField" htmlFor="model">
              <span>Model</span>
              <select
                id="model"
                value={model}
                disabled={loading}
                onChange={(event) => setModel(event.target.value)}
              >
                {MODELS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="selectField" htmlFor="format">
              <span>Audio format</span>
              <select
                id="format"
                value={outputFormat}
                disabled={loading}
                onChange={(event) => setOutputFormat(event.target.value)}
              >
                {OUTPUT_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details> : (
          <p className="translationTimingNote">
            CAMB manages the translated audio settings. Most tasks finish in
            roughly 2–5 minutes.
          </p>
        )}

        <div className="actionRow">
          <button className="primaryButton" disabled={!canSubmit} type="submit">
            {loading
              ? mode === "translate"
                ? "Translating and speaking…"
                : "Generating speech…"
              : mode === "translate"
                ? "Translate and generate"
                : "Generate speech"}
            <span aria-hidden="true">↗</span>
          </button>
          <p>Your API key stays on the server.</p>
        </div>
      </form>
    </section>
  );
}

function VoiceMeta({
  voice,
  outputLanguage,
}: {
  voice?: CatalogVoice;
  outputLanguage: string;
}) {
  if (!voice) return null;
  const details = [
    voice.gender,
    voice.age === undefined ? undefined : `${voice.age}`,
    voice.language,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <p className="voiceMeta">
      <span aria-hidden="true">●</span>
      {details || `Available for ${outputLanguage}`}
      {voice.description ? ` — ${voice.description}` : ""}
    </p>
  );
}

"use client";

import type { CambTranslatedSpeechProgress } from "@camb-ai/vercel-ai-sdk-provider";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  API_ROUTES,
  DEFAULT_TEXT,
  MODELS,
} from "@/lib/constants";
import {
  readTranslatedSpeechStream,
  TranslatedSpeechStreamError,
} from "@/lib/generation-progress";
import {
  voicesForLanguage,
  type CatalogLanguage,
  type CatalogResponse,
} from "@/lib/voice-catalog";

export type Mode = "speak" | "translate";

export type CatalogState =
  | { status: "loading" }
  | ({ status: "ready" } & CatalogResponse)
  | { status: "error"; message: string };

export interface PendingTranslatedTask {
  taskId: string;
  message: string;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

async function responseError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: unknown };
    return typeof payload.error === "string" ? payload.error : fallback;
  } catch {
    return fallback;
  }
}

function preferredLanguage(
  languages: CatalogLanguage[],
  locale: string,
  excludedLocale?: string,
) {
  return (
    languages.find(
      (language) =>
        language.locale === locale && language.locale !== excludedLocale,
    ) ?? languages.find((language) => language.locale !== excludedLocale)
  );
}

function audioBlobFromBase64(value: string, mediaType: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes.buffer as ArrayBuffer], { type: mediaType });
}

export function useVoiceStudio() {
  const [mode, setMode] = useState<Mode>("speak");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [directLanguage, setDirectLanguage] = useState("en-us");
  const [sourceLanguage, setSourceLanguage] = useState("en-us");
  const [targetLanguage, setTargetLanguage] = useState("es-es");
  const [voiceId, setVoiceId] = useState("");
  const [model, setModel] = useState<string>(
    MODELS[0] ?? "mars-8.1-flash-beta",
  );
  const [outputFormat, setOutputFormat] = useState("wav");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [resultMeta, setResultMeta] = useState("");
  const [progress, setProgress] =
    useState<CambTranslatedSpeechProgress>();
  const [pendingTask, setPendingTask] =
    useState<PendingTranslatedTask>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const audioUrlRef = useRef("");
  const translatedTaskIdRef = useRef("");
  const generationRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number | undefined>(undefined);

  async function loadCatalog(signal?: AbortSignal) {
    setCatalog({ status: "loading" });
    try {
      const response = await fetch(API_ROUTES.catalog, {
        signal,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await responseError(
            response,
            "Could not load CAMB voices and languages.",
          ),
        );
      }
      const payload = (await response.json()) as CatalogResponse;
      if (
        !Array.isArray(payload.voices) ||
        !Array.isArray(payload.sourceLanguages) ||
        !Array.isArray(payload.targetLanguages)
      ) {
        throw new Error("CAMB returned an invalid voice or language catalog.");
      }

      setCatalog({ status: "ready", ...payload });
      const source = preferredLanguage(payload.sourceLanguages, "en-us");
      const target = preferredLanguage(
        payload.targetLanguages,
        "es-es",
        source?.locale,
      );
      const direct = preferredLanguage(payload.targetLanguages, "en-us");
      if (source) setSourceLanguage(source.locale);
      if (target) setTargetLanguage(target.locale);
      if (direct) setDirectLanguage(direct.locale);
    } catch (caught) {
      if (isAbortError(caught)) return;
      setCatalog({
        status: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "Could not load CAMB voices and languages.",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      generationRef.current?.abort();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!loading || startedAtRef.current === undefined) return;
    const updateElapsed = () => {
      if (startedAtRef.current !== undefined) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(timer);
  }, [loading]);

  const outputLanguage = mode === "translate" ? targetLanguage : directLanguage;
  const availableVoices = useMemo(
    () =>
      catalog.status === "ready"
        ? voicesForLanguage(catalog.voices, outputLanguage)
        : [],
    [catalog, outputLanguage],
  );

  useEffect(() => {
    if (
      availableVoices.length > 0 &&
      !availableVoices.some((voice) => String(voice.id) === voiceId)
    ) {
      setVoiceId(String(availableVoices[0]!.id));
    }
  }, [availableVoices, voiceId]);

  const selectedVoice = availableVoices.find(
    (voice) => String(voice.id) === voiceId,
  );
  const sourceLanguages =
    catalog.status === "ready" ? catalog.sourceLanguages : [];
  const targetLanguages =
    catalog.status === "ready" ? catalog.targetLanguages : [];
  const translatedTargets = targetLanguages.filter(
    (language) => language.locale !== sourceLanguage,
  );
  const selectedTargetLanguage = targetLanguages.find(
    (language) => language.locale === targetLanguage,
  );

  function clearAudio() {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = "";
    setAudioUrl("");
  }

  function replaceAudio(blob: Blob) {
    const nextUrl = URL.createObjectURL(blob);
    clearAudio();
    audioUrlRef.current = nextUrl;
    setAudioUrl(nextUrl);
  }

  function changeMode(nextMode: Mode) {
    generationRef.current?.abort();
    clearAudio();
    setMode(nextMode);
    setLoading(false);
    setError("");
    setTranslatedText("");
    setResultMeta("");
    setProgress(undefined);
    setPendingTask(undefined);
    translatedTaskIdRef.current = "";
    setElapsedMs(0);
    startedAtRef.current = undefined;
  }

  function changeSourceLanguage(value: string) {
    setSourceLanguage(value);
    if (value === targetLanguage) {
      const replacement = preferredLanguage(targetLanguages, "es-es", value);
      if (replacement) setTargetLanguage(replacement.locale);
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    startedAtRef.current = Date.now();
    clearAudio();
    setLoading(true);
    setError("");
    setTranslatedText("");
    setResultMeta("");
    setProgress(undefined);
    setPendingTask(undefined);
    translatedTaskIdRef.current = "";
    setElapsedMs(0);

    try {
      if (mode === "speak") {
        const response = await fetch(API_ROUTES.speech, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text,
            model,
            voice: voiceId,
            language: directLanguage,
            outputFormat,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await responseError(response, "Speech generation failed."),
          );
        }
        replaceAudio(await response.blob());
        setResultMeta("Direct speech");
      } else {
        const response = await fetch(API_ROUTES.translatedSpeech, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "create",
            text,
            voiceId: Number(voiceId),
            sourceLanguage,
            targetLanguage,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await responseError(
              response,
              "Translated speech generation failed.",
            ),
          );
        }
        const payload = await readTranslatedSpeechStream(response, (event) => {
          translatedTaskIdRef.current = event.taskId;
          setProgress(event);
        });
        replaceAudio(
          audioBlobFromBase64(payload.audioBase64, payload.mediaType),
        );
        setTranslatedText(payload.translatedText);
        setResultMeta(`Task ${payload.taskId} · Run ${payload.runId}`);
      }
    } catch (caught) {
      if (isAbortError(caught)) return;
      if (
        caught instanceof TranslatedSpeechStreamError &&
        caught.canResume &&
        caught.taskId
      ) {
        setPendingTask({
          taskId: caught.taskId,
          message:
            "CAMB is still processing this task. Resume checking without creating another request.",
        });
      } else if (
        mode === "translate" &&
        translatedTaskIdRef.current &&
        !(caught instanceof TranslatedSpeechStreamError)
      ) {
        setPendingTask({
          taskId: translatedTaskIdRef.current,
          message:
            "The connection stopped, but CAMB may still be processing this task. Resume checking safely.",
        });
      } else {
        setProgress(undefined);
        setError(
          caught instanceof Error ? caught.message : "Speech generation failed.",
        );
      }
    } finally {
      if (generationRef.current === controller) {
        if (startedAtRef.current !== undefined) {
          setElapsedMs(Date.now() - startedAtRef.current);
        }
        generationRef.current = null;
        setLoading(false);
      }
    }
  }

  async function resumeGeneration() {
    if (!pendingTask || loading) return;
    generationRef.current?.abort();
    const controller = new AbortController();
    generationRef.current = controller;
    startedAtRef.current = Date.now();
    clearAudio();
    setLoading(true);
    setError("");
    setElapsedMs(0);
    setPendingTask(undefined);
    translatedTaskIdRef.current = pendingTask.taskId;

    try {
      const response = await fetch(API_ROUTES.translatedSpeech, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resume", taskId: pendingTask.taskId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          await responseError(response, "Could not resume translated speech."),
        );
      }
      const payload = await readTranslatedSpeechStream(response, (event) => {
        translatedTaskIdRef.current = event.taskId;
        setProgress(event);
      });
      replaceAudio(audioBlobFromBase64(payload.audioBase64, payload.mediaType));
      setTranslatedText(payload.translatedText);
      setResultMeta(`Task ${payload.taskId} · Run ${payload.runId}`);
    } catch (caught) {
      if (isAbortError(caught)) return;
      if (
        caught instanceof TranslatedSpeechStreamError &&
        caught.canResume &&
        caught.taskId
      ) {
        setPendingTask({
          taskId: caught.taskId,
          message: "CAMB is still processing. You can resume checking again.",
        });
      } else if (
        translatedTaskIdRef.current &&
        !(caught instanceof TranslatedSpeechStreamError)
      ) {
        setPendingTask({
          taskId: translatedTaskIdRef.current,
          message:
            "The connection stopped, but CAMB may still be processing. Resume checking safely.",
        });
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not resume translated speech.",
        );
      }
    } finally {
      if (generationRef.current === controller) {
        if (startedAtRef.current !== undefined) {
          setElapsedMs(Date.now() - startedAtRef.current);
        }
        generationRef.current = null;
        setLoading(false);
      }
    }
  }

  function stopChecking() {
    if (!loading || mode !== "translate") return;
    const taskId = progress?.taskId;
    generationRef.current?.abort();
    generationRef.current = null;
    setLoading(false);
    if (taskId) {
      setPendingTask({
        taskId,
        message:
          "Checking stopped in this browser. CAMB may still be processing the saved task.",
      });
    }
  }

  const catalogReady = catalog.status === "ready";
  const canSubmit =
    catalogReady &&
    availableVoices.length > 0 &&
    Boolean(voiceId) &&
    text.trim().length >= 3 &&
    !loading &&
    (mode === "speak" || sourceLanguage !== targetLanguage);
  const showTranslatedProgress =
    mode === "translate" && (loading || progress?.phase === "complete");

  return {
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
    error,
    audioUrl,
    translatedText,
    resultMeta,
    progress,
    pendingTask,
    elapsedMs,
    outputLanguage,
    availableVoices,
    selectedVoice,
    sourceLanguages,
    targetLanguages,
    translatedTargets,
    selectedTargetLanguage,
    catalogReady,
    canSubmit,
    showTranslatedProgress,
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
    resumeGeneration,
    stopChecking,
  };
}

export type VoiceStudioController = ReturnType<typeof useVoiceStudio>;

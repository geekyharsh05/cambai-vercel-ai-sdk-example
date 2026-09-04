"use client";

import { Fragment, useEffect, useRef, useState } from "react";

type TokenKind = "keyword" | "function" | "property" | "string";

type CodeToken = {
  text: string;
  kind?: TokenKind;
};

export const SPEECH_SNIPPET_LINES: readonly (readonly CodeToken[])[] = [
  [
    { text: "import", kind: "keyword" },
    { text: " { " },
    { text: "generateSpeech", kind: "function" },
    { text: " } " },
    { text: "from", kind: "keyword" },
    { text: ' "ai"', kind: "string" },
    { text: ";" },
  ],
  [
    { text: "import", kind: "keyword" },
    { text: " { camb } " },
    { text: "from", kind: "keyword" },
    { text: ' "@camb-ai/vercel-ai-sdk-provider"', kind: "string" },
    { text: ";" },
  ],
  [],
  [
    { text: "const", kind: "keyword" },
    { text: " result = " },
    { text: "await", kind: "keyword" },
    { text: " " },
    { text: "generateSpeech", kind: "function" },
    { text: "({" },
  ],
  [
    { text: "  " },
    { text: "model", kind: "property" },
    { text: ": camb." },
    { text: "speech", kind: "function" },
    { text: "(" },
    { text: '"mars-8.1-flash-beta"', kind: "string" },
    { text: ")," },
  ],
  [
    { text: "  " },
    { text: "text", kind: "property" },
    { text: ": " },
    { text: '"Welcome!"', kind: "string" },
    { text: "," },
  ],
  [
    { text: "  " },
    { text: "language", kind: "property" },
    { text: ": " },
    { text: '"en-us"', kind: "string" },
    { text: "," },
  ],
  [
    { text: "  " },
    { text: "outputFormat", kind: "property" },
    { text: ": " },
    { text: '"wav"', kind: "string" },
    { text: "," },
  ],
  [{ text: "});" }],
];

export const SPEECH_SNIPPET = SPEECH_SNIPPET_LINES.map((line) =>
  line.map((token) => token.text).join(""),
).join("\n");

type WriteText = (text: string) => Promise<void>;
type CopyStatus = "idle" | "copied" | "failed";

export async function copySpeechSnippet(
  writeText: WriteText = (text) => navigator.clipboard.writeText(text),
) {
  await writeText(SPEECH_SNIPPET);
}

export function CodeSnippetBridge() {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  async function handleCopy() {
    try {
      await copySpeechSnippet();
      setCopyStatus("copied");

      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }

      resetTimer.current = setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }

      setCopyStatus("failed");
    }
  }

  const statusMessage =
    copyStatus === "copied"
      ? "Code copied to clipboard."
      : copyStatus === "failed"
        ? "Unable to copy. Select the code manually."
        : "";

  return (
    <section className="codeBridge" aria-labelledby="code-bridge-title">
      <div className="codeBridgeInner">
        <div className="codeBridgeCopy">
          <p className="codeBridgeEyebrow">Developer quickstart</p>
          <h2 id="code-bridge-title">Speech in a few lines.</h2>
          <p>
            Use the AI SDK directly, then explore the same workflow in the
            studio below.
          </p>
        </div>

        <div className="codeCard">
          <div className="codeCardHeader">
            <span>TypeScript</span>
            <button type="button" onClick={handleCopy}>
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre tabIndex={0} aria-label="CAMB speech generation example">
            <code>
              {SPEECH_SNIPPET_LINES.map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                  {line.map((token, tokenIndex) =>
                    token.kind ? (
                      <span
                        className={`codeToken--${token.kind}`}
                        key={tokenIndex}
                      >
                        {token.text}
                      </span>
                    ) : (
                      <Fragment key={tokenIndex}>{token.text}</Fragment>
                    ),
                  )}
                  {lineIndex < SPEECH_SNIPPET_LINES.length - 1 ? "\n" : null}
                </Fragment>
              ))}
            </code>
          </pre>
          <span className="srOnly" aria-live="polite">
            {statusMessage}
          </span>
        </div>
      </div>
    </section>
  );
}

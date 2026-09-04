# Theme

## Compact token summary

- Canvas: `--paper: #eee9dc`
- Text and borders: `--ink: #11100d`
- Primary highlight: `--acid: #d8ff3e`
- Secondary highlight: `--coral: #ff5f45`
- Soft border: `--line: rgba(17, 16, 13, 0.22)`
- Primary type: Avenir Next / Trebuchet MS / sans-serif
- Display type: Bodoni 72 / Didot / Georgia / serif
- Utility type: system monospace
- Current geometry: sharp controls and panels; 1px dark borders; 12px offset panel shadow
- Breakpoints: 820px and 520px
- Motion: 160ms control transitions, slow idle pulse/wave, disabled under reduced motion

## Raw source

### `examples/nextjs/app/globals.css`

```css
:root {
  --ink: #11100d;
  --paper: #eee9dc;
  --acid: #d8ff3e;
  --coral: #ff5f45;
  --line: rgba(17, 16, 13, 0.22);
}

* { box-sizing: border-box; }

html { background: var(--ink); }

body {
  margin: 0;
  color: var(--ink);
  background:
    linear-gradient(90deg, transparent 49.8%, rgba(17, 16, 13, 0.035) 50%, transparent 50.2%),
    var(--paper);
  font-family: "Avenir Next", "Trebuchet MS", sans-serif;
}

button, input, select, textarea { font: inherit; }

main {
  min-height: 100vh;
  overflow: hidden;
  padding: 28px clamp(20px, 5vw, 76px) 22px;
  position: relative;
}

.ambient {
  border-radius: 999px;
  filter: blur(2px);
  opacity: 0.9;
  pointer-events: none;
  position: absolute;
}

.ambientOne {
  background: var(--acid);
  height: 340px;
  right: -140px;
  top: 64px;
  width: 340px;
}

.ambientTwo {
  background: var(--coral);
  bottom: 80px;
  height: 110px;
  left: -55px;
  width: 110px;
}

.masthead, footer {
  align-items: center;
  display: flex;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  justify-content: space-between;
  letter-spacing: 0.08em;
  position: relative;
  z-index: 1;
}

.wordmark {
  color: inherit;
  font-family: "Bodoni 72", Didot, Georgia, serif;
  font-size: 1.2rem;
  font-weight: 900;
  text-decoration: none;
}

.wordmark span { color: var(--coral); }

.status { font-size: 0.66rem; }
.status i {
  animation: pulse 1.8s infinite;
  background: #4c7800;
  border-radius: 50%;
  display: inline-block;
  height: 7px;
  margin-right: 8px;
  width: 7px;
}

.hero {
  margin: clamp(70px, 10vh, 120px) 0 40px;
  max-width: 880px;
  position: relative;
  z-index: 2;
}

.eyebrow, .panelHeader, label > span, .outputLabel, footer {
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  font-family: "Bodoni 72", Didot, Georgia, serif;
  font-size: clamp(4.2rem, 11vw, 9.8rem);
  font-weight: 500;
  letter-spacing: -0.07em;
  line-height: 0.72;
  margin: 25px 0 32px;
}

h1 em { color: var(--coral); font-weight: 400; }
.hero > p { font-size: 1rem; line-height: 1.55; margin-left: 54%; max-width: 390px; }

.workbench {
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--ink);
  box-shadow: 12px 12px 0 var(--ink);
  display: grid;
  gap: 0;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  margin: 0 0 72px auto;
  max-width: 1080px;
  position: relative;
  z-index: 3;
}

.panelHeader {
  border-bottom: 1px solid var(--ink);
  display: flex;
  grid-column: 1 / -1;
  justify-content: space-between;
  padding: 12px 16px;
}

form { border-right: 1px solid var(--ink); padding: clamp(20px, 4vw, 42px); }
label { display: grid; gap: 9px; }

textarea, input, select {
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  color: inherit;
  outline: none;
  padding: 10px 0;
}

textarea:focus, input:focus, select:focus { border-color: var(--coral); }
textarea { font-family: "Bodoni 72", Didot, Georgia, serif; font-size: 1.8rem; min-height: 128px; resize: vertical; }

.controls {
  display: grid;
  gap: 22px;
  grid-template-columns: 1.7fr 0.8fr 0.8fr 0.7fr;
  margin-top: 32px;
}

.actionRow { align-items: center; display: flex; gap: 22px; margin-top: 34px; }
.actionRow p { color: rgba(17, 16, 13, 0.58); font-size: 0.75rem; }

button {
  align-items: center;
  background: var(--ink);
  border: 1px solid var(--ink);
  color: var(--paper);
  cursor: pointer;
  display: flex;
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 0.72rem;
  font-weight: 800;
  justify-content: space-between;
  letter-spacing: 0.1em;
  min-width: 220px;
  padding: 15px 17px;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

button:hover:not(:disabled) { background: var(--acid); color: var(--ink); transform: translate(-2px, -2px); }
button:disabled { cursor: wait; opacity: 0.62; }
button b { font-size: 1.2rem; }

.output { display: flex; flex-direction: column; min-height: 320px; padding: 20px; }
.output.ready { background: var(--acid); }
.outputLabel { display: flex; justify-content: space-between; }
.output audio { margin: auto 0; width: 100%; }
.error { color: #b02012; font-family: ui-monospace, monospace; line-height: 1.5; margin: auto 0; }

.wave { align-items: center; display: flex; gap: 4px; height: 120px; margin: auto; width: 100%; }
.wave i { animation: idleWave 2.8s ease-in-out infinite; background: var(--ink); flex: 1; height: 8%; opacity: 0.2; }
.wave i:nth-child(3n) { animation-delay: -0.8s; }
.wave i:nth-child(4n) { animation-delay: -1.6s; }
.wave i:nth-child(5n) { animation-delay: -2.2s; }

footer { border-top: 1px solid var(--ink); padding-top: 18px; }

@keyframes pulse { 50% { box-shadow: 0 0 0 5px rgba(76, 120, 0, 0.16); } }
@keyframes idleWave { 50% { height: 58%; opacity: 0.5; } }

@media (max-width: 820px) {
  .hero { margin-bottom: 36px; }
  .hero > p { margin-left: 0; }
  .workbench { grid-template-columns: 1fr; }
  form { border-bottom: 1px solid var(--ink); border-right: 0; }
  .controls { grid-template-columns: 1fr 1fr; }
  .output { min-height: 210px; }
}

@media (max-width: 520px) {
  .status { display: none; }
  h1 { font-size: 4rem; }
  .controls { grid-template-columns: 1fr; }
  .actionRow { align-items: stretch; flex-direction: column; }
  button { width: 100%; }
  footer { align-items: flex-start; flex-direction: column; gap: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
```


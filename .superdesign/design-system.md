# CAMB Voice Studio Design System

## Product and job

CAMB Voice Studio is a developer-facing Next.js demonstration of a CAMB AI SDK provider. Visitors first encounter a concise cinematic product statement, then use a complete working studio to generate direct speech or translated speech, choose real account voices and languages, and play the result.

## Page architecture

- Full-bleed editorial hero with a three-column navigation layered over a muted background video.
- Centered hero copy with one pill CTA that scrolls to the studio.
- A focused studio section containing the existing mode, text, language, voice, advanced settings, and action controls.
- A Result card directly below the form with translated text, audio, errors, and live generation progress.
- At mobile widths, navigation simplifies and all control grids stack without horizontal scrolling.

## Visual direction

- Minimalist Editorial with a cinematic, high-fashion restraint.
- The hero uses the public serene-art video supplied by the user, with a contrast overlay that protects legibility on every frame.
- Typography provides the drama: Instrument Serif for display and section moments; Inter for body copy and controls.
- Deep navy ink, white editorial surfaces, and black actions. Avoid green brand accents, bright gradients, decorative blobs, and heavy shadows.
- The functional studio remains calm and highly legible; cinematic styling must not obscure the product controls.

## Tokens

- Primary ink: `#0f172a`
- Muted ink: `hsl(215 25% 32%)`
- Black action: `#000000`
- White: `#ffffff`
- Page background: `#f4f3ef`
- Dark fallback: `hsl(201 100% 13%)`
- Hairline border: `rgba(15, 23, 42, 0.14)`
- Quiet surface: `rgba(255, 255, 255, 0.9)`
- Error: `#9f2d25`
- Focus ring: `rgba(15, 23, 42, 0.28)`
- Controls: 12px radius
- Cards: 22px radius
- Pills: 9999px radius
- Card shadow: `0 24px 80px rgba(15, 23, 42, 0.1)`
- Content width: 1280px hero/navigation; 920px studio
- Spacing rhythm: 4, 8, 12, 16, 24, 32, 48, 72, 96px

## Typography

- Display: `"Instrument Serif"`, Georgia, serif; weight 400.
- Body and UI: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif; body weight 400 and UI weight 500.
- Hero H1: 80px desktop, 48px mobile; line-height `0.95`; letter-spacing exactly `-2.46px`.
- Hero paragraph: 18px, line-height 1.625, max-width 670px.
- Brand: Instrument Serif at 30px with a small registered mark.
- Section title: Instrument Serif at 30–40px, weight 400.
- Labels and controls: Inter 13–15px, weight 500.
- Technical metadata: 11–12px monospace.

## Components

- Navigation: three-column grid, maximum width 1280px, 32px horizontal and 24px vertical padding; centered links use 40px gaps.
- Hero CTA: black and white pill, 20px by 56px padding, 16px medium text.
- Small pill button: black and white, 10px by 24px padding.
- Studio: white editorial card, thin navy hairline, generous internal spacing, restrained shadow.
- Mode control: pale neutral pill rail with black active item and white text.
- Fields: explicit labels, pale surface, thin border, 12px radius, 48px minimum height.
- Primary generation button: black pill with white text and a restrained arrow.
- Result card: white surface with a thin border; translated text remains selectable and the native audio player spans the available width.
- Progress: four segmented tracks for translated speech; completed segments are navy, the current segment uses a subtle traveling highlight, and future segments use a quiet hairline fill. Direct TTS uses one indeterminate track. Always pair motion with stage text and elapsed time.

## Motion and interaction

- Hero elements use `fade-rise`: opacity 0 and translateY(24px) to opacity 1 and translateY(0), 800ms ease-out.
- Hero paragraph delay: 200ms. Hero CTA delay: 400ms.
- Pill buttons scale to 1.03 on hover over 200–300ms.
- Form controls use short color, border, and shadow transitions only.
- Progress motion communicates activity but never pretends to be exact percentage completion.
- Under `prefers-reduced-motion: reduce`, disable entrance transforms, button scaling, video presentation, and progress shimmer.

## Interaction and accessibility

- Use semantic labels and native controls.
- Every interactive element has a visible `:focus-visible` ring.
- Video is decorative, muted, looping, plays inline, has no controls, and is hidden from assistive technology.
- Loading and errors use `aria-live="polite"` without large layout jumps.
- Indeterminate progress exposes descriptive `aria-valuetext`, never a fabricated `aria-valuenow`.
- Disable submission until catalogs and a usable voice are ready.
- Abort superseded requests, ignore stale results, and revoke generated object URLs.

## Responsive behavior

- Below 760px, hide centered navigation links while keeping brand and CTA.
- Hero type drops to 48px and horizontal gutters become 20px.
- Studio grids collapse to one column; action rows stack and buttons fill the row.
- Prevent long voice descriptions, translated text, and technical identifiers from causing horizontal overflow.

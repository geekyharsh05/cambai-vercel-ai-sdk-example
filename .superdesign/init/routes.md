# Routes

## Page routes

- `/` — `examples/nextjs/app/page.tsx`; uses `examples/nextjs/app/layout.tsx`; renders the complete CAMB Voice Bench client interface.

## API routes

- `POST /api/speech` — `examples/nextjs/app/api/speech/route.ts`; validates input and generates direct speech through the workspace provider.

## Router configuration

The app uses the Next.js App Router filesystem convention. There is no separate router config.


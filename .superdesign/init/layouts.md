# Shared Layouts

## RootLayout

- Path: `examples/nextjs/app/layout.tsx`
- Description: Next.js root document layout, metadata, global CSS import, and root hydration safeguard.

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "CAMB Voice Bench",
  description: "A compact AI SDK provider demo for CAMB.AI speech models.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```


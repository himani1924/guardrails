import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Guardrail',
  description:
    'Agentic marketing compliance and audience-risk review platform (MVP).',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}

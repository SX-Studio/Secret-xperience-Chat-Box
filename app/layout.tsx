import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Content Box',
  description: 'Temporary multi-creator content rental marketplace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

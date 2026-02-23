import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pricing Radar — Never Miss a Competitor Pricing Change',
  description: 'AI-powered daily monitoring that tracks competitor pricing updates, discounts, and plan changes. Get email alerts only when it matters.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/tablogo4.png" type="image/png" />
      </head>
      <body style={{ margin: 0, background: '#fff', minHeight: '100vh' }}>{children}</body>
    </html>
  );
}

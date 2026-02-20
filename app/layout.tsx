import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competitor Pricing Radar',
  description: 'Get instant alerts when competitors change their pricing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f9fafb', minHeight: '100vh' }}>{children}</body>
    </html>
  );
}

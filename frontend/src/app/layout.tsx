import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-Alpha - Real-time QQQ Quotes',
  description: 'Real-time QQQ equity quotes from Schwab API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}


import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/language-context';

export const metadata: Metadata = {
  title: 'KSA Customs Clearance & Regulatory Intelligence | ZATCA',
  description: 'Automated commercial invoice ingestion, 12-digit ZATCA tariff matching, and ZATCA import requirements platform for Saudi Arabia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-zatca-500 selection:text-white"
      >
          <AppProvider>
            {children}
          </AppProvider>
      </body>
    </html>
  );
}

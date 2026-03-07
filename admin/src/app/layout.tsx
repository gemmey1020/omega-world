import type { Metadata, Viewport } from 'next';
import SlaTickerRuntime from '@/components/orders/sla-ticker-runtime';
import './globals.css';

export const metadata: Metadata = {
  title: 'OMEGA Command Center',
  description: 'Administrative dashboard for OMEGA World operations management',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <SlaTickerRuntime />
        {children}
      </body>
    </html>
  );
}

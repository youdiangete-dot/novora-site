import type { Metadata } from 'next';
import SiteHeader from '../components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://novora.design'),
  title: {
    default: 'NOVORA | Custom Jewelry Concept Brief Studio',
    template: '%s | NOVORA',
  },
  description:
    'Start a guided custom jewelry Concept Brief with NOVORA, then move into studio review and separate paid CAD discussion later.',
  applicationName: 'NOVORA',
  openGraph: {
    siteName: 'NOVORA',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}

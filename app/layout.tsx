import type { Metadata } from 'next';
import SiteHeader from '../components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'NOVORA',
  description: 'Professional custom jewelry, made easier.',
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

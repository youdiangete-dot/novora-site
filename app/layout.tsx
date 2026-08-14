import type { Metadata } from 'next';
import SiteHeader from '../components/SiteHeader';
import { I18nProvider } from '../lib/i18n/client';
import {
  getOpenGraphAlternateLocales,
  OPEN_GRAPH_LOCALES,
} from '../lib/i18n/config';
import { getDictionary } from '../lib/i18n/dictionaries';
import { getRequestLocale } from '../lib/i18n/request';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getDictionary(locale).metadata.root;

  return {
    metadataBase: new URL('https://novora.design'),
    title: {
      default: copy.titleDefault,
      template: copy.titleTemplate,
    },
    description: copy.description,
    applicationName: copy.applicationName,
    openGraph: {
      siteName: 'NOVORA',
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: getOpenGraphAlternateLocales(locale),
      type: 'website',
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} dictionary={dictionary}>
          <SiteHeader />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

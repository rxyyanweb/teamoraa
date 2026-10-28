import { ThemeProvider } from '@/components/theme/theme-provider';
import { themeScript } from '@/lib/theme-script';
import type { Metadata } from 'next';
import { AuthProvider } from '@/features/auth/auth-provider';
import '@/styles/globals.css';
import { MotionProvider } from '@/components/workforce/primitives';
export const metadata: Metadata = {
  title: { default: 'Teamora · Your people, in sync', template: '%s · Teamora' },
  description: 'A connected workspace for your people. Teamora HCM Lite.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <MotionProvider>
            <AuthProvider>{children}</AuthProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

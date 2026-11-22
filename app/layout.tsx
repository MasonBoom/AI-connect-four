import type { Metadata, Viewport } from 'next';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Connect Four | Fourfold Arcade',
  description:
    'Drop a disc and challenge the original minimax AI on a three-dimensional Connect Four board.',
  icons: { icon: '/arcade.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#181420' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

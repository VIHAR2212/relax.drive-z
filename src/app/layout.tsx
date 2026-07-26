import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "relax.drive - A Peaceful Driving Experience",
  description: "Relaxing 3D browser-based open-world driving experience. No missions, no timers - just drive.",
  keywords: ["driving", "3D", "game", "relaxing", "open-world", "browser"],
  authors: [{ name: "relax.drive" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "relax.drive",
    description: "A peaceful 3D driving experience in your browser",
    type: "website",
  },
};

// Self-hosted font configuration using CSS @font-face with system fallbacks
// This avoids network dependency on Google Fonts
const fontStyles = `
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter-Regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter-Medium.woff2') format('woff2');
    font-weight: 500;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'JetBrains Mono';
    src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
      </head>
      <body className="antialiased bg-background text-foreground" 
            style={{ 
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

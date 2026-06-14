import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Themis-Verdict | Market Court",
  description: "A judicial-framework strategy skill powered by CoinMarketCap real-time data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Prevent browser auto-translation — this site manages its own i18n */}
          <meta name="google" content="notranslate" />
          <meta httpEquiv="Content-Language" content="en,zh" />
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

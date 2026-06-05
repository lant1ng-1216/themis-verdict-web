import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Themis-Verdict | Market Court",
  description: "A judicial-framework strategy skill powered by CoinMarketCap real-time data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

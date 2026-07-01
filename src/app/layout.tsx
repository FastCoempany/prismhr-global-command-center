import type { Metadata } from "next";
import { DM_Serif_Display, JetBrains_Mono, Public_Sans } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-donor-serif",
  weight: "400",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-donor-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-donor-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Command Center | PrismHR Global",
  description: "PEO channel command center for PrismHR Global.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${dmSerif.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
      lang="en"
    >
      <body>{children}</body>
    </html>
  );
}

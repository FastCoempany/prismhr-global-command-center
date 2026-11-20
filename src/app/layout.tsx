import type { Metadata } from "next";
import { dmSerif, jetbrainsMono, publicSans } from "./fonts";
import { Scratchpad } from "@/components/scratch/scratchpad";
import { PresenceTracker } from "@/components/presence/engine";
import "./globals.css";

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
      <body>
        {children}
        <Scratchpad />
        <PresenceTracker />
      </body>
    </html>
  );
}

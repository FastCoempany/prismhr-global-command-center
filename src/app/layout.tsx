import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Field Signal",
  description: "Prospecting and partner-motion command center for PrismHR Global.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

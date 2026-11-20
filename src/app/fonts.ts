// The app's three typefaces, kept in the repository (src/app/fonts/) since
// 2026-11-20. They used to come from next/font/google, which downloads them
// from Google Fonts at every build; twice that download came back in a form
// the build could not read and the deploy failed, so the files now ship with
// the code and no build reaches Google. The files are the Latin subsets from
// Fontsource, under the SIL Open Font License (the LICENSE files beside them).
// next/font/local wants each call at module scope with literal options, so
// the layout's variables and the HomeRoom's each get their own declaration.

import localFont from "next/font/local";

// The layout's names (src/app/layout.tsx).
export const dmSerif = localFont({
  src: "./fonts/dm-serif-display-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-donor-serif",
});

export const publicSans = localFont({
  src: "./fonts/public-sans-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-donor-sans",
});

export const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-donor-mono",
});

// The HomeRoom's names (src/app/room/page.tsx).
export const roomSerif = localFont({
  src: "./fonts/dm-serif-display-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--f-serif",
});

export const roomSans = localFont({
  src: "./fonts/public-sans-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--f-sans",
});

export const roomMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--f-mono",
});

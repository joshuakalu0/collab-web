import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const displayFace = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const monoFace = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  description: "A realtime collaborative writing workspace built for Project 3.",
  title: "Collab Workspace"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className={`${displayFace.variable} ${monoFace.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}

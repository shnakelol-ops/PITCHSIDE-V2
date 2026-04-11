import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: {
    default: "Pitchside",
    template: "%s · Pitchside",
  },
  description:
    "Pitchside brings board tactics, live stats, and review together for coaching teams.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

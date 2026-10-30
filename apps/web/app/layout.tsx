import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamFlow",
  description: "A clear home for your team, workspaces, and shared work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

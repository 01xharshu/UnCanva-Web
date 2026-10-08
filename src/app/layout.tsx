import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "UnCanva — Your canvas. Your device.",
  description:
    "A private, local-first image studio. Create, refine and export entirely on your device.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

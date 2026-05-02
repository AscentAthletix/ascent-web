import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascent Athletix",
  description: "Track the work. Prove the development.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

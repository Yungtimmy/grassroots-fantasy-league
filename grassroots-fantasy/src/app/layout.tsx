import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { AppChrome } from "@/components/layout/app-chrome";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Grassroots Fantasy League",
  description:
    "Build your dream fantasy football team from your university. Represent your school, compete with players nationwide, and win prizes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-surface-950 font-body text-surface-100 antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

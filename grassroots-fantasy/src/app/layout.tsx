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
  openGraph: {
    title: "Grassroots Fantasy League",
    description: "Represent your university. Compete nationally.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Grassroots Fantasy League",
    description: "Represent your university. Compete nationally.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-body antialiased bg-black text-white">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "./auth-provider";
import { Navbar } from "./navbar";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  return (
    <AuthProvider>
      {hideChrome ? (
        children
      ) : (
        <>
          <Navbar />
          {children}
          <MobileNav />
          <Footer />
        </>
      )}
    </AuthProvider>
  );
}

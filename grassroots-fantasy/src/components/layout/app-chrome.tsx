"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { AuthProvider } from "./auth-provider";
import { Navbar } from "./navbar";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { ParticleAssemblyLoader } from "@/components/ui/particle-assembly-loader";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith("/teblad") || pathname?.startsWith("/auth") || false;

  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("gfl-intro-seen");
    if (!seen) setShowLoader(true);
  }, []);

  const handleLoaderComplete = useCallback(() => {
    sessionStorage.setItem("gfl-intro-seen", "1");
    setShowLoader(false);
  }, []);

  return (
    <AuthProvider>
      {showLoader && <ParticleAssemblyLoader onComplete={handleLoaderComplete} />}
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

"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { AuthProvider } from "./auth-provider";
import { Navbar } from "./navbar";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { ParticleAssemblyLoader } from "@/components/ui/particle-assembly-loader";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [showLoader, setShowLoader] = useState(false);

  // Keep App Router children mounted on every render. Replacing {children}
  // with a placeholder (the old !mounted gate) unmounts OuterLayoutRouter
  // and throws: "invariant expected layout router to be mounted".
  const hideChrome =
    pathname.startsWith("/teblad") || pathname.startsWith("/auth");

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
      {!hideChrome && <Navbar />}
      {children}
      {!hideChrome && <MobileNav />}
      {!hideChrome && <Footer />}
    </AuthProvider>
  );
}

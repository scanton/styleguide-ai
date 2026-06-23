"use client";
import { usePathname } from "@/i18n/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDark = pathname === "/rising";

  return (
    <>
      <Header />
      <main
        id="main-content"
        className={`flex-1 transition-colors duration-700 ${isDark ? "bg-stone-950" : ""}`}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}

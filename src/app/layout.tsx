import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "IP Production Command Center",
  description: "Cohort Leader → Client → IP CS → IP → Designer → Editor → Output",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <MobileNav />
            <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-8 md:py-7">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Kairos · Multi-Tenant OKR Platform",
  description:
    "Postgres RLS tenant isolation, idempotent APIs, SSE-driven live dashboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <div className="flex min-h-screen relative z-[1]">
            <Nav />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 overflow-auto">
                <div className="mx-auto max-w-7xl px-8 py-8 fade-up">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "./_components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brightwater Ops",
  description: "Order operations for Brightwater Supply Co.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="wordmark">
              <span className="wordmark-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    d="M3 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2M3 18.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 3 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="6.5" r="3" fill="currentColor" />
                </svg>
              </span>
              <span className="wordmark-text">Brightwater Ops</span>
            </Link>
            <NavLinks />
            <div className="sidebar-footer">Brightwater Supply Co.</div>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}

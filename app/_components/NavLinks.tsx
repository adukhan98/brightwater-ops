"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/import", label: "Import" },
  { href: "/inventory", label: "Inventory" },
  { href: "/reports", label: "Reports" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Main">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

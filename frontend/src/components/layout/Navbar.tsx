"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, NAV_LINKS } from "@/lib/constants";
import { useUser } from "@/hooks/useUser";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface backdrop-blur-sm" style={{ backgroundColor: "#fafaf7" }}>
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-xl font-bold text-primary"
        >
          {APP_NAME}
        </Link>

        {/* Nav links */}
        <ul className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => {
            // Hide authenticated-only links when not logged in
            const authOnly = ["/plan", "/dashboard", "/profile"];
            if (authOnly.includes(href) && !user) return null;
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User pill / CTA */}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {user.name}
              {user.isGuest && " (Guest)"}
            </span>
            <button
              onClick={logout}
              className="text-xs text-faint-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/screening"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Get Started
          </Link>
        )}
      </nav>
    </header>
  );
}

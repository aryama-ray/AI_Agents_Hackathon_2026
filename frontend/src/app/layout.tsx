import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/hooks/useUser";
import Navbar from "@/components/layout/Navbar";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={[
        playfair.variable,
        ibmPlexSans.variable,
        ibmPlexMono.variable,
      ].join(" ")}
      style={{ colorScheme: "light" }}
    >
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <UserProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="border-t border-border py-4 text-center text-xs text-faint-foreground">
            © {new Date().getFullYear()} Attune. All rights reserved.
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bebas_Neue, Playfair_Display, Space_Grotesk } from "next/font/google";

import { AppProviders } from "@/components/layout/AppProviders";
import AppwritePing from "@/components/layout/AppwritePing";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const headingFont = Bebas_Neue({
  weight: "400",
  variable: "--font-heading",
  subsets: ["latin"],
});

const luxuryFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-luxury",
  style: ["normal", "italic"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASHER STORE | Premium Football Jersey Store",
  description:
    "ASHER STORE brings modern football jersey shopping with AI recommendations, smart sizing, and premium UX.",
  manifest: "/pictures/site.webmanifest",
  icons: {
    icon: [
      { url: "/pictures/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/pictures/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/pictures/favicon.ico" },
    ],
    shortcut: "/pictures/favicon.ico",
    apple: "/pictures/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get("asherstore-session")?.value);

  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} ${luxuryFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100" suppressHydrationWarning>
        <ClerkProvider>
          <AppProviders hasSessionCookie={hasSessionCookie}>
            <AppwritePing />
            <Navbar />
            <main className="flex min-h-[calc(100vh-73px)] flex-col">{children}</main>
            <Footer />
          </AppProviders>
        </ClerkProvider>
      </body>
    </html>
  );
}

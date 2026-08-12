import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/providers/AuthContext";
import { BrandingProvider } from "@/components/providers/BrandingContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CoderNest — Enterprise Security System",
  description:
    "AI-powered 24/7 security monitoring with face recognition, real-time Telegram alerts, and a live camera dashboard.",
  keywords: ["face recognition", "security camera", "AI surveillance", "InsightFace", "ERP"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </BrandingProvider>

          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}

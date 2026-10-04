import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Point — Show AI What You Mean",
  description:
    "Annotate screenshots, sketch ideas, connect visual states, and give AI precise visual context.",
  keywords: [
    "annotate screenshot",
    "annotate image",
    "annotate screenshot for AI",
    "visual AI prompting",
    "explain screenshot to AI",
    "mark up image",
    "screenshot annotation tool",
  ],
  openGraph: {
    title: "Point — Show AI What You Mean",
    description:
      "Annotate screenshots, sketch ideas, connect visual states, and give AI precise visual context.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#141414",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider delay={200}>{children}</TooltipProvider>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomToolsBar from "@/components/BottomToolsBar";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aryan Singh — Digital Garden",
  description:
    "A collection of code, thoughts, and side projects. Exploring the intersection of design and scalable systems.",
  icons: {
    icon: "./favicon.png",
    apple: "./favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tools = [
    { id: "home", label: "Home", href: "/" },
    { id: "blogs", label: "Blogs", href: "/blogs" },
    {
      id: "portfolio",
      label: "Portfolio",
      href: "https://portfolio.aryan-singh.online",
    },
    { id: "contact", label: "Contact", href: "/contact" },
  ];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <BottomToolsBar tools={tools} />

        <Script id="mathjax-config" strategy="beforeInteractive">
          {`MathJax = { tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']] } };`}
        </Script>
        <Script
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomToolsBar from "@/components/BottomToolsBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Aryan Singh — Digital Garden",
  description:
    "A collection of code, thoughts, and side projects. Exploring the intersection of design and scalable systems.",
  icons: {
    icon: "./favicon.png", // Path to image in your /public folder
    // Optional: You can also specify apple touch icons
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
    // {
    //   id: "portfolio",
    //   label: "Portfolio",
    //   href: "https://portfolio.aryan-singh.online",
    // },
    { id: "contact", label: "Contact", href: "/contact" },
  ];

  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* persistent bottom tools bar across all pages */}
        <BottomToolsBar tools={tools} />
      </body>
    </html>
  );
}

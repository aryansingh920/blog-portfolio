import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Aryan Singh",
  description: "Portfolio and Blog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tools = [
    { id: "home", label: "Home", href: "/" },
    { id: "blogs", label: "Blogs", href: "/blogs" },
    // { id: "projects", label: "Projects", href: "/projects" },
    { id: "contact", label: "Contact", href: "/contact" },
  ];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* persistent bottom tools bar across all pages */}
        <BottomToolsBar tools={tools} />
      </body>
    </html>
  );
}

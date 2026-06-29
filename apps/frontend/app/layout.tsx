import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Providers from "@/components/Providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sparq - Reorder Now",
  description:
    "Revenue driven conversation automation engine for repeat purchases.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

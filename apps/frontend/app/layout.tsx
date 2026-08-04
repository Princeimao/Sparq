import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Providers from "@/components/Providers";
import Footer from "@/components/footer";
import Header from "@/components/header";
import { navigationData } from "@/constant";

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
          <div className="relative min-h-screen bg-black">
            <div className="relative z-16 bg-background rounded-b-[32px] md:rounded-b-[48px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] pb-12">
              <Header navigationData={navigationData} />
              {children}
            </div>

            <div className="md:sticky md:bottom-0 md:z-10 w-full">
              <Footer />
            </div>
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

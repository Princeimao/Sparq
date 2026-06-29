"use client";

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { footerLinks } from "@/constant";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black text-white w-full border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 md:py-24 py-8">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-12">
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <div className="col-span-12 md:col-span-3">
                <p className="w-full text-zinc-400">
                  Stay updated with the latest news, promotions, and exclusive
                  offers.
                </p>
              </div>
              <div className="md:col-span-1" />
              <div className="col-span-12 md:col-span-8">
                <div className="flex flex-col lg:flex-row gap-5 lg:gap-10">
                  <form className="flex gap-2 flex-1">
                    <Input
                      required
                      type="email"
                      name="email"
                      placeholder="enter your email"
                      className="rounded-full h-full py-2 text-white border-zinc-800 bg-zinc-900/50 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
                    />
                    <Button
                      type="submit"
                      className="h-auto py-2 px-6 rounded-full cursor-pointer font-medium bg-white text-black hover:bg-zinc-200"
                    >
                      Subscribe
                    </Button>
                  </form>
                  <p className="text-sm flex-1 text-zinc-400">
                    By subscribing, you agree to receive our promotional emails.
                    You can unsubscribe at any time.
                  </p>
                </div>
              </div>
            </div>
            <Separator className="bg-zinc-800" />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-7 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <h2 className="sm:text-5xl text-3xl font-medium mb-6 text-white">
                Ready to start your journey with us?
              </h2>
              <Button className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 bg-white text-black hover:bg-zinc-200 group transition-all duration-500 hover:ps-14 hover:pe-6 w-fit overflow-hidden cursor-pointer">
                <span className="relative z-10 transition-all duration-500">
                  Contact Us
                </span>
                <span className="absolute right-1 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                  <ArrowUpRight size={16} />
                </span>
              </Button>
            </div>
            <div className="md:col-span-1" />
            <div className="col-span-12 md:col-span-2 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <div className="flex flex-col gap-4">
                {footerLinks.slice(0, 4).map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-base text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-2 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 ease-in-out fill-mode-both">
              <div className="flex flex-col gap-4">
                {footerLinks.slice(4, 8).map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-base text-zinc-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-12">
            <Separator className="bg-zinc-800" />
            <p className="text-sm text-zinc-500 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 ease-in-out fill-mode-both">
              ©2026 Sparq. All Rights Reserved
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

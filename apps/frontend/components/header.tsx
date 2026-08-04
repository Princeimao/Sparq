"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";
import {
  headerFeatures,
  headerIntegrations,
  headerResources,
  NavigationSection,
} from "@/constant";

type HeaderProps = {
  navigationData?: NavigationSection[];
  className?: string;
};

const CollaborateButton = ({
  className,
  onClick,
  isAuthenticated,
}: {
  className?: string;
  onClick: () => void;
  isAuthenticated: boolean;
}) => (
  <Button
    onClick={onClick}
    className={cn(
      "relative text-sm font-medium rounded-full h-10 p-1 ps-4 pe-12 group transition-all duration-500 hover:ps-12 hover:pe-4 w-fit overflow-hidden cursor-pointer",
      className,
    )}
  >
    <span className="relative z-10 transition-all duration-500">
      {isAuthenticated ? "Dashboard" : "Get Started"}
    </span>
    <span className="absolute right-1 w-8 h-8 bg-background text-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-36px)] group-hover:rotate-45">
      <ArrowUpRight size={16} />
    </span>
  </Button>
);

const Header = ({ className }: HeaderProps) => {
  const [sticky, setSticky] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const handleScroll = useCallback(() => {
    setSticky(window.scrollY >= 50);
  }, []);

  const handleResize = useCallback(() => {
    if (window.innerWidth >= 768) setIsOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [handleScroll, handleResize]);

  const handleAuthAction = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";
      window.location.href = `${backendUrl}/auth/google`;
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className={cn(
        "inset-x-0 z-50 px-4 flex items-center justify-center sticky top-0 h-20",
        className,
      )}
    >
      <div
        className={cn(
          "w-full max-w-6xl flex items-center h-fit justify-between gap-3.5 lg:gap-6 transition-all duration-500",
          sticky
            ? "p-2.5 bg-background/85 backdrop-blur-xl border border-border/60 shadow-2xl shadow-primary/5 rounded-full"
            : "bg-transparent border-transparent",
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.svg"
            alt="Sparq Logo"
            width={38}
            height={38}
            priority
          />
          <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
            Sparq<span className="text-sky-500">.</span>
          </span>
        </Link>

        {/* Desktop Navigation with Hover Dropdowns */}
        <div className="hidden lg:block">
          <NavigationMenu className="bg-muted/80 backdrop-blur-md p-1 rounded-full border border-border/40">
            <NavigationMenuList className="flex items-center gap-1">
              {/* Features Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="px-4 py-2 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground bg-transparent hover:bg-background/80 transition-all cursor-pointer">
                  Features
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-4 w-125 grid grid-cols-2 gap-3 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl">
                  {headerFeatures.map((feat) => (
                    <Link
                      key={feat.title}
                      href={feat.href}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/80 transition-colors group/item"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-colors mt-0.5">
                        <feat.icon className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          {feat.title}
                          <ChevronRight className="size-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {feat.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Integrations Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="px-4 py-2 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground bg-transparent hover:bg-background/80 transition-all cursor-pointer">
                  Integrations
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-4 w-120 grid grid-cols-2 gap-3 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl">
                  {headerIntegrations.map((integ) => (
                    <Link
                      key={integ.title}
                      href={integ.href}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/80 transition-colors group/item"
                    >
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 group-hover/item:bg-sky-500 group-hover/item:text-white transition-colors mt-0.5">
                        <integ.icon className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1">
                          {integ.title}
                          <ChevronRight className="size-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {integ.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources / Company Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="px-4 py-2 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground bg-transparent hover:bg-background/80 transition-all cursor-pointer">
                  Company
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-4 w-120 grid grid-cols-2 gap-3 bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl">
                  {headerResources.map((res) => (
                    <Link
                      key={res.title}
                      href={res.href}
                      className="flex flex-col p-2.5 rounded-xl hover:bg-accent/80 transition-colors"
                    >
                      <span className="text-sm font-semibold">{res.title}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {res.description}
                      </span>
                    </Link>
                  ))}
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Direct Link: Pricing */}
              <NavigationMenuItem>
                <Link
                  href="/pricing"
                  className="px-4 py-2 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all inline-block"
                >
                  Pricing
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Desktop CTA */}
        <div className="flex gap-4">
          <CollaborateButton
            onClick={handleAuthAction}
            isAuthenticated={isAuthenticated}
            className="hidden lg:flex"
          />

          {/* Mobile Navigation Drawer */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger id="mobile-menu-trigger">
                <span className="rounded-full border border-border p-2 block bg-background/50">
                  <Menu width={20} height={20} />
                  <span className="sr-only">Menu</span>
                </span>
              </SheetTrigger>

              <SheetContent
                showCloseButton={false}
                side="right"
                className="w-full sm:w-96 p-0 border-l-0"
              >
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="Logo" width={36} height={36} />
                    <span className="font-bold text-lg">Sparq</span>
                  </Link>
                  <SheetClose id="mobile-menu-close">
                    <span className="rounded-full border border-border p-2.5 block">
                      <X width={16} height={16} />
                    </span>
                  </SheetClose>
                </div>

                <div className="flex flex-col gap-6 p-6 overflow-y-auto">
                  <SheetTitle className="sr-only">Menu</SheetTitle>

                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Features
                    </p>
                    <div className="grid gap-2">
                      {headerFeatures.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent text-sm font-medium"
                        >
                          <item.icon className="size-4 text-primary" />
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Company
                    </p>
                    <div className="grid gap-2">
                      {headerResources.map((item) => (
                        <Link
                          key={item.title}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="p-2 rounded-lg hover:bg-accent text-sm font-medium"
                        >
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <CollaborateButton
                      onClick={() => {
                        setIsOpen(false);
                        handleAuthAction();
                      }}
                      isAuthenticated={isAuthenticated}
                      className="w-full justify-center"
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;

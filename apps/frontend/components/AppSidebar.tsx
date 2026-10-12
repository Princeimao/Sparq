"use client";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { SiteHeader } from "./SiteHeader";
import { NavMain } from "./NavMain";
import Image from "next/image";
import { navData } from "@/constant";

const AppSidebar = ({ children }: { children: React.ReactNode }) => {

  return (
    <SidebarProvider>
      <Sidebar className="py-4 px-0 bg-paper border-r border-zinc-200/70">
        <SidebarHeader className="py-0 px-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <a href="/" className="w-full h-full flex items-center">
                <p className="text-xl font-semibold tracking-tight text-ink">Sparq</p>
                <Image src="/logo.svg" alt="Logo" width={20} height={20} />
                <span className="size-1.5 rounded-full bg-brand ml-0.5 mt-2" aria-hidden />
              </a>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden gap-0 px-0 mt-5">
          <SimpleBar autoHide={true} className="h-full border-b border-border">
            <div className="px-4">
              <NavMain items={navData} />
            </div>
          </SimpleBar>
        </SidebarContent>
      </Sidebar>

      <div className="flex flex-1 flex-col bg-paper min-h-screen">
        <header className="sticky top-0 z-50 flex items-center border-b border-zinc-200/70 px-6 py-3 bg-paper/85 backdrop-blur-xl">
          <SiteHeader />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
};

export default AppSidebar;

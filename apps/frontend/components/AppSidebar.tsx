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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/store";

const AppSidebar = ({
  children,
  orgId,
}: {
  children: React.ReactNode;
  orgId: string;
}) => {
  const router = useRouter();
  const { organizations } = useAppSelector((state) => state.auth);

  return (
    <SidebarProvider>
      <Sidebar className="py-4 px-0 bg-background">
        <SidebarHeader className="py-0 px-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <a href="/" className="w-full h-full flex">
                <p className="text-xl font-semibold">Spar</p>
                <Image src="/logo.svg" alt="Logo" width={20} height={20} />
              </a>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden gap-0 px-0 mt-5">
          <SimpleBar autoHide={true} className="h-full border-b border-border">
            <div className="px-4">
              {/* SELECT ORGINIZATION */}
              <Select
                value={orgId}
                onValueChange={(value) => router.push(`/${value}/dashboard`)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Organization</SelectLabel>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <NavMain items={navData} orgId={orgId} />
            </div>
          </SimpleBar>
        </SidebarContent>
      </Sidebar>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-50 flex items-center border-b px-6 py-3 bg-background">
          <SiteHeader />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
};

export default AppSidebar;

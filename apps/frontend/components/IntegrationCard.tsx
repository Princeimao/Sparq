"use client";

import { MoreHorizontal, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

type IntegrationCardProps = {
  name: string;
  description: string;
  icon: string;
  connected?: boolean;
  onManage?: () => void;
};

export function IntegrationCard({
  name,
  description,
  icon,
  connected = false,
  onManage,
}: IntegrationCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="h-14 w-14 rounded-xl bg-zinc-500/10 flex items-center justify-center">
            <Image
              src={`${icon}`}
              alt={name}
              width={34}
              height={34}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-white font-medium text-lg">{name}</h3>

          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-green-400" : "bg-gray-500"
              }`}
            />

            <span className="text-sm text-muted-foreground">
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>

          <button
            onClick={onManage}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc/10 cursor-pointer bg-zinc-600/20 hover:bg-zinc-500/10 text-sm"
          >
            <Settings2 size={15} />
            Manage
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

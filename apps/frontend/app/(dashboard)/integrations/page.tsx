"use client";

import { IntegrationCard } from "@/components/IntegrationCard";
import { integrations } from "@/constant";
import { useIntegrationHandlers } from "@/hooks/integration";

const Page = () => {
  const handlers = useIntegrationHandlers();
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your store with other platforms to streamline your workflow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.name}
            onManage={
              handlers[integration.name.toLowerCase() as keyof typeof handlers]
            }
            {...integration}
          />
        ))}
      </div>
    </div>
  );
};

export default Page;

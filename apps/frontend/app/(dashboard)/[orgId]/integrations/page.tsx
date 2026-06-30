"use client";

import { IntegrationCard } from "@/components/IntegrationCard";
import { integrations } from "@/constant";
import { useIntegrationHandlers } from "@/hooks/integration";

const page = () => {
  const handlers = useIntegrationHandlers();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
  );
};

export default page;

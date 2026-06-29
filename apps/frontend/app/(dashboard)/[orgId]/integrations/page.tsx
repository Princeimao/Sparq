import { IntegrationCard } from "@/components/IntegrationCard";
import { integrations } from "@/constant";

const page = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {integrations.map((integration) => (
        <IntegrationCard key={integration.name} {...integration} />
      ))}
    </div>
  );
};

export default page;

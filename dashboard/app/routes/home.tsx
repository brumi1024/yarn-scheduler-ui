import type { Route } from "./+types/home";
import { QueueVisualizationContainer } from "../components/tree/QueueVisualizationContainer";
import { PropertyPanel } from "../components/property-panel/PropertyPanel";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "YARN Scheduler UI" },
    { name: "description", content: "YARN Capacity Scheduler" },
  ];
}

export default function Home() {
  return (
    <>
      <div className="flex h-full flex-col">
        <div className="border-b bg-card px-6 py-4">
          <h2 className="text-2xl font-semibold">Queue Hierarchy</h2>
          <p className="text-sm text-muted-foreground">
            Visualize and manage your YARN Capacity Scheduler queues
          </p>
        </div>
        
        <div className="flex-1 flex">
          <div className="flex-1 p-6">
            <QueueVisualizationContainer />
          </div>
        </div>
      </div>
      <PropertyPanel />
    </>
  );
}




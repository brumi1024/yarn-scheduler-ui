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
      <QueueVisualizationContainer />
      <PropertyPanel />
    </>
  );
}
import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card px-6 py-4">
        <h2 className="text-2xl font-semibold">Queue Hierarchy</h2>
        <p className="text-sm text-muted-foreground">
          Visualize and manage your YARN capacity scheduler queues
        </p>
      </div>
      
      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              Queue visualization will be implemented here
            </p>
            <p className="text-sm text-muted-foreground">
              React Flow v12 with Sankey edges
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


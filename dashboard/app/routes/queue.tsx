import { useParams } from "react-router";

export default function QueueDetails() {
  const { queuePath } = useParams();
  
  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex-1">
        <div className="border-b bg-card px-6 py-4">
          <h2 className="text-2xl font-semibold">Queue: {queuePath}</h2>
          <p className="text-sm text-muted-foreground">
            View and edit queue properties
          </p>
        </div>
        
        <div className="p-6">
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">
              Queue details and property editor will be shown here
            </p>
          </div>
        </div>
      </div>

      {/* Property Panel will be shown as a sheet on the right */}
    </div>
  );
}